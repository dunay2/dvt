/** Unit-only Monaco boundary double. Native Cypress exercises the actual editor. */
import { useEffect, useRef, type ComponentProps } from 'react';
import type {
  MonacoCodeEditor,
  MonacoCodeEditorMount,
} from '../../components/monaco/MonacoCodeEditor';

export function FormulaMonacoTestSurface(
  props: ComponentProps<typeof MonacoCodeEditor>
): JSX.Element {
  const textarea = useRef<HTMLTextAreaElement>(null);
  const latest = useRef(props);
  latest.current = props;
  useEffect(() => {
    const element = textarea.current!;
    const position = (offset: number) => ({ lineNumber: 1, column: offset + 1 });
    const model = {
      getOffsetAt: (point: { column: number }) => point.column - 1,
      getPositionAt: position,
      getValueInRange: () => element.value.slice(element.selectionStart, element.selectionEnd),
    };
    const instance = {
      getModel: () => model,
      getSelection: () => ({ getStartPosition: () => position(element.selectionStart) }),
      pushUndoStop: () => true,
      executeEdits: (_source: string, edits: { text: string }[]) => {
        latest.current.onChange(
          element.value.slice(0, element.selectionStart) +
            edits[0]!.text +
            element.value.slice(element.selectionEnd)
        );
      },
      setPosition: (point: { column: number }) => {
        queueMicrotask(() => element.setSelectionRange(point.column - 1, point.column - 1));
      },
      focus: () => element.focus(),
    };
    latest.current.onMount?.(
      instance as unknown as Parameters<MonacoCodeEditorMount>[0],
      {} as Parameters<MonacoCodeEditorMount>[1]
    );
  }, []);
  return (
    <textarea
      name="formula"
      ref={textarea}
      value={props.value}
      onChange={(event) => props.onChange(event.target.value)}
    />
  );
}
