/** Owned concern: present compact, accessible model commands using shared visual tokens. */
import { Hammer, LoaderCircle, Play } from 'lucide-react';
import { useId } from 'react';
import { Link } from 'react-router';

import { Button } from '../../components/ui/button';
import { resolveCodeModelCommandCopy } from './codeViewCopy';
import styles from './CodeModelCommandBar.module.css';

export type CodeModelCommandBarProps = Readonly<{
  language: string;
  modelName: string;
  synchronized: boolean;
  compiled: boolean;
  unavailable: boolean;
  blockedReason: string;
  phase: 'idle' | 'compiling' | 'running';
  canCompile: boolean;
  canExecute: boolean;
  runId?: string;
  compile: () => Promise<void>;
  execute: () => Promise<void>;
}>;

/** Compile and Run share a toolbar; only an accepted current plan enables execution. */
export function CodeModelCommandBar(props: CodeModelCommandBarProps) {
  const copy = resolveCodeModelCommandCopy(props.language);
  const descriptionId = useId();
  const status =
    props.phase === 'compiling'
      ? copy.compiling
      : props.phase === 'running'
        ? copy.running
        : !props.synchronized
          ? copy.saveFirst
          : props.unavailable
            ? props.blockedReason
            : props.compiled
              ? copy.ready
              : copy.compileFirst;
  return (
    <div
      className={styles.bar}
      role="group"
      aria-label={`${copy.commands}: ${props.modelName}`}
      data-slot="code-model-commands"
    >
      <div className={styles.actions}>
        <Button
          type="button"
          className={styles.command}
          variant="outline"
          size="sm"
          data-slot="code-compile-model"
          disabled={!props.canCompile}
          aria-describedby={descriptionId}
          onClick={() => void props.compile()}
        >
          {props.phase === 'compiling' ? (
            <LoaderCircle className={styles.spinner} />
          ) : (
            <Hammer aria-hidden="true" />
          )}
          {copy.compile}
        </Button>
        <Button
          type="button"
          className={styles.command}
          size="sm"
          data-slot="code-execute-model"
          disabled={!props.canExecute}
          aria-describedby={descriptionId}
          onClick={() => void props.execute()}
        >
          {props.phase === 'running' ? (
            <LoaderCircle className={styles.spinner} />
          ) : (
            <Play aria-hidden="true" />
          )}
          {copy.execute}
        </Button>
      </div>
      <span className={styles.status} id={descriptionId} role="status" title={copy.scope}>
        {status}
      </span>
      {props.runId === undefined ? null : (
        <Link className={styles.runLink} to={`/runs/${encodeURIComponent(props.runId)}`}>
          {copy.viewRun}
        </Link>
      )}
    </div>
  );
}
