/** Shared label/value template for property sections and relationship details. */
import type { ReactNode } from 'react';
import { inspectorVisualClasses } from './inspectorVisualTokens';
import styles from './InspectorMetadata.module.css';

export function NodePropertyFacts({
  rows,
  layout = 'workbench',
}: Readonly<{
  rows: readonly Readonly<{ label: string; value: ReactNode }>[];
  layout?: 'inspector' | 'workbench' | 'relationship' | 'compact';
}>): JSX.Element {
  return (
    <dl className={styles.facts} data-layout={layout}>
      {rows.map(({ label, value }) => (
        <div key={label} className={styles.fact}>
          <dt className={inspectorVisualClasses.inspectorLabel}>{label}</dt>
          <dd className={styles.value}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
