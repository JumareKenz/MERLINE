import { redirect } from 'next/navigation';

/** Starting an interview now begins from the person (People → consent → start). */
export default function FieldNewInterviewRedirect() {
  redirect('/field/participants');
}
