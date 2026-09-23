import { ConfigService } from '@nestjs/config';
import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { PermanentJobError, RetryableJobError } from '../jobs/job-errors';
import {
  TranscriptionProviderService,
  dropNonSpeech,
  parseRetryAfter,
} from './transcription-provider.service';
import { providerFilename } from './transcription-pipeline.service';

const audioPath = join(
  mkdtempSync(join(tmpdir(), 'merline-provider-')),
  'a.webm',
);
writeFileSync(audioPath, Buffer.from('not really audio'));

function provider(groqKey = 'test-key') {
  return new TranscriptionProviderService(
    new ConfigService({
      ai: { groqKey },
      transcription: { sttModel: 'whisper-large-v3' },
    }),
  );
}

function mockFetch(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
) {
  return jest.spyOn(global, 'fetch').mockResolvedValue(
    new Response(typeof body === 'string' ? body : JSON.stringify(body), {
      status,
      headers,
    }),
  );
}

describe('TranscriptionProviderService (Groq)', () => {
  afterEach(() => jest.restoreAllMocks());

  it('sends the configured model and language hint, and maps segments', async () => {
    const fetchSpy = mockFetch(200, {
      language: 'Hausa',
      segments: [
        {
          start: 0,
          end: 2.5,
          text: ' Sannu ',
          avg_logprob: -0.2,
          no_speech_prob: 0.01,
        },
      ],
    });

    const result = await provider().transcribe(audioPath, {
      filename: 'a.webm',
      mimeType: 'audio/webm',
      language: 'ha',
    });

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://api.groq.com/openai/v1/audio/transcriptions');
    const form = init!.body as FormData;
    expect(form.get('model')).toBe('whisper-large-v3');
    expect(form.get('language')).toBe('ha');
    expect((init!.headers as Record<string, string>).Authorization).toBe(
      'Bearer test-key',
    );
    expect(result.language).toBe('ha');
    expect(result.segments).toEqual([
      expect.objectContaining({
        startMs: 0,
        endMs: 2500,
        text: 'Sannu',
        confidence: 0.819,
      }),
    ]);
  });

  it('normalises a detected language name to its code', async () => {
    mockFetch(200, { language: 'English', segments: [] });
    const result = await provider().transcribe(audioPath, {
      filename: 'a.webm',
      mimeType: 'audio/webm',
    });
    expect(result.language).toBe('en');
  });

  it('treats a rate limit as retryable and carries retry-after', async () => {
    mockFetch(
      429,
      { error: { message: 'Rate limit reached' } },
      { 'retry-after': '42' },
    );
    const err = (await provider()
      .transcribe(audioPath, { filename: 'a.webm', mimeType: 'audio/webm' })
      .catch((e: unknown) => e)) as RetryableJobError;
    expect(err).toBeInstanceOf(RetryableJobError);
    expect(err.retryAfterMs).toBe(42_000);
    expect(err.message).toMatch(/Rate limit reached/);
  });

  it('treats provider 5xx and network failures as retryable', async () => {
    mockFetch(503, 'upstream unavailable');
    await expect(
      provider().transcribe(audioPath, {
        filename: 'a.webm',
        mimeType: 'audio/webm',
      }),
    ).rejects.toBeInstanceOf(RetryableJobError);

    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('ECONNRESET'));
    await expect(
      provider().transcribe(audioPath, {
        filename: 'a.webm',
        mimeType: 'audio/webm',
      }),
    ).rejects.toBeInstanceOf(RetryableJobError);
  });

  it('treats a rejected key or unreadable file as permanent', async () => {
    mockFetch(401, { error: { message: 'Invalid API Key' } });
    await expect(
      provider().transcribe(audioPath, {
        filename: 'a.webm',
        mimeType: 'audio/webm',
      }),
    ).rejects.toThrow(/rejected the API key/);

    mockFetch(400, { error: { message: 'could not process file' } });
    await expect(
      provider().transcribe(audioPath, {
        filename: 'a.webm',
        mimeType: 'audio/webm',
      }),
    ).rejects.toBeInstanceOf(PermanentJobError);
  });

  it('fails permanently, without calling out, when no key is configured', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');
    await expect(
      provider('').transcribe(audioPath, {
        filename: 'a.webm',
        mimeType: 'audio/webm',
      }),
    ).rejects.toThrow(/GROQ_API_KEY is not set/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('dropNonSpeech', () => {
  const seg = (text: string, noSpeechProb: number, avgLogprob: number) => ({
    startMs: 0,
    endMs: 1,
    text,
    confidence: null,
    noSpeechProb,
    avgLogprob,
  });

  it('drops text the model decoded over silence, keeps real speech', () => {
    const kept = dropNonSpeech([
      seg('Thank you for watching!', 0.92, -1.4), // classic silence hallucination
      seg('Na gode sosai', 0.7, -0.4), // unsure it was speech, but confident text
      seg('Muna noma dawa', 0.05, -1.6), // low confidence, but clearly speech
      seg('', 0, 0),
    ]);
    expect(kept.map((s) => s.text)).toEqual([
      'Na gode sosai',
      'Muna noma dawa',
    ]);
  });
});

describe('parseRetryAfter', () => {
  it('reads seconds and HTTP dates', () => {
    expect(parseRetryAfter(new Headers({ 'retry-after': '7' }))).toBe(7000);
    const later = new Date(Date.now() + 60_000).toUTCString();
    expect(
      parseRetryAfter(new Headers({ 'retry-after': later })),
    ).toBeGreaterThan(50_000);
    expect(parseRetryAfter(new Headers())).toBeUndefined();
  });
});

describe('providerFilename', () => {
  it('keeps a known extension and adds one from the MIME type otherwise', () => {
    expect(providerFilename('interview.m4a', 'audio/mp4')).toBe(
      'interview.m4a',
    );
    expect(providerFilename('rec-123', 'audio/webm;codecs=opus')).toBe(
      'rec-123.webm',
    );
    expect(providerFilename('', 'audio/mp4')).toBe('recording.m4a');
  });
});
