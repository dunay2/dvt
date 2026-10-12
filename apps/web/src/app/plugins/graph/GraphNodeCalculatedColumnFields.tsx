/** Passive fields for the calculated-column form; commands remain in its controller. */
import type { ReactElement } from 'react';
import {
  CALCULATION_KINDS,
  type CalculationKind,
  type GraphNodeCalculatedColumnFieldsModel,
} from './graphNodeCalculatedColumnFormModel';
import { graphNodeColumnClasses as styles } from './graphColumnVisualTokens';

export function GraphNodeCalculatedColumnFields({
  model,
}: {
  model: GraphNodeCalculatedColumnFieldsModel;
}): ReactElement {
  const { copy, draft, change, error, errorId, refs } = model;
  return (
    <form
      onSubmit={(event) => {
        void model.submit(event);
      }}
      className={styles.addFormFields}
    >
      <label className={styles.addLabel}>
        {copy.calculatedColumnKindLabel}
        <select
          name="kind"
          value={draft.kind}
          onChange={(event) => change('kind', event.target.value as CalculationKind)}
          className={styles.addControl}
        >
          {CALCULATION_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {copy.calculatedColumnKindLabels[kind]}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.addLabel}>
        {copy.calculatedColumnAliasLabel}
        <input
          ref={refs.alias}
          name="alias"
          required
          value={draft.alias}
          aria-invalid={error?.field === 'alias' ? 'true' : undefined}
          aria-describedby={error?.field === 'alias' ? errorId : undefined}
          onChange={(event) => change('alias', event.target.value)}
          className={styles.addControl}
        />
      </label>
      {draft.kind === 'string-literal' || draft.kind === 'timestamp-literal' ? (
        <label className={styles.addLabel}>
          {copy.calculatedColumnValueLabel}
          <input
            ref={refs.value}
            name="value"
            required={draft.kind === 'timestamp-literal'}
            value={draft.value}
            aria-invalid={error?.field === 'value' ? 'true' : undefined}
            aria-describedby={error?.field === 'value' ? errorId : undefined}
            onChange={(event) => change('value', event.target.value)}
            className={styles.addControl}
          />
        </label>
      ) : (
        <label className={styles.addLabel}>
          {draft.kind === 'row-number'
            ? copy.calculatedColumnOrderLabel
            : copy.calculatedColumnInputLabel}
          <select
            ref={refs.input}
            name="inputFieldId"
            value={draft.inputFieldId}
            aria-invalid={error?.field === 'input' ? 'true' : undefined}
            aria-describedby={error?.field === 'input' ? errorId : undefined}
            onChange={(event) => change('inputFieldId', event.target.value)}
            className={styles.addControl}
          >
            {model.inputColumns.map((column) => (
              <option key={column.id ?? column.name} value={column.id ?? column.name}>
                {column.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {draft.kind === 'scalar-function' ? (
        <label className={styles.addLabel}>
          {copy.calculatedColumnFunctionLabel}
          <select
            name="capabilityId"
            value={draft.capabilityId}
            onChange={(event) => change('capabilityId', event.target.value)}
            className={styles.addControl}
          >
            {model.functions.map((item) => (
              <option key={item.capabilityId} value={item.capabilityId}>
                {item.name.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className={styles.expressionComposerError}>
          {error.message}
        </p>
      ) : null}
      <div className={styles.addActions}>
        <button type="button" onClick={model.cancel} className={styles.addCancel}>
          {copy.calculatedColumnCancelLabel}
        </button>
        <button
          type="submit"
          disabled={model.pending || !model.canSubmit}
          className={styles.addSubmit}
        >
          {copy.calculatedColumnSubmitLabel}
        </button>
      </div>
    </form>
  );
}
