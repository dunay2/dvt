/** Stable Explorer/editor frame; output composition preserves Monaco identity. */
import type { ComponentProps, ReactNode } from 'react';
import { CanvasExplorer } from '../canvas/explorer/CanvasExplorer';
import { SqlWorksheetExplorer } from './SqlWorksheetExplorer';
import { SqlWorksheetMonaco } from './SqlWorksheetMonaco';
import styles from './SqlWorksheet.module.css';

type Props = Readonly<{
  editor: ComponentProps<typeof SqlWorksheetMonaco>;
  explorer: ComponentProps<typeof SqlWorksheetExplorer>;
  children: ReactNode;
}>;

export function SqlWorksheetWorkbench({ editor, explorer, children }: Props): JSX.Element {
  return (
    <div className={styles.workbench}>
      <CanvasExplorer
        openerId="sql-worksheet-explorer-toggle"
        elements={<SqlWorksheetExplorer {...explorer} />}
      >
        <main className={styles.main}>
          <SqlWorksheetMonaco {...editor} />
          {children}
        </main>
      </CanvasExplorer>
    </div>
  );
}
