import { redirect } from 'next/navigation';

export default function DesignIndexPage({ params }: { params: { studyId: string } }) {
  redirect(`/studies/${params.studyId}/design/overview`);
}
