import { redirect } from 'next/navigation';

/**
 * Anything under the field app that isn't a field screen (e.g. an admin
 * address typed or followed on field.jrecc.org, which middleware maps to
 * /field/<path>) goes to the field home instead of a 404.
 */
export default function FieldFallback() {
  redirect('/field');
}
