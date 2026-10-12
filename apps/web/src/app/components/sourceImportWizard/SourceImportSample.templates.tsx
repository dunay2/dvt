/**
 * Owned concern: present source sample state with existing localized grid controls.
 * @baseline ADR-0044: diagnostic prose is not a semantic contract.
 * @decision Translate typed failures; never display provider diagnostics or initiate reads.
 * @consequence One bounded grid serves inspection without changing import selection.
 * @version 1.0.0
 */
import { Button } from '../ui/button';
import { OperationalDrawerDataTable } from '../shell/OperationalDrawerDataTable';
import { useSourceImportLocalization } from './copy';
import type { SourceImportSampleState } from './SourceImportSample';
import styles from './SourceImportWorkspace.module.css';

export function SourceImportSampleTemplate({
  state,
  name,
  onRequest,
}: Readonly<{
  state: SourceImportSampleState;
  name: string;
  onRequest: () => void;
}>): JSX.Element {
  const { copy } = useSourceImportLocalization();
  return (
    <section className={styles.sample} aria-label={copy.sample.title}>
      <Button variant="ghost" onClick={onRequest} disabled={state.status === 'loading'}>
        {state.status === 'loading' ? copy.sample.loading : copy.sample.action}
      </Button>
      <p className={styles.description}>{copy.sample.notice}</p>
      {state.status === 'error' ? <p role="alert">{copy.sample.failures[state.reason]}</p> : null}
      {state.status === 'ready' ? (
        <>
          <time className={styles.description} dateTime={state.sample.provenance.queriedAt}>
            {state.sample.provenance.queriedAt}
          </time>
          <OperationalDrawerDataTable
            caption={name}
            columns={state.sample.columns}
            rows={state.sample.rows}
            nullValueLabel="NULL"
          />
        </>
      ) : null}
    </section>
  );
}
