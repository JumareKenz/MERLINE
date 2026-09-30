import { redirect } from 'next/navigation';

/**
 * Assignments became Enumerators: people, their projects and their access
 * codes live in one place. Old links and bookmarks land there.
 */
export default function AssignmentsRedirect() {
  redirect('/enumerators');
}
