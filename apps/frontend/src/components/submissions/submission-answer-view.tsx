'use client';

import type { SubmissionAnswer } from '@/types/submission';

interface SubmissionAnswerViewProps {
  answer: SubmissionAnswer;
}

export function SubmissionAnswerView({ answer }: SubmissionAnswerViewProps) {
  const qType = answer.question?.question_type || 'text';
  const qLabel = answer.question?.label || answer.question?.code || 'Unknown';

  const renderValue = () => {
    switch (qType) {
      case 'text':
      case 'text_long':
      case 'note':
        return <p className="text-sm">{answer.value_text || String(answer.value || '')}</p>;

      case 'numeric_int':
      case 'numeric_decimal':
      case 'number':
        return <p className="text-sm tabular-nums font-medium">{answer.value_number ?? String(answer.value ?? '')}</p>;

      case 'single_select':
      case 'select_one':
        return (
          <span className="inline-flex items-center rounded-full bg-primary-50 text-primary px-2.5 py-0.5 text-xs font-medium">
            {answer.value_text || String(answer.value || '')}
          </span>
        );

      case 'multiple_select':
      case 'select_multiple':
        return (
          <div className="flex flex-wrap gap-1">
            {(answer.value_option_ids || []).map((optId) => (
              <span
                key={optId}
                className="inline-flex items-center rounded-full bg-primary-50 text-primary px-2 py-0.5 text-xs font-medium"
              >
                {optId}
              </span>
            ))}
          </div>
        );

      case 'date':
        return <p className="text-sm">{answer.value_date || String(answer.value || '')}</p>;

      case 'boolean':
      case 'yes_no':
        return (
          <span className={`inline-flex items-center gap-1 text-sm ${answer.value_boolean ? 'text-success' : 'text-error'}`}>
            <span className={`h-2 w-2 rounded-full ${answer.value_boolean ? 'bg-success' : 'bg-error'}`} />
            {answer.value_boolean ? 'Yes' : 'No'}
          </span>
        );

      case 'photo':
      case 'image':
        return answer.media_id ? (
          <div className="relative w-24 h-24 rounded-md bg-neutral-100 overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center text-foreground-tertiary text-xs">
              Photo
            </div>
          </div>
        ) : (
          <p className="text-sm text-foreground-tertiary italic">No photo</p>
        );

      case 'audio':
        return (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-primary underline cursor-pointer">Play audio</span>
          </div>
        );

      case 'video':
        return (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-primary underline cursor-pointer">Play video</span>
          </div>
        );

      case 'signature':
        return answer.media_id ? (
          <div className="w-32 h-16 rounded-md bg-neutral-100 border border-border" />
        ) : (
          <p className="text-sm text-foreground-tertiary italic">No signature</p>
        );

      case 'geo':
      case 'gps':
      case 'geopoint':
        return answer.value ? (
          <a
            href={`https://www.google.com/maps?q=${answer.value}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary underline"
          >
            View on map
          </a>
        ) : (
          <p className="text-sm text-foreground-tertiary italic">No location</p>
        );

      default:
        return <p className="text-sm">{String(answer.value || '—')}</p>;
    }
  };

  return (
    <div className="py-3 border-b border-border last:border-0">
      <p className="text-sm font-medium text-foreground mb-1">{qLabel}</p>
      {renderValue()}
      {answer.flagged && (
        <p className="text-xs text-error mt-1">
          Flagged: {answer.flag_reason || 'Suspicious answer'}
        </p>
      )}
    </div>
  );
}
