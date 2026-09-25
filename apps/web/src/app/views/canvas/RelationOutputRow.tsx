/** Controlled output presentation; mutations belong to the relation command owner. */
import { useId } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { Input } from '../../components/ui/input';
import type { CanvasViewCopy } from './canvasCopy.types';
import type { RelationOutputSlot } from './canvasRelationOutputSchema';
import type { CanvasInspectorNodeDraftErrorCode } from './canvasInspectorAuthoringErrorCodes';
import { formatCanvasInspectorNodeDraftError } from './canvasCopyFormatting';

export function RelationOutputRow({
  field,
  disabled,
  first,
  last,
  copy,
  name,
  error,
  onNameChange,
  onInclude,
  onMove,
  onRename,
}: Readonly<{
  field: RelationOutputSlot;
  disabled: boolean;
  first: boolean;
  last: boolean;
  copy: CanvasViewCopy;
  name: string;
  error: CanvasInspectorNodeDraftErrorCode | null;
  onNameChange: (name: string) => void;
  onInclude: (included: boolean) => void;
  onMove: (offset: -1 | 1) => void;
  onRename: (name: string) => void;
}>) {
  const errorId = useId();
  return (
    <div data-slot="relation-output-field" data-field-id={field.output?.fieldId ?? field.key}>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={field.output != null}
          disabled={disabled}
          aria-label={field.name}
          onChange={(event) => onInclude(event.currentTarget.checked)}
        />
        <Input
          aria-label={field.name}
          value={name}
          disabled={disabled || field.output == null}
          aria-invalid={error == null ? undefined : true}
          aria-describedby={error == null ? undefined : errorId}
          onChange={(event) => onNameChange(event.currentTarget.value)}
          onBlur={(event) => onRename(event.currentTarget.value)}
        />
        <span className="text-xs text-(--text-muted)">{field.schema.type.kind.case}</span>
        <button
          type="button"
          disabled={disabled || first || field.output == null}
          aria-label={copy.inspectorDvtSubstraitMoveFieldUpLabel}
          onClick={() => onMove(-1)}
        >
          <ArrowUp size={14} />
        </button>
        <button
          type="button"
          disabled={disabled || last || field.output == null}
          aria-label={copy.inspectorDvtSubstraitMoveFieldDownLabel}
          onClick={() => onMove(1)}
        >
          <ArrowDown size={14} />
        </button>
      </div>
      {error == null ? null : (
        <p id={errorId} role="alert" className="text-xs text-red-400">
          {formatCanvasInspectorNodeDraftError(error, copy)}
        </p>
      )}
    </div>
  );
}
