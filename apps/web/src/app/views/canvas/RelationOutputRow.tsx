/** Controlled output presentation; mutations belong to the relation command owner. */
import { useId } from 'react';
import { GripVertical } from 'lucide-react';
import type { DragEventHandler, KeyboardEventHandler } from 'react';
import { Input } from '../../components/ui/input';
import type { CanvasViewCopy } from './canvasCopy.types';
import type { RelationOutputSlot } from './canvasRelationOutputSchema';
import type { CanvasInspectorNodeDraftErrorCode } from './canvasInspectorAuthoringErrorCodes';
import { formatCanvasInspectorNodeDraftError } from './canvasCopyFormatting';

export function RelationOutputRow({
  field,
  disabled,
  copy,
  name,
  error,
  onNameChange,
  onInclude,
  onRename,
  draggable,
  dropPlacement,
  reorderLabel,
  reorderHint,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  onKeyDown,
  orderingOnly = false,
}: Readonly<{
  field: RelationOutputSlot;
  disabled: boolean;
  copy: CanvasViewCopy;
  name: string;
  error: CanvasInspectorNodeDraftErrorCode | null;
  onNameChange: (name: string) => void;
  onInclude: (included: boolean) => void;
  onRename: (name: string) => void;
  draggable: boolean;
  dropPlacement?: 'before' | 'after';
  reorderLabel: string;
  reorderHint: string;
  onDragStart: DragEventHandler<HTMLDivElement>;
  onDragEnd: DragEventHandler<HTMLDivElement>;
  onDragOver: DragEventHandler<HTMLDivElement>;
  onDragLeave: DragEventHandler<HTMLDivElement>;
  onDrop: DragEventHandler<HTMLDivElement>;
  onKeyDown: KeyboardEventHandler<HTMLDivElement>;
  orderingOnly?: boolean;
}>) {
  const errorId = useId();
  return (
    <div
      data-slot="relation-output-field"
      data-field-id={field.output?.fieldId ?? field.key}
      data-drop-placement={dropPlacement}
      draggable={draggable}
      tabIndex={draggable ? 0 : undefined}
      aria-label={draggable ? `${reorderLabel}: ${name}` : undefined}
      title={draggable ? reorderHint : undefined}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onKeyDown={onKeyDown}
      className="relative rounded-md"
    >
      {dropPlacement == null ? null : (
        <span
          data-slot="relation-output-drop-indicator"
          aria-hidden="true"
          className={`pointer-events-none absolute left-1 right-1 z-10 h-0.5 bg-(--status-info) ${dropPlacement === 'before' ? 'top-0' : 'bottom-0'}`}
        />
      )}
      <div className="flex items-center gap-2">
        {draggable ? (
          <GripVertical
            data-slot="relation-output-drag-handle"
            aria-hidden="true"
            className="size-4 shrink-0 cursor-grab text-(--text-muted)"
          />
        ) : null}
        {orderingOnly ? (
          <span className="min-w-0 flex-1 truncate">{field.name}</span>
        ) : (
          <>
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
          </>
        )}
        <span className="text-xs text-(--text-muted)">{field.schema.type.kind.case}</span>
      </div>
      {error == null ? null : (
        <p id={errorId} role="alert" className="text-xs text-red-400">
          {formatCanvasInspectorNodeDraftError(error, copy)}
        </p>
      )}
    </div>
  );
}
