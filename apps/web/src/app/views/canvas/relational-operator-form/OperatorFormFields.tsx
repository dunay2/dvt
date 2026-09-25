/** Owned concern: compose controlled inputs for each admitted operator. */
import type { CanvasRelationalOperatorTool } from './OperatorTool';
import type { OperatorFormModel } from './useOperatorForm';
import { SortKeyFields } from './SortKeyFields';

export function OperatorFormFields({
  tool,
  form,
}: Readonly<{
  tool: CanvasRelationalOperatorTool;
  form: Pick<OperatorFormModel, 'values' | 'change' | 'copy'>;
}>): JSX.Element {
  const { values, change, copy } = form;
  return (
    <>
      {tool.id === 'sort' ? (
        <SortKeyFields
          fields={tool.fields}
          keys={values.sortKeys}
          copy={copy}
          onChange={(sortKeys) => change({ sortKeys })}
        />
      ) : tool.id === 'fetch' ? (
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            OFFSET
            <input
              inputMode="numeric"
              value={values.offset}
              placeholder="0"
              onChange={(event) => change({ offset: event.target.value })}
            />
          </label>
          <label className="block">
            LIMIT
            <input
              inputMode="numeric"
              value={values.count}
              placeholder={copy.unlimited}
              onChange={(event) => change({ count: event.target.value })}
            />
          </label>
        </div>
      ) : (
        <label className="block">
          {tool.id === 'window' ? 'ORDER BY' : tool.id === 'aggregate' ? 'GROUP BY' : copy.field}
          <select
            value={values.fieldId}
            required
            onChange={(event) => change({ fieldId: event.target.value })}
          >
            {tool.fields.map((field) => (
              <option key={field.fieldId} value={field.fieldId}>
                {field.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {tool.id === 'window' ? (
        <label className="block">
          PARTITION BY
          <select
            multiple
            value={[...values.partitionFieldIds]}
            onChange={(event) =>
              change({
                partitionFieldIds: Array.from(
                  event.currentTarget.selectedOptions,
                  (option) => option.value
                ),
              })
            }
          >
            {tool.fields.map((field) => (
              <option key={field.fieldId} value={field.fieldId}>
                {field.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {tool.id === 'filter' ? (
        <>
          <label className="block">
            {copy.comparison}
            <select
              value={values.capabilityId}
              onChange={(event) => change({ capabilityId: event.target.value })}
            >
              {tool.comparisons?.map((comparison) => (
                <option key={comparison.capabilityId} value={comparison.capabilityId}>
                  {comparison.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            {copy.value}
            <input
              value={values.value}
              onChange={(event) => change({ value: event.target.value })}
            />
          </label>
        </>
      ) : tool.id === 'sort' || tool.id === 'fetch' ? null : (
        <label className="block">
          {copy.result}
          <input
            value={values.alias}
            required
            onChange={(event) => change({ alias: event.target.value })}
          />
        </label>
      )}
      {tool.id === 'aggregate' ? (
        <p className="text-(--text-muted)">COUNT(*) → {values.alias}</p>
      ) : null}
    </>
  );
}
