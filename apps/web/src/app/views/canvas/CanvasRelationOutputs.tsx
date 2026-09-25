/** Reusable output selection controller for every analyzed relation. */
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import { DvtSemanticFieldNameV1Schema } from '@dvt/contracts';
import { useEffect, useRef, useState } from 'react';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';
import { useRelationOutputs } from './useRelationOutputs';
import { useRelationCommand } from './useRelationCommand';
import { changeSelectedRelationOutputs } from './canvasSelectedRelationOutputs';
import { RelationOutputRow } from './RelationOutputRow';

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
}: Readonly<{
  relationId: string;
  disabled: boolean;
  onChange: (document: SubstraitDocument) => void;
  names?: RelationOutputNames;
  onPendingChange?: (pending: boolean) => void;
}>) {
  const copy = resolveCanvasViewCopy(useApplicationLanguageStore((state) => state.language));
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
  if (model == null) return null;
  const selected = model.slots
    .filter((field) => field.output != null)
    .sort((a, b) => a.output!.outputOrdinal - b.output!.outputOrdinal);
  const outputs = selected.map((field) => ({ slot: field.slot, alias: field.name }));
  const update = (next: typeof outputs) => {
    if (!disabled && !model.physical)
      void command.execute((session, request) =>
        changeSelectedRelationOutputs(session, { ...request, outputs: next })
      );
  };
  return (
    <section className="space-y-2" data-slot="canvas-relation-outputs">
      <h3 className="text-xs font-semibold">{copy.inspectorDvtSubstraitSelectedFieldsLabel}</h3>
      {[...selected, ...model.slots.filter((field) => field.output == null)].map((field) => {
        const index = selected.indexOf(field);
        const key = field.output?.fieldId ?? field.key;
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
            key={key}
            field={field}
            copy={copy}
            name={name}
            error={error}
            onNameChange={(value) => drafts.onChange(key, value)}
            disabled={disabled || model.physical || command.state === 'busy'}
            first={index === 0}
            last={index === selected.length - 1}
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
            onMove={(offset) => {
              const next = [...outputs];
              const [moved] = next.splice(index, 1);
              next.splice(index + offset, 0, moved!);
              update(next);
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
