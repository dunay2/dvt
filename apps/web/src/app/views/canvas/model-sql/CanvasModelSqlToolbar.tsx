/** Present explicit SQL actions on one compact workbench rail. */
import { CheckCheck, Play, Workflow, RefreshCw, X, Square, Code2, Undo2 } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import type { ModelSqlCopy } from './modelSqlCopy';
import type { ModelSqlAction } from './modelSqlDraftState';
import styles from './CanvasModelSqlPanel.module.css';

export function CanvasModelSqlToolbar({
  copy,
  pending,
  ready,
  dirty,
  valid,
  editable,
  actions,
}: Readonly<{
  copy: ModelSqlCopy;
  pending: ModelSqlAction | null;
  ready: boolean;
  dirty: boolean;
  valid: boolean;
  editable: boolean;
  actions: Readonly<{
    validate: () => void;
    execute: () => void;
    generate: () => void;
    refresh: () => void;
    close: () => void;
    cancel: () => void;
    discard: () => void;
  }>;
}>) {
  return (
    <header className={styles.toolbar}>
      <div className={styles.heading}>
        <Code2 className={styles.icon} aria-hidden="true" />
        <h2 className={styles.title}>{copy.title}</h2>
        <span role="status" className={styles.status}>
          {pending != null ? copy.working : dirty ? copy.modified : valid ? copy.valid : copy.ready}
        </span>
      </div>
      <Button
        className={styles.action}
        variant="ghost"
        size="sm"
        title={copy.refresh}
        aria-label={copy.refresh}
        disabled={pending != null}
        onClick={actions.refresh}
      >
        <RefreshCw className={styles.icon} aria-hidden="true" />
      </Button>
      <Button
        className={styles.action}
        variant="ghost"
        size="sm"
        aria-label={copy.validate}
        title={copy.validateHint}
        disabled={!ready || pending != null}
        onClick={actions.validate}
      >
        <CheckCheck className={styles.icon} aria-hidden="true" />
        <span className={styles.actionLabel}>{copy.validate}</span>
      </Button>
      <Button
        className={`${styles.action} ${styles.execute}`}
        variant="ghost"
        size="sm"
        aria-label={copy.execute}
        title={copy.executeHint}
        disabled={!ready || pending != null}
        onClick={actions.execute}
      >
        <Play className={styles.icon} aria-hidden="true" />
        <span className={styles.actionLabel}>{copy.execute}</span>
      </Button>
      <Button
        className={styles.action}
        size="sm"
        aria-label={copy.generate}
        title={copy.generateHint}
        disabled={!ready || !editable || pending != null}
        onClick={actions.generate}
      >
        <Workflow className={styles.icon} aria-hidden="true" />
        <span className={styles.actionLabel}>{copy.generate}</span>
      </Button>
      {pending != null ? (
        <Button
          className={styles.action}
          variant="ghost"
          size="sm"
          aria-label={copy.cancel}
          onClick={actions.cancel}
        >
          <Square className={styles.icon} aria-hidden="true" />
        </Button>
      ) : dirty ? (
        <Button
          className={styles.action}
          variant="ghost"
          size="sm"
          aria-label={copy.discard}
          onClick={actions.discard}
        >
          <Undo2 className={styles.icon} aria-hidden="true" />
        </Button>
      ) : null}
      <Button
        className={styles.action}
        variant="ghost"
        size="sm"
        aria-label={copy.close}
        onClick={actions.close}
      >
        <X className={styles.icon} aria-hidden="true" />
      </Button>
    </header>
  );
}
