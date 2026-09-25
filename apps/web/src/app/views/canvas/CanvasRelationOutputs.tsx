/** Reusable output selection controller for every analyzed relation. */
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import { DvtSemanticFieldNameV1Schema } from '@dvt/contracts';
import { useEffect, useRef, useState } from 'react';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
import { useRelationOutputs } from './useRelationOutputs';
import { useRelationCommand } from './useRelationCommand';
import { changeSelectedRelationOutputs } from './canvasSelectedRelationOutputs';
import { RelationOutputRow } from './RelationOutputRow';
import { useInspectorListReorder } from '../../components/inspector/useInspectorListReorder';

export type RelationOutputNames = Readonly<{
  values: Readonly<Record<string, string>>;
  onChange: (fieldId: string, value: string) => void;
}>;

export function CanvasRelationOutputs({
  relationId,
  disabled,
  onChange,
  names,
  onPendingChange,
  orderingOnly = false,
}: Readonly<{
  relationId: string;
  disabled: boolean;
  onChange: (document: SubstraitDocument) => void | boolean;
  orderingOnly?: boolean;
  names?: RelationOutputNames;
  onPendingChange?: (pending: boolean) => void;
}>) {
  const language = useApplicationLanguageStore((state) => state.language);
  const copy = resolveCanvasViewCopy(language);
  const editorCopy = resolveCanvasSemanticEditorCopy(language);
  const model = useRelationOutputs(relationId);
  const command = useRelationCommand(relationId, onChange);
  const [localNames, setLocalNames] = useState<Readonly<Record<string, string>>>({});
  const drafts = names ?? {
    values: localNames,
    onChange: (id: string, value: string) =>
      setLocalNames((current) => ({ ...current, [id]: value })),
  };
  const callback = useRef(onPendingChange);
  callback.current = onPendingChange;
  const pending =
    model?.slots.some(
      (field) =>
        field.output != null &&
        drafts.values[field.output.fieldId] != null &&
        drafts.values[field.output.fieldId] !== field.name
    ) ?? false;
  useEffect(() => {
    callback.current?.(pending);
    return () => callback.current?.(false);
  }, [pending]);
  const selected = (model?.slots ?? [])
    .filter((field) => field.output != null)
    .sort((a, b) => a.output!.outputOrdinal - b.output!.outputOrdinal);
  const outputs = selected.map((field) => ({ slot: field.slot, alias: field.name }));
  const outputIds = selected.map((field) => field.output!.fieldId);
  const update = (next: typeof outputs) => {
    if (!disabled && model != null && !model.physical)
      void command.execute((session, request) =>
        changeSelectedRelationOutputs(session, { ...request, outputs: next })
      );
  };
  const reorder = useInspectorListReorder({
    orderedIds: outputIds,
    visibleIds: outputIds,
    enabled: !disabled && model != null && !model.physical && command.state !== 'busy',
    onMove: (movedId, targetId, placement) => {
      const sourceIndex = outputIds.indexOf(movedId);
      if (sourceIndex < 0) return;
      const next = [...outputs];
      const [moved] = next.splice(sourceIndex, 1);
      const targetIndex = outputIds.filter((id) => id !== movedId).indexOf(targetId);
      if (moved == null || targetIndex < 0) return;
      next.splice(targetIndex + (placement === 'after' ? 1 : 0), 0, moved);
      update(next);
    },
  });
  if (model == null) return null;
  return (
    <section className="space-y-2" data-slot="canvas-relation-outputs">
      {(orderingOnly
        ? selected
        : [...selected, ...model.slots.filter((field) => field.output == null)]
      ).map((field) => {
        const key = field.output?.fieldId ?? field.key;
        const canReorder = field.output != null && reorder.canReorder;
        const name = field.output == null ? field.name : (drafts.values[key] ?? field.name);
        const error =
          name.trim().length === 0
            ? 'dvt_alias_required'
            : !DvtSemanticFieldNameV1Schema.safeParse(name).success
              ? 'dvt_semantic_field_invalid'
              : selected.some((other) => other.slot !== field.slot && other.name === name)
                ? 'dvt_alias_duplicate'
                : null;
        return (
          <RelationOutputRow
            orderingOnly={orderingOnly}
            key={key}
            field={field}
            copy={copy}
            name={name}
            error={error}
            onNameChange={(value) => drafts.onChange(key, value)}
            disabled={disabled || model.physical || command.state === 'busy'}
            draggable={canReorder}
            dropPlacement={reorder.dropPlacement(key)}
            reorderLabel={editorCopy.reorderOutput}
            reorderHint={editorCopy.reorderOutputHint}
            onDragStart={(event) => {
              if (canReorder) reorder.startDrag(key, event);
            }}
            onDragEnd={reorder.endDrag}
            onDragOver={(event) => {
              if (canReorder) reorder.dragOver(key, event);
            }}
            onDragLeave={reorder.dragLeave}
            onDrop={(event) => {
              if (canReorder) reorder.drop(key, event);
            }}
            onKeyDown={(event) => {
              if (event.target === event.currentTarget) reorder.moveWithKeyboard(key, event);
            }}
            onInclude={(included) =>
              update(
                included
                  ? [...outputs, { slot: field.slot, alias: field.name }]
                  : outputs.filter((output) => output.slot !== field.slot)
              )
            }
            onRename={(alias) => {
              if (
                alias === field.name ||
                !DvtSemanticFieldNameV1Schema.safeParse(alias).success ||
                selected.some((other) => other.slot !== field.slot && other.name === alias)
              )
                return;
              update(
                outputs.map((output) =>
                  output.slot === field.slot ? { ...output, alias } : output
                )
              );
            }}
          />
        );
      })}
      {command.state === 'error' ? (
        <p role="alert" className="text-xs text-red-400">
          {copy.inspectorDvtRelationalUnavailable}
        </p>
      ) : null}
    </section>
  );
}
