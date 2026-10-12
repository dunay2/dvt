/** Shared label/value template for property sections and relationship details. */
import type { ReactNode } from 'react';
import {
  inspectorPropertyClasses as styles,
  inspectorVisualClasses,
} from './inspectorVisualTokens';

export function NodePropertyFacts({
  rows,
  layout = 'workbench',
}: Readonly<{
  rows: readonly Readonly<{ label: string; value: ReactNode }>[];
  layout?: keyof typeof styles.facts;
}>): JSX.Element {
  return (
    <dl className={styles.facts[layout]}>
      {rows.map(({ label, value }) => (
        <div key={label} className={styles.fact}>
          <dt className={inspectorVisualClasses.inspectorLabel}>{label}</dt>
          <dd className={styles.value[layout === 'inspector' ? 'inspector' : 'workbench']}>
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
