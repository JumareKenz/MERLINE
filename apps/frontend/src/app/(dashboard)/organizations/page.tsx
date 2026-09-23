import { redirect } from 'next/navigation';

/** Organization details live under Settings now. */
export default function OrganizationsRedirect() {
  redirect('/admin/settings');
}
