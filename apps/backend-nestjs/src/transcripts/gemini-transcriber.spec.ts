import { ConfigService } from '@nestjs/config';
import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { PermanentJobError, RetryableJobError } from '../jobs/job-errors';
import { planChunks } from './audio-chunking';
import {
  GEMINI_MAX_REQUEST_SECONDS,
  GeminiTranscriber,
  geminiMimeType,
  parseOffset,
  segmentsFromWords,
  type WordInfo,
} from './gemini-transcriber';
import {
  TranscriptionProviderService,
  speakerNames,
} from './transcription-provider.service';

const audioPath = join(
  mkdtempSync(join(tmpdir(), 'merline-gemini-')),
  'a.webm',
);
writeFileSync(audioPath, Buffer.from('not really audio'));

const CONFIG = {
  apiKey: 'gk-test',
  model: 'gemini-3.5-transcribe',
  baseUrl: 'https://gemini.test',
  languageCodes: { en: 'en-GB', ha: 'ha-NG' },
};

const w = (text: string, start: number, end: number, speaker = 'spk_0') => ({
  type: 'word_info',
  text,
  speaker,
  start_offset: `${start}s`,
  end_offset: `${end}s`,
});

const INTERACTION = {
  id: 'interactions/1',
  status: 'completed',
  output_text: 'Sannu. Ina kwana? Lafiya lau.',
  steps: [
    {
      type: 'model_output',
      content: [
        {
          type: 'text',
          text: 'Sannu. Ina kwana? Lafiya lau.',
          annotations: [
            w('Sannu.', 0.1, 0.6),
            w('Ina', 0.8, 1.0),
            w('kwana?', 1.0, 1.5),
            w('Lafiya', 2.0, 2.4, 'spk_1'),
            w('lau.', 2.4, 2.8, 'spk_1'),
          ],
        },
      ],
    },
  ],
};

/** Replies in order: upload start, upload finalize, interaction, delete. */
function mockGemini(
  interaction: Response | (() => Response) = () => json(INTERACTION),
) {
  const calls: { url: string; init: RequestInit }[] = [];
  const respond = (u: string): Response => {
    if (u.endsWith('/upload/v1beta/files'))
      return new Response('{}', {
        status: 200,
        headers: {
          'x-goog-upload-url': 'https://gemini.test/upload-session/abc',
        },
      });
    if (u.includes('/upload-session/'))
      return json({
        file: {
          name: 'files/abc',
          uri: 'https://gemini.test/v1beta/files/abc',
          state: 'ACTIVE',
        },
      });
    if (u.endsWith('/v1beta/interactions'))
      return typeof interaction === 'function' ? interaction() : interaction;
    if (u.endsWith('/v1beta/files/abc'))
      return new Response('{}', { status: 200 });
    throw new Error(`unexpected ${u}`);
  };
  const spy = jest.spyOn(global, 'fetch').mockImplementation((url, init) => {
    const u =
      typeof url === 'string' ? url : url instanceof URL ? url.href : url.url;
    calls.push({ url: u, init: init ?? {} });
    return Promise.resolve(respond(u));
  });
  return { spy, calls };
}

interface InteractionBody {
  model: string;
  input: unknown[];
  generation_config: {
    transcription_config: { language_codes?: string[]; mode: unknown };
  };
}

/** The JSON body a mocked interaction request was sent with. */
function requestJson(init: RequestInit): InteractionBody {
  return JSON.parse(init.body as string) as InteractionBody;
}

function json(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
) {
  return new Response(JSON.stringify(body), { status, headers });
}

afterEach(() => jest.restoreAllMocks());

