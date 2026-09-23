import { redirect } from 'next/navigation';

/** Moved under Settings. Kept so old links still land in the right place. */
export default function LegacyUsersRedirect() {
  redirect('/admin/users');
}
