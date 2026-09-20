/** Owned concern: a focused, discardable operator form over the canonical draft. */
import { useState } from 'react';
import { SortField_SortDirection } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import type { DvtSubstraitSortDirection } from '@dvt/postgres-projection';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../components/ui/dialog';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import type { DvtSubstraitProjectionDraft } from './canvasDvtSubstraitProjection';
import type { CanvasRelationalOperatorTool } from './canvasRelationalTreeOperatorModel';
import { applyCanvasRelationalOperatorTool } from './canvasRelationalTreeOperatorCommands';

const control =
  'mt-1 w-full rounded border border-(--border-subtle) bg-(--surface-panel) px-3 py-2 text-sm text-(--text-strong)';
export function CanvasRelationalTreeOperatorForm({
  tool,
  draft,
  title,
  onClose,
  onChange,
  inline = false,
  targetRelationId,
}: Readonly<{
  tool: CanvasRelationalOperatorTool;
  draft: DvtSubstraitProjectionDraft;
  title: string;
  onClose: () => void;
  onChange: (draft: DvtSubstraitProjectionDraft) => void;
  inline?: boolean;
  targetRelationId?: string;
}>): JSX.Element {
  const es = useApplicationLanguageStore((state) => state.language) === 'es';
  const [fieldId, setFieldId] = useState(tool.fieldId ?? tool.fields[0]?.fieldId ?? '');
  const [alias, setAlias] = useState(tool.alias ?? (tool.id === 'window' ? 'row_number' : 'total'));
  const [value, setValue] = useState(tool.value ?? '');
  const [capabilityId, setCapabilityId] = useState(
    tool.capabilityId ?? tool.comparisons?.[0]?.capabilityId ?? ''
  );
  const [sortKeys, setSortKeys] = useState(
    tool.sortKeys?.length
      ? [...tool.sortKeys]
      : tool.fields[0] == null
        ? []
        : [
            {
              fieldId: tool.fields[0].fieldId,
              direction: SortField_SortDirection.ASC_NULLS_LAST as DvtSubstraitSortDirection,
            },
          ]
  );
  const [offset, setOffset] = useState(tool.offset == null ? '' : String(tool.offset));
  const [count, setCount] = useState(tool.count == null ? '' : String(tool.count));
  const [error, setError] = useState(false);
  const commit = (remove = false) => {
    let parsedOffset: bigint | undefined;
    let parsedCount: bigint | undefined;
    try {
      parsedOffset = offset.trim() === '' ? undefined : BigInt(offset);
      parsedCount = count.trim() === '' ? undefined : BigInt(count);
    } catch {
      setError(true);
      return;
    }
    const next = applyCanvasRelationalOperatorTool(draft, {
      tool: tool.id,
      fieldId,
      alias,
      value,
      capabilityId,
      sortKeys,
      offset: parsedOffset,
      count: parsedCount,
      targetRelationId,
      remove,
    });
    if (next === draft) {
      setError(true);
      return;
    }
    onChange(next);
    onClose();
  };
  const form = (
    <form
      data-slot={inline ? 'canvas-relational-operator-form' : undefined}
      className="space-y-4 text-sm"
      onSubmit={(event) => {
        event.preventDefault();
        commit();
      }}
    >
      {tool.id === 'sort' ? (
        <fieldset className="space-y-2">
          <legend className="font-medium">
            {es ? 'Claves en orden de prioridad' : 'Keys in priority order'}
          </legend>
          {sortKeys.map((key, index) => (
            <div
              key={index}
              className="grid grid-cols-[minmax(0,1fr)_minmax(10rem,auto)_auto] gap-2"
            >
              <select
                aria-label={`${es ? 'Campo' : 'Field'} ${index + 1}`}
                className={control}
                value={key.fieldId}
                onChange={(event) =>
                  setSortKeys((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, fieldId: event.target.value } : item
                    )
                  )
                }
              >
                {tool.fields.map((field) => (
                  <option key={field.fieldId} value={field.fieldId}>
                    {field.name}
                  </option>
                ))}
              </select>
              <select
                aria-label={`${es ? 'Dirección y nulos' : 'Direction and nulls'} ${index + 1}`}
                className={control}
                value={key.direction}
                onChange={(event) =>
                  setSortKeys((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index
                        ? {
                            ...item,
                            direction: Number(event.target.value) as DvtSubstraitSortDirection,
                          }
                        : item
                    )
                  )
                }
              >
                <option value={SortField_SortDirection.ASC_NULLS_FIRST}>ASC · NULLS FIRST</option>
                <option value={SortField_SortDirection.ASC_NULLS_LAST}>ASC · NULLS LAST</option>
                <option value={SortField_SortDirection.DESC_NULLS_FIRST}>DESC · NULLS FIRST</option>
                <option value={SortField_SortDirection.DESC_NULLS_LAST}>DESC · NULLS LAST</option>
              </select>
              <button
                type="button"
                className="mt-1 rounded border border-(--border-subtle) px-2"
                disabled={sortKeys.length === 1}
                aria-label={es ? 'Quitar clave' : 'Remove key'}
                onClick={() =>
                  setSortKeys((current) => current.filter((_, itemIndex) => itemIndex !== index))
                }
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            className="rounded border border-(--border-subtle) px-3 py-2"
            disabled={sortKeys.length >= tool.fields.length}
            onClick={() => {
              const field = tool.fields.find(
                (candidate) => !sortKeys.some((key) => key.fieldId === candidate.fieldId)
              );
              if (field == null) return;
              setSortKeys((current) => [
                ...current,
                {
                  fieldId: field.fieldId,
                  direction: SortField_SortDirection.ASC_NULLS_LAST,
                },
              ]);
            }}
          >
            {es ? 'Añadir clave' : 'Add key'}
          </button>
        </fieldset>
      ) : tool.id === 'fetch' ? (
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            OFFSET
            <input
              className={control}
              inputMode="numeric"
              value={offset}
              placeholder="0"
              onChange={(event) => setOffset(event.target.value)}
            />
          </label>
          <label className="block">
            LIMIT
            <input
              className={control}
              inputMode="numeric"
              value={count}
              placeholder={es ? 'Sin límite' : 'Unlimited'}
              onChange={(event) => setCount(event.target.value)}
            />
          </label>
        </div>
      ) : tool.id === 'window' && tool.order != null ? (
        <div className="rounded border border-(--border-subtle) p-3 font-mono text-[13px]">
          ROW_NUMBER()
          <br />
          ORDER BY {tool.order} DESC NULLS LAST,
          <br />
          {tool.tieBreaker} ASC NULLS LAST
        </div>
      ) : (
        <label className="block">
          {tool.id === 'window'
            ? 'ORDER BY · ASC NULLS LAST'
            : tool.id === 'aggregate'
              ? 'GROUP BY'
              : es
                ? 'Campo'
                : 'Field'}
          <select
            className={control}
            value={fieldId}
            disabled={tool.id === 'aggregate' && tool.active}
            onChange={(event) => setFieldId(event.target.value)}
            required
          >
            {tool.fields.map((field) => (
              <option key={field.fieldId} value={field.fieldId}>
                {field.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {tool.id === 'filter' ? (
        <>
          <label className="block">
            {es ? 'Comparación' : 'Comparison'}
            <select
              className={control}
              value={capabilityId}
              onChange={(event) => setCapabilityId(event.target.value)}
            >
              {tool.comparisons?.map((comparison) => (
                <option key={comparison.capabilityId} value={comparison.capabilityId}>
                  {comparison.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            {es ? 'Valor de texto' : 'Text value'}
            <input
              className={control}
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
          </label>
        </>
      ) : tool.id === 'sort' || tool.id === 'fetch' ? null : (
        <label className="block">
          {es ? 'Nombre del resultado' : 'Result name'}
          <input
            className={control}
            value={alias}
            onChange={(event) => setAlias(event.target.value)}
            required
          />
        </label>
      )}
      {tool.id === 'aggregate' ? <p className="text-(--text-muted)">COUNT(*) → {alias}</p> : null}
      {error ? (
        <p role="alert" className="text-amber-400">
          {es
            ? 'Revisa los campos y valores. No se admiten claves repetidas, negativos, fracciones ni overflow i64.'
            : 'Check fields and values. Duplicate keys, negatives, fractions, and i64 overflow are not admitted.'}
        </p>
      ) : null}
      <div className="flex items-center justify-end gap-2">
        {tool.active ? (
          <button
            type="button"
            className="mr-auto rounded px-3 py-2 text-rose-400 hover:bg-rose-950"
            onClick={() => commit(true)}
          >
            {es ? 'Retirar operación' : 'Remove operation'}
          </button>
        ) : null}
        <button
          type="button"
          className="rounded border border-(--border-subtle) px-3 py-2"
          onClick={onClose}
        >
          {es ? 'Cancelar' : 'Cancel'}
        </button>
        <button type="submit" className="rounded bg-blue-600 px-3 py-2 text-white">
          {es ? 'Aceptar' : 'Done'}
        </button>
      </div>
    </form>
  );
  if (inline) return form;
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-lg" data-slot="canvas-relational-operator-form">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {es
              ? 'Sobre la salida actual del modelo. Los cambios permanecen en el borrador.'
              : 'On the current model output. Changes remain in the draft.'}
          </DialogDescription>
        </DialogHeader>
        {form}
      </DialogContent>
    </Dialog>
  );
}