describe('GeminiTranscriber', () => {
  it('uploads, asks for a verbatim transcript with word timestamps and speakers, then deletes the upload', async () => {
    const { calls } = mockGemini();
    const t = new GeminiTranscriber(CONFIG);
    const result = await t.transcribe(audioPath, {
      filename: 'a.webm',
      mimeType: 'audio/webm;codecs=opus',
      language: 'ha',
    });

    expect(calls.map((c) => `${c.init.method} ${c.url}`)).toEqual([
      'POST https://gemini.test/upload/v1beta/files',
      'POST https://gemini.test/upload-session/abc',
      'POST https://gemini.test/v1beta/interactions',
      'DELETE https://gemini.test/v1beta/files/abc',
    ]);
    const start = calls[0].init.headers as Record<string, string>;
    expect(start['x-goog-api-key']).toBe('gk-test');
    expect(start['X-Goog-Upload-Protocol']).toBe('resumable');
    expect(start['X-Goog-Upload-Header-Content-Type']).toBe('audio/webm');
    expect(start['X-Goog-Upload-Header-Content-Length']).toBe('16');
    // The upload address is pre-authorised: no key on it.
    expect(
      (calls[1].init.headers as Record<string, string>)['x-goog-api-key'],
    ).toBeUndefined();

    const body = requestJson(calls[2].init);
    expect(body).toEqual({
      model: 'gemini-3.5-transcribe',
      input: [
        {
          type: 'audio',
          uri: 'https://gemini.test/v1beta/files/abc',
          mime_type: 'audio/webm',
        },
      ],
      generation_config: {
        transcription_config: {
          language_codes: ['ha-NG'],
          mode: {
            type: 'verbatim',
            diarization_mode: 'speaker',
            timestamp_granularities: ['word'],
          },
        },
      },
    });
    expect(result.words).toHaveLength(5);
    expect(result.words[3]).toEqual({
      text: 'Lafiya',
      startMs: 2000,
      endMs: 2400,
      speaker: 'spk_1',
    });
  });

  it('lets the model detect the language when none is set', async () => {
    const { calls } = mockGemini();
    await new GeminiTranscriber(CONFIG).transcribe(audioPath, {
      filename: 'a.ogg',
      mimeType: 'audio/ogg',
    });
    const body = requestJson(calls[2].init);
    expect(
      body.generation_config.transcription_config.language_codes,
    ).toBeUndefined();
  });

  it('classifies failures for the job runner and still deletes the upload', async () => {
    const cases: [Response, unknown][] = [
      [
        json({ error: { message: 'slow down' } }, 429, { 'retry-after': '7' }),
        RetryableJobError,
      ],
      [json({ error: { message: 'boom' } }, 503), RetryableJobError],
      [json({ error: { message: 'bad key' } }, 403), PermanentJobError],
      [
        json({ error: { message: 'Audio is too long' } }, 400),
        PermanentJobError,
      ],
      [json({ status: 'failed' }), RetryableJobError],
    ];
    for (const [response, kind] of cases) {
      const { calls } = mockGemini(response);
      const err = await new GeminiTranscriber(CONFIG)
        .transcribe(audioPath, { filename: 'a.webm', mimeType: 'audio/webm' })
        .catch((e: unknown) => e);
      expect(err).toBeInstanceOf(kind);
      expect(calls.at(-1)?.init.method).toBe('DELETE');
      jest.restoreAllMocks();
    }
    const { spy } = mockGemini(
      json({ error: { message: 'slow down' } }, 429, { 'retry-after': '7' }),
    );
    const err = await new GeminiTranscriber(CONFIG)
      .transcribe(audioPath, { filename: 'a.webm', mimeType: 'audio/webm' })
      .catch((e: unknown) => e);
    expect((err as RetryableJobError).retryAfterMs).toBe(7000);
    spy.mockRestore();
  });

  it('refuses to run without a key, before sending anything', async () => {
    const spy = jest.spyOn(global, 'fetch');
    await expect(
      new GeminiTranscriber({ ...CONFIG, apiKey: '' }).transcribe(audioPath, {
        filename: 'a.webm',
        mimeType: 'audio/webm',
      }),
    ).rejects.toThrow(/GEMINI_API_KEY/);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('segmentsFromWords', () => {
  const word = (
    text: string,
    startMs: number,
    endMs: number,
    speaker: string | null = 'a',
  ): WordInfo => ({ text, startMs, endMs, speaker });

  it('breaks at speaker changes, pauses and sentence ends', () => {
    const segs = segmentsFromWords([
      word('Tell', 0, 200),
      word('me', 250, 400),
      word('about', 450, 600),
      word('water.', 650, 900),
      word('We', 1000, 1100, 'b'),
      word('use', 1150, 1300, 'b'),
      word('the', 1350, 1400, 'b'),
      word('borehole', 1450, 1900, 'b'),
      word('mostly', 4000, 4400, 'b'),
    ]);
    expect(segs.map((s) => [s.text, s.speaker, s.startMs, s.endMs])).toEqual([
      ['Tell me about water.', 'a', 0, 900],
      ['We use the borehole', 'b', 1000, 1900],
      ['mostly', 'b', 4000, 4400],
    ]);
  });

  it('keeps punctuation attached and caps long runs', () => {
    const many = Array.from({ length: 130 }, (_, i) =>
      word(i % 10 === 9 ? 'x,' : 'x', i * 300, i * 300 + 250),
    );
    const segs = segmentsFromWords(many);
    expect(segs.every((s) => s.endMs - s.startMs <= 30_000)).toBe(true);
    expect(segs.every((s) => s.text.split(' ').length <= 60)).toBe(true);
    expect(segs[0].text).toContain('x, x');
    expect(segmentsFromWords([])).toEqual([]);
  });
});

describe('helpers', () => {
  it('parses offsets and maps audio types', () => {
    expect(parseOffset('1.250s')).toBe(1250);
    expect(parseOffset('0s')).toBe(0);
    expect(parseOffset(undefined)).toBeNull();
    expect(geminiMimeType('audio/mpeg', 'a.mp3')).toBe('audio/mp3');
    expect(geminiMimeType('audio/mp4', 'a.m4a')).toBe('audio/m4a');
    expect(geminiMimeType('application/octet-stream', 'chunk-0.ogg')).toBe(
      'audio/ogg',
    );
  });

  it('numbers speakers by first appearance, per request', () => {
    expect(speakerNames(['spk_1', 'spk_0', 'spk_1', null, 'spk_2'])).toEqual([
      'Speaker 1',
      'Speaker 2',
      'Speaker 1',
      null,
      'Speaker 3',
    ]);
  });

  it('never plans a part longer than one request allows, whatever the pauses', () => {
    for (const max of [GEMINI_MAX_REQUEST_SECONDS, 30]) {
      const target = Math.floor(max / 1.25);
      for (
        let duration = 20;
        duration <= (max > 100 ? 4 * 3600 : 600);
        duration += max > 100 ? 61 : 3
      ) {
        // Pauses just past each target: tempting cut points over the limit.
        const silences = Array.from(
          { length: Math.ceil(duration / target) + 1 },
          (_, k) => ({
            startSec: (k + 1) * target + 5,
            endSec: (k + 1) * target + 9,
          }),
        );
        for (const c of planChunks(duration, silences, target, 45, max))
          expect(c.endSec - c.startSec).toBeLessThanOrEqual(max);
      }
    }
  });
});

describe('TranscriptionProviderService with Gemini', () => {
  const service = (provider: string, apiKey = 'gk-test') =>
    new TranscriptionProviderService(
      new ConfigService({
        ai: { groqKey: 'groq-key' },
        transcription: {
          provider,
          sttModel: 'whisper-large-v3',
          gemini: { ...CONFIG, apiKey },
        },
      }),
    );

  it('selects the provider from configuration', () => {
    expect(service('gemini').sttProvider).toBe('gemini');
    expect(service('gemini').sttModel).toBe('gemini-3.5-transcribe');
    expect(service('gemini').maxRequestSeconds).toBe(
      GEMINI_MAX_REQUEST_SECONDS,
    );
    expect(service('groq').sttProvider).toBe('groq');
    expect(service('groq').sttModel).toBe('whisper-large-v3');
    expect(service('groq').maxRequestSeconds).toBeNull();
  });

  it('returns timed segments with speakers, labelled as Gemini', async () => {
    mockGemini();
    const result = await service('gemini').transcribe(audioPath, {
      filename: 'a.webm',
      mimeType: 'audio/webm',
      language: 'ha',
    });
    expect(result.provider).toBe('gemini');
    expect(result.model).toBe('gemini-3.5-transcribe');
    expect(result.language).toBe('ha');
    expect(
      result.segments.map((s) => [s.text, s.speakerLabel, s.startMs, s.endMs]),
    ).toEqual([
      // Very short sentences stay with the next one (no one-word segments).
      ['Sannu. Ina kwana?', 'Speaker 1', 100, 1500],
      ['Lafiya lau.', 'Speaker 2', 2000, 2800],
    ]);
  });
});
