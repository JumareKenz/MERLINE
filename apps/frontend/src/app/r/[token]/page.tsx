import type { Metadata } from 'next';
import { RespondFlow } from '@/components/respond/respond-flow';

export const metadata: Metadata = {
  title: 'Research interview',
  robots: { index: false, follow: false },
  // Links are shared in chats: keep the preview neutral and the token private.
  openGraph: { title: 'Research interview', description: 'You are invited to answer a short research interview.' },
};

/**
 * PUBLIC — a respondent answering a self-interview link. No account: the
 * token in the address is the invitation. See lib/respond/.
 */
export default function RespondPage({ params }: { params: { token: string } }) {
  return <RespondFlow token={params.token} />;
}
