/**
 * The text of a segment as the research team should read and quote it: the
 * human correction when there is one, otherwise the machine transcript.
 * The machine text is never overwritten, so the original stays available.
 */
export function segmentText(segment: {
  text: string;
  editedText?: string | null;
}): string {
  return segment.editedText ?? segment.text;
}
