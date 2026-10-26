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
import { useCanvasOutputPresentation } from './CanvasRelationalTreeEditorFrame';

export function CanvasRelationOutputs({
  relationId,
  disabled,
  onChange,
  onPendingChange,
  orderingOnly = false,
}: Readonly<{
  relationId: string;
  disabled: boolean;
  onChange: (document: SubstraitDocument) => void | boolean;
  orderingOnly?: boolean;
  onPendingChange?: (pending: boolean) => void;
}>) {
  const language = useApplicationLanguageStore((state) => state.language);
  const copy = resolveCanvasViewCopy(language);
  const editorCopy = resolveCanvasSemanticEditorCopy(language);
  const model = useRelationOutputs(relationId);
  const { editing, showExcluded } = useCanvasOutputPresentation();
  const command = useRelationCommand(relationId, onChange);
  const editable = editing && !disabled && model != null && !model.physical;
  const canChange = editable && command.state !== 'busy';
  const [localNames, setLocalNames] = useState<Readonly<Record<string, string>>>({});
  const [rowOrder, setRowOrder] = useState<readonly number[] | null>(null);
  const drafts = {
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
  const rows = [...selected, ...(model?.slots ?? []).filter((field) => field.output == null)];
  if (rowOrder != null)
    rows.sort(
      (a, b) =>
        (rowOrder.indexOf(a.slot) < 0 ? Infinity : rowOrder.indexOf(a.slot)) -
        (rowOrder.indexOf(b.slot) < 0 ? Infinity : rowOrder.indexOf(b.slot))
    );
  const update = (next: typeof outputs, order?: readonly number[]) => {
    if (canChange) {
      const previousOrder = rowOrder;
      if (order != null) setRowOrder(order);
      void command
        .execute((session, request) =>
          changeSelectedRelationOutputs(session, { ...request, outputs: next })
        )
        .then((accepted) => {
          if (!accepted && order != null)
            setRowOrder((current) => (current === order ? previousOrder : current));
        });
    }
  };
  const reorder = useInspectorListReorder({
    orderedIds: outputIds,
    visibleIds: outputIds,
    enabled: canChange,
    onMove: (movedId, targetId, placement) => {
      const sourceIndex = outputIds.indexOf(movedId);
      if (sourceIndex < 0) return;
      const next = [...outputs];
      const [moved] = next.splice(sourceIndex, 1);
      const targetIndex = outputIds.filter((id) => id !== movedId).indexOf(targetId);
      if (moved == null || targetIndex < 0) return;
      next.splice(targetIndex + (placement === 'after' ? 1 : 0), 0, moved);
      update(next, [
        ...next.map((field) => field.slot),
        ...rows.filter((field) => field.output == null).map((field) => field.slot),
      ]);
    },
  });
  if (model == null) return null;
  return (
    <section className="space-y-2" data-slot="canvas-relation-outputs">
      {(orderingOnly || !showExcluded ? selected : rows).map((field) => {
        const key = field.output?.fieldId ?? field.key;
        const canReorder = editable && field.output != null;
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
            orderingOnly={orderingOnly || !editing}
            key={`${relationId}:${field.slot}`}
            field={field}
            copy={copy}
            name={name}
            error={error}
            onNameChange={(value) => drafts.onChange(key, value)}
            disabled={!editable}
            busy={command.state === 'busy'}
            draggable={canReorder}
            dropPlacement={reorder.dropPlacement(key)}
            reorderLabel={editorCopy.reorderOutput}
            reorderHint={editorCopy.reorderOutputHint}
            inclusionLabel={
              field.output == null ? editorCopy.addOutputField : editorCopy.removeOutputField
            }
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
            onInclude={(included) => {
              const order = rows.map((row) => row.slot);
              update(
                included
                  ? [...outputs, { slot: field.slot, alias: field.name }].sort(
                      (a, b) => order.indexOf(a.slot) - order.indexOf(b.slot)
                    )
                  : outputs.filter((output) => output.slot !== field.slot),
                order
              );
            }}
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
