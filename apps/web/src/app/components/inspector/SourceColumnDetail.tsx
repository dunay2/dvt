/** Owned concern: passive full-width column facts and drill-in navigation. */
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import type { SourceColumnFacts } from './sourceColumnFacts';
import type { SourceColumnsCopy } from './sourceColumnsCopy';
import { SourceColumnBadges, SourceColumnSummary } from './SourceColumnRow';
import styles from './SourceColumns.module.css';

export function SourceColumnDetail({
  facts,
  copy,
  position,
  count,
  onBack,
  onPrevious,
  onNext,
}: Readonly<{
  facts: SourceColumnFacts | null;
  copy: SourceColumnsCopy;
  position: number;
  count: number;
  onBack: () => void;
  onPrevious: () => void;
  onNext: () => void;
}>): JSX.Element {
  return (
    <section
      data-slot="source-column-detail"
      className={styles.detail}
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        event.stopPropagation();
        onBack();
      }}
    >
      <button
        type="button"
        data-slot="source-columns-back"
        className={styles.navigationButton}
        aria-label={copy.back}
        onClick={onBack}
        autoFocus
      >
        <ArrowLeft aria-hidden="true" />
        {copy.columns}
      </button>
      {facts == null ? (
        <p role="status" className={styles.empty}>
          {copy.unavailable}
        </p>
      ) : (
        <>
          <header className={styles.detailHeading}>
            <div className={styles.rowIdentity}>
              <h3>{facts.column.name}</h3>
              <SourceColumnSummary facts={facts} copy={copy} />
            </div>
            <SourceColumnBadges facts={facts} copy={copy} />
          </header>
          <dl className={styles.facts}>
            <div>
              <dt>{copy.exactType}</dt>
              <dd>{facts.column.type}</dd>
            </div>
            <div>
              <dt>{copy.nullability}</dt>
              <dd>
                {facts.column.nullable == null
                  ? copy.unknown
                  : facts.column.nullable
                    ? copy.nullable
                    : copy.notNull}
              </dd>
            </div>
            <div>
              <dt>{copy.constraints}</dt>
              <dd>
                {facts.primaryKey
                  ? copy.primaryKey
                  : facts.independentlyUnique
                    ? copy.unique
                    : copy.none}
              </dd>
            </div>
          </dl>
        </>
      )}
      <nav className={styles.detailNavigation} aria-label={copy.listLabel}>
        <button
          type="button"
          data-slot="source-column-previous"
          className={styles.navigationButton}
          disabled={position <= 0}
          onClick={onPrevious}
        >
          <ChevronLeft aria-hidden="true" />
          {copy.previous}
        </button>
        <span className={styles.summary} aria-live="polite">
          {position < 0 ? 0 : position + 1} / {count}
        </span>
        <button
          type="button"
          data-slot="source-column-next"
          className={styles.navigationButton}
          disabled={position < 0 || position >= count - 1}
          onClick={onNext}
        >
          {copy.next}
          <ChevronRight aria-hidden="true" />
        </button>
      </nav>
    </section>
  );
}
