import { redirect } from 'next/navigation';

/**
 * The interview screen is a single static route (/field/interview?id=…) so
 * the service worker can open any interview offline from one cached page.
 */
export default function LegacyFieldInterviewRedirect({ params }: { params: { interviewId: string } }) {
  redirect(`/field/interview?id=${encodeURIComponent(params.interviewId)}`);
}
