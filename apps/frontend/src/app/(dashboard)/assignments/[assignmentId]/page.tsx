import { redirect } from 'next/navigation';

/** Assignments are interviews; their detail lives on the interview page. */
export default function AssignmentDetailPage({ params }: { params: { assignmentId: string } }) {
  redirect(`/interviews/${params.assignmentId}`);
}
