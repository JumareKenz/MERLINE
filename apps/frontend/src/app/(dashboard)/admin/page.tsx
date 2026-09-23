import { redirect } from 'next/navigation';

/** /admin has no page of its own; Settings lives at /admin/settings. */
export default function AdminIndex() {
  redirect('/admin/settings');
}
