/** Owned concern: edit one column comment and commit it without a secondary Apply action. */

import { Textarea } from '../../components/ui/textarea';

export function CanvasColumnCommentEditor(
  props: Readonly<{
    fieldName: string;
    value: string;
    disabled: boolean;
    label: string;
    placeholder: string;
    onCommit: (value: string) => void;
  }>
): JSX.Element {
  return (
    <Textarea
      key={props.value}
      data-slot="canvas-column-comment-editor"
      aria-label={`${props.label}: ${props.fieldName}`}
      defaultValue={props.value}
      disabled={props.disabled}
      placeholder={props.placeholder}
      className="min-h-16 resize-y text-xs"
      onBlur={(event) => {
        const nextValue = event.currentTarget.value;
        if (nextValue.trim() !== props.value.trim()) props.onCommit(nextValue);
      }}
    />
  );
}
