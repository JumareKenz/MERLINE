import { redirect } from 'next/navigation';

/** Uploads now live in History → Pending. */
export default function FieldUploadsRedirect() {
  redirect('/field/history?view=pending');
}
