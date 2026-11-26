/** Present a complete Canvas proposal and confirm it through the existing single save port. */
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import type { SqlWorksheetConversionProps } from './sqlWorksheet.types';
import { useWorksheetCanvasModel } from './useWorksheetCanvasModel';
import { worksheetCanvasModelMessages } from './worksheetCanvasModelMessages';
import styles from './SqlWorksheetConversion.module.css';

type Copy = typeof worksheetCanvasModelMessages.en | typeof worksheetCanvasModelMessages.es;
type ModelState = ReturnType<typeof useWorksheetCanvasModel>;

function CanvasModelReceipt({
  receipt,
  copy,
}: Readonly<{ receipt: NonNullable<ModelState['receipt']>; copy: Copy }>) {
  if (receipt.kind === 'saved')
    return (
      <p role="status">
        {copy.created}: <strong>{receipt.name}</strong>
      </p>
    );
  const message =
    receipt.kind === 'unknown'
      ? copy.unknown
      : receipt.kind === 'conflict' || receipt.kind === 'idempotency_mismatch'
        ? copy.conflict
        : receipt.kind === 'denied'
          ? copy.denied
          : receipt.kind === 'authoring_authority_conflict'
            ? copy.authority
            : copy.unsupported;
  return <p role="alert">{message}</p>;
}

function CanvasProposalConfirmation({ state, copy }: Readonly<{ state: ModelState; copy: Copy }>) {
  if (!state.prepared) return null;
  return (
    <section aria-label={copy.columns}>
      <p>
        {copy.confirmation} <strong>{state.prepared.name}</strong>
      </p>
      <ul>
        {state.prepared.columns.map((column) => (
          <li key={column.id}>
            <code>{column.name}</code>
            {column.dataType == null ? '' : ` · ${column.dataType}`}
          </li>
        ))}
      </ul>
      <Button
        type="button"
        disabled={state.busy || !state.canConfirm}
        onClick={() => {
          void state.confirm();
        }}
      >
        {state.phase === 'saving'
          ? copy.busy
          : state.receipt?.kind === 'unknown'
            ? copy.retry
            : copy.confirm}
      </Button>
    </section>
  );
}

function CanvasProposalFeedback({ state, copy }: Readonly<{ state: ModelState; copy: Copy }>) {
  if (state.receipt) return <CanvasModelReceipt receipt={state.receipt} copy={copy} />;
  if (!state.error) return null;
  return (
    <p role="alert">
      {copy[state.error]}
      {state.diagnostics.map((message) => (
        <span key={message}> {message}</span>
      ))}
    </p>
  );
}

function CanvasDestinationNotice({
  props,
  copy,
}: Readonly<{ props: SqlWorksheetConversionProps; copy: Copy }>) {
  if (props.connection?.type === 'postgres' && props.record != null) return null;
  return <p role="status">{copy.context}</p>;
}

export function WorksheetCanvasModelForm(
  props: SqlWorksheetConversionProps & Readonly<{ onBusyChange?: (busy: boolean) => void }>
) {
  const language = useApplicationLanguageStore((state) => state.language),
    copy = worksheetCanvasModelMessages[language];
  const state = useWorksheetCanvasModel(props, props.onBusyChange);
  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        void state.prepare();
      }}
    >
      <label className={styles.field}>
        {copy.name}
        <Input
          required
          value={state.name}
          disabled={state.busy || ['saved', 'unknown'].includes(state.receipt?.kind ?? '')}
          onChange={(event) => state.setName(event.currentTarget.value)}
        />
      </label>
      <CanvasDestinationNotice props={props} copy={copy} />
      <Button type="submit" disabled={state.busy || !state.canPrepare}>
        {state.phase === 'proposing' ? copy.busy : copy.prepare}
      </Button>
      <CanvasProposalConfirmation state={state} copy={copy} />
      <CanvasProposalFeedback state={state} copy={copy} />
    </form>
  );
}
