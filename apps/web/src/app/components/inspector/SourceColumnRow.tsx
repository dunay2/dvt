/** Owned concern: passive column row and factual badges shared with its detail. */
import { ChevronRight, GripVertical } from 'lucide-react';
import type { ComponentPropsWithRef } from 'react';
import { resolveTypeCue, type SourceColumnFacts } from './sourceColumnFacts';
import type { SourceColumnsCopy } from './sourceColumnsCopy';
import styles from './SourceColumns.module.css';

export function SourceColumnBadges({
  facts,
  copy,
}: Readonly<{ facts: SourceColumnFacts; copy: SourceColumnsCopy }>): JSX.Element {
  return (
    <span className={styles.badges}>
      {facts.primaryKey ? (
        <span
          data-slot="source-column-badge-pk"
          className={styles.primaryKey}
          title={copy.primaryKey}
        >
          PK
        </span>
      ) : null}
      {facts.independentlyUnique && !facts.primaryKey ? (
        <span data-slot="source-column-badge-uk" className={styles.uniqueKey} title={copy.unique}>
          UK
        </span>
      ) : null}
      {facts.column.nullable === false && !facts.primaryKey ? (
        <span data-slot="source-column-badge-nn" className={styles.notNull} title={copy.notNull}>
          NN
        </span>
      ) : null}
    </span>
  );
}

export function SourceColumnSummary({
  facts,
  copy,
}: Readonly<{ facts: SourceColumnFacts; copy: SourceColumnsCopy }>): JSX.Element {
  return (
    <span data-slot="source-column-summary" className={styles.summary}>
      {facts.column.type}
      {facts.column.nullable === false ? ` · ${copy.notNull}` : ''}
    </span>
  );
}

export function SourceColumnRow({
  facts,
  copy,
  buttonProps,
}: Readonly<{
  facts: SourceColumnFacts;
  copy: SourceColumnsCopy;
  buttonProps: ComponentPropsWithRef<'button'>;
}>): JSX.Element {
  return (
    <button
      {...buttonProps}
      type="button"
      role="option"
      data-slot="source-column-row"
      data-column-name={facts.column.name}
      className={styles.row}
    >
      {buttonProps.draggable ? (
        <GripVertical
          data-slot="source-column-drag-handle"
          aria-hidden="true"
          className={styles.grip}
        />
      ) : null}
      <span
        data-slot="source-column-type-cue"
        className={styles.typeCue}
        title={facts.column.type}
        aria-label={facts.column.type}
      >
        {resolveTypeCue(facts.column.type)}
      </span>
      <span className={styles.rowIdentity}>
        <span className={styles.columnName} title={facts.column.name}>
          {facts.column.name}
        </span>
        <SourceColumnSummary facts={facts} copy={copy} />
      </span>
      <SourceColumnBadges facts={facts} copy={copy} />
      <ChevronRight aria-hidden="true" className={styles.chevron} />
      <span
        data-slot="source-column-drop-indicator"
        aria-hidden="true"
        className={styles.dropIndicator}
      />
    </button>
  );
}
