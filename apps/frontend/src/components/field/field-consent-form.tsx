'use client';

import { useId, useState } from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CONSENT_SCOPES, type ConsentMethod, type CreateConsentDto } from '@/types/consent';
import { cn } from '@/lib/utils';

type Scopes = Pick<CreateConsentDto, 'allowRecording' | 'allowTranscription' | 'allowAiAnalysis' | 'allowQuotation' | 'allowPublication'>;

interface Props {
  isSubmitting?: boolean;
  onSubmit: (data: Omit<CreateConsentDto, 'participantId'>) => void | Promise<void>;
  onCancel?: () => void;
}

/**
 * Consent capture for the field: read each permission aloud, record an
 * explicit Yes or No. Nothing is pre-selected — an unanswered question
 * blocks submission, so "no" is never recorded by omission.
 */
export function FieldConsentForm({ isSubmitting, onSubmit, onCancel }: Props) {
  const id = useId();
  const [version, setVersion] = useState('v1');
  const [method, setMethod] = useState<ConsentMethod>('VERBAL');
  const [answers, setAnswers] = useState<Partial<Record<keyof Scopes, boolean>>>({});
  const [showErrors, setShowErrors] = useState(false);

  const unanswered = CONSENT_SCOPES.filter((s) => answers[s.key as keyof Scopes] === undefined);

  const submit = async () => {
    if (unanswered.length > 0 || !version.trim()) {
      setShowErrors(true);
      return;
    }
    await onSubmit({
      version: version.trim(),
      method,
      ...(Object.fromEntries(CONSENT_SCOPES.map((s) => [s.key, !!answers[s.key as keyof Scopes]])) as Scopes),
    });
  };

  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="mb-2 text-[16px] font-semibold text-foreground">How was consent given?</legend>
        <div className="grid grid-cols-3 gap-2" role="radiogroup">
          {(['VERBAL', 'WRITTEN', 'DIGITAL'] as ConsentMethod[]).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={method === m}
              onClick={() => setMethod(m)}
              className={cn(
                'h-control-lg rounded-xl text-[15px] font-semibold ring-1 transition-colors',
                method === m ? 'bg-navy text-white ring-navy' : 'bg-field-card text-foreground ring-field-line',
              )}
            >
              {m.charAt(0) + m.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        <p className="mb-3 text-[16px] font-semibold text-foreground">Ask the participant each question</p>
        <ul className="space-y-2.5">
          {CONSENT_SCOPES.map((scope) => {
            const key = scope.key as keyof Scopes;
            const value = answers[key];
            const missing = showErrors && value === undefined;
            return (
              <li key={scope.key} className={cn('rounded-2xl bg-field-card p-4 ring-1', missing ? 'ring-error' : 'ring-field-line')}>
                <p id={`${id}-${scope.key}`} className="text-[16px] font-semibold text-foreground">
                  {scope.label}
                </p>
                <p className="mt-0.5 text-[15px] leading-snug text-foreground-secondary">{scope.helpText}</p>
                <div className="mt-3 grid grid-cols-2 gap-2" role="radiogroup" aria-labelledby={`${id}-${scope.key}`}>
                  {[true, false].map((answer) => (
                    <button
                      key={String(answer)}
                      type="button"
                      role="radio"
                      aria-checked={value === answer}
                      onClick={() => setAnswers((a) => ({ ...a, [key]: answer }))}
                      className={cn(
                        'flex h-control-lg items-center justify-center gap-2 rounded-xl text-[16px] font-semibold ring-1 transition-colors',
                        value === answer
                          ? answer
                            ? 'bg-lemon text-lemon-foreground ring-lemon-600'
                            : 'bg-neutral-800 text-white ring-neutral-800 dark:bg-neutral-300 dark:text-neutral-950'
                          : 'bg-background-elevated text-foreground ring-field-line',
                      )}
                    >
                      {answer ? <Check className="h-5 w-5" aria-hidden /> : <X className="h-5 w-5" aria-hidden />}
                      {answer ? 'Yes' : 'No'}
                    </button>
                  ))}
                </div>
                {missing && <p className="mt-2 text-[14px] text-foreground-error">Record an answer for this question.</p>}
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <label htmlFor={`${id}-version`} className="mb-1.5 block text-[16px] font-semibold text-foreground">
          Consent form version
        </label>
        <Input id={`${id}-version`} value={version} onChange={(e) => setVersion(e.target.value)} className="h-control-lg" maxLength={50} />
        <p className="mt-1.5 text-[14px] text-foreground-secondary">As printed on the information sheet you used.</p>
      </div>

      <div className="space-y-2">
        <Button size="xl" className="w-full" loading={isSubmitting} onClick={submit}>
          Save consent
        </Button>
        {onCancel && (
          <Button size="lg" variant="ghost" className="w-full" onClick={onCancel}>
            Cancel
          </Button>
        )}
        {showErrors && unanswered.length > 0 && (
          <p className="text-center text-[14px] text-foreground-error" role="alert">
            {unanswered.length} question{unanswered.length === 1 ? '' : 's'} still need an answer.
          </p>
        )}
      </div>
    </div>
  );
}
