'use client';

import { useState } from 'react';
import { Check, Copy, Mail, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { respondentUrl } from '@/hooks/use-respondent-links';
import type { RespondentLink } from '@/types/respondent-link';

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older browsers, or a page not served over https.
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  }
}

function invitation(link: RespondentLink) {
  const greeting = link.respondentName ? `Hello ${link.respondentName},` : 'Hello,';
  return `${greeting}\n\nYou are invited to take part in "${link.title}". Open this link on your phone or computer to read the questions and record your answers:\n\n${respondentUrl(link.token)}`;
}

/** Copy, WhatsApp and email: the ways a link actually reaches respondents. */
export function ShareButtons({ link, size = 'sm' }: { link: RespondentLink; size?: 'sm' | 'default' }) {
  const [copied, setCopied] = useState(false);
  const url = respondentUrl(link.token);
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size={size}
        variant="secondary"
        onClick={async () => {
          if (await copyText(url)) {
            setCopied(true);
            toast.success('Link copied');
            window.setTimeout(() => setCopied(false), 2000);
          } else {
            toast.error('Could not copy. Select the link and copy it instead.');
          }
        }}
      >
        {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />} Copy link
      </Button>
      <Button size={size} variant="secondary" asChild>
        <a href={`https://wa.me/?text=${encodeURIComponent(invitation(link))}`} target="_blank" rel="noopener noreferrer">
          <MessageCircle className="h-4 w-4" aria-hidden /> WhatsApp
        </a>
      </Button>
      <Button size={size} variant="secondary" asChild>
        <a href={`mailto:?subject=${encodeURIComponent(link.title)}&body=${encodeURIComponent(invitation(link))}`}>
          <Mail className="h-4 w-4" aria-hidden /> Email
        </a>
      </Button>
    </div>
  );
}

/** Shown straight after a link is created. */
export function LinkReadyDialog({ link, onOpenChange }: { link: RespondentLink | null; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={!!link} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Your link is ready</DialogTitle>
          <DialogDescription>
            {link?.respondentName
              ? `Send it to ${link.respondentName}. It closes after they submit.`
              : 'Send it to your respondents. Each one gives their name, agrees to take part, and records their answers.'}
          </DialogDescription>
        </DialogHeader>
        {link && (
          <div className="space-y-4">
            <p className="break-all rounded-lg bg-background-surface px-3 py-2.5 font-mono text-[13px] text-foreground ring-1 ring-border-subtle" aria-label="Link">
              {respondentUrl(link.token)}
            </p>
            <ShareButtons link={link} size="default" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
