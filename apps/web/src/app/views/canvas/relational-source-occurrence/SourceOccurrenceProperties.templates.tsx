/** Passive instance inspector: alias controls and output slot, with no command or schema policy. */
import type { ReactNode } from 'react';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { CanvasRelationalTreeEditorFrame } from '../CanvasRelationalTreeEditorFrame';

export function SourceOccurrencePropertiesTemplate({
  data,
  actions,
  output,
}: Readonly<{
  data: Readonly<{
    inputId: string;
    relationId: string;
    title: string;
    alias: string;
    aliasLabel: string;
    updateLabel: string;
    unsupported: string | null;
    error: string | null;
    invalid: boolean;
    canSubmit: boolean;
    editing: boolean;
  }>;
  actions: Readonly<{
    changeAlias: (alias: string) => void;
    submit: () => void;
    close: () => void;
    edit: () => void;
  }>;
  output: ReactNode;
}>): JSX.Element {
  return (
    <CanvasRelationalTreeEditorFrame
      operation="read"
      relationId={data.relationId}
      label={data.title}
      hasExpression={false}
      onClose={actions.close}
      output={output}
      initialTab="output"
      editing={data.editing}
      onEdit={data.unsupported == null ? actions.edit : undefined}
    >
      {data.unsupported != null ? (
        <p className="text-xs text-(--text-muted)">{data.unsupported}</p>
      ) : !data.editing ? (
        <p className="text-xs text-(--text-primary)">
          {data.aliasLabel}: {data.alias}
        </p>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            actions.submit();
          }}
        >
          <label htmlFor={data.inputId} className="block text-xs text-(--text-muted)">
            {data.aliasLabel}
          </label>
          <Input
            id={data.inputId}
            data-slot="source-occurrence-alias"
            value={data.alias}
            aria-invalid={data.invalid}
            aria-describedby={data.error == null ? undefined : `${data.inputId}-error`}
            onChange={(event) => actions.changeAlias(event.currentTarget.value)}
          />
          {data.error == null ? null : (
            <p id={`${data.inputId}-error`} role="alert" className="text-xs text-amber-300">
              {data.error}
            </p>
          )}
          <Button
            type="submit"
            size="sm"
            data-slot="source-occurrence-update"
            disabled={!data.canSubmit}
          >
            {data.updateLabel}
          </Button>
        </form>
      )}
    </CanvasRelationalTreeEditorFrame>
  );
}
