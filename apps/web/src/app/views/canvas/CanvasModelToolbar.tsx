/** Passive session status and explicit Apply/Cancel host. */
import type { CanvasDraftStatusState } from './canvasDraftStatusState';
import { Code2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import styles from './model-sql/CanvasModelSqlPanel.module.css';

export function CanvasModelToolbar({
  data,
  actions,
}: Readonly<{
  data: Readonly<{
    modelName: string;
    draftStatus: CanvasDraftStatusState;
    sqlLabel?: string;
    sqlOpen?: boolean;
    sqlPanelId?: string;
  }>;
  actions: Readonly<{
    onActionsHost: (host: HTMLDivElement | null) => void;
    onToggleSql?: () => void;
  }>;
}>) {
  return (
    <footer
      data-slot="canvas-model-toolbar"
      className="flex min-h-6 shrink-0 flex-wrap items-center justify-end gap-x-3 border-t border-(--border-subtle) bg-(--surface-shell) px-3 py-0.5"
    >
      <h1 className="sr-only">{data.modelName}</h1>
      {actions.onToggleSql != null ? (
        <Button
          className={styles.toggle}
          variant="ghost"
          size="sm"
          aria-label={data.sqlLabel}
          title={data.sqlLabel}
          aria-expanded={data.sqlOpen}
          aria-controls={data.sqlPanelId}
          onClick={actions.onToggleSql}
        >
          <Code2 className={styles.icon} aria-hidden="true" />
          SQL
        </Button>
      ) : null}
      <span
        role="status"
        data-tone={data.draftStatus.tone}
        data-slot="canvas-model-save-status"
        className={styles.status}
      >
        {data.draftStatus.label}
      </span>
      <div
        ref={actions.onActionsHost}
        data-slot="canvas-model-actions"
        className="flex items-center empty:hidden"
      />
    </footer>
  );
}
