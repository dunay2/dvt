/** Owned concern: controlled, ordered sort-key inputs; no draft mutation. */
import { SortField_SortDirection } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import type { DvtSubstraitSortDirection, DvtSubstraitSortKey } from '@dvt/postgres-projection';
import type { CanvasRelationalOperatorTool } from '../canvasRelationalTreeOperatorModel';
import type { OperatorFormCopy } from './operatorFormCopy';

export function SortKeyFields({
  fields,
  keys,
  copy,
  onChange,
}: Readonly<{
  fields: CanvasRelationalOperatorTool['fields'];
  keys: readonly DvtSubstraitSortKey[];
  copy: OperatorFormCopy;
  onChange: (keys: readonly DvtSubstraitSortKey[]) => void;
}>): JSX.Element {
  return (
    <fieldset className="space-y-2">
      <legend className="font-medium">{copy.priority}</legend>
      {keys.map((key, index) => (
        <div key={index} className="grid grid-cols-[minmax(0,1fr)_minmax(10rem,auto)_auto] gap-2">
          <select
            aria-label={`${copy.field} ${index + 1}`}
            value={key.fieldId}
            onChange={(event) =>
              onChange(
                keys.map((item, i) =>
                  i === index ? { ...item, fieldId: event.target.value } : item
                )
              )
            }
          >
            {fields.map((field) => (
              <option key={field.fieldId} value={field.fieldId}>
                {field.name}
              </option>
            ))}
          </select>
          <select
            aria-label={`${copy.direction} ${index + 1}`}
            value={key.direction}
            onChange={(event) =>
              onChange(
                keys.map((item, i) =>
                  i === index
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
            disabled={keys.length === 1}
            aria-label={copy.removeKey}
            onClick={() => onChange(keys.filter((_, i) => i !== index))}
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        className="rounded border border-(--border-subtle) px-3 py-2"
        disabled={keys.length >= fields.length}
        onClick={() => {
          const field = fields.find(
            (candidate) => !keys.some((key) => key.fieldId === candidate.fieldId)
          );
          if (field != null)
            onChange([
              ...keys,
              {
                fieldId: field.fieldId,
                direction: SortField_SortDirection.ASC_NULLS_LAST,
              },
            ]);
        }}
      >
        {copy.addKey}
      </button>
    </fieldset>
  );
}
