/**
 * Owned concern: present explicit publication-row requests through the shared bounded grid.
 * @baseline GH-3021-RUN-PUBLICATION-SAMPLE: immutable evidence and live rows remain distinct.
 * @decision Render only the current query state, with no fetch or provider dependency here.
 * @consequence Loading and rejected queries cannot display a previous publication's rows.
 * @version 1.0.0
 */
import { OperationalDrawerDataTable } from '../../components/shell/OperationalDrawerDataTable';
import { Button } from '../../components/ui/button';
import type { RunPublicationSampleState } from '../../services/runs/runPublicationSample';
import type { RunPublicationSampleCopy } from './runPublicationSampleCopy';
import styles from './RunPublicationSample.module.css';

export function RunPublicationSampleTemplate({
  state,
  onLoad,
  copy,
}: Readonly<{
  state: RunPublicationSampleState;
  onLoad: () => Promise<void>;
  copy: RunPublicationSampleCopy;
}>) {
  return (
    <section
      className={styles.panel}
      aria-label={copy.title}
      data-slot="run-publication-sample"
      data-status={state.kind}
    >
      <div className={styles.heading}>
        <h3>{copy.title}</h3>
        {state.kind !== 'unavailable' ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-slot="run-publication-sample-load"
            disabled={state.kind === 'loading'}
            onClick={() => {
              void onLoad();
            }}
          >
            {state.kind === 'ready' ? copy.refresh : copy.load}
          </Button>
        ) : null}
      </div>
      <p className={styles.note}>
        {copy.bounded} {copy.live}
      </p>
      {state.kind === 'unavailable' ? <p className={styles.note}>{copy.unavailable}</p> : null}
      {state.kind === 'loading' ? <p role="status">{copy.loading}</p> : null}
      {state.kind === 'error' ? (
        <p className={styles.error} role="alert">
          {copy.failures[state.reason]}
        </p>
      ) : null}
      {state.kind === 'ready' ? (
        <>
          <p className={styles.note}>
            {copy.queriedAt}:{' '}
            <time dateTime={state.sample.provenance.queriedAt}>
              {state.sample.provenance.queriedAt}
            </time>
          </p>
          {state.sample.rows.length === 0 ? <p>{copy.empty}</p> : null}
          {state.sample.truncated ? <p className={styles.note}>{copy.truncated}</p> : null}
          <div className={styles.table}>
            <OperationalDrawerDataTable
              caption={copy.caption}
              columns={state.sample.columns}
              rows={state.sample.rows}
              nullValueLabel={copy.nullValue}
            />
          </div>
        </>
      ) : null}
    </section>
  );
}
