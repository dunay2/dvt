/** Owned concern: present the operation SQL syntax action and its outcome. */
import { Hammer } from 'lucide-react';

import { Button } from '../../components/ui/button';
import { cn } from '../../components/ui/utils';
import type { CodeViewCopy } from './codeViewCopy';
import type { OperationSqlCompilation } from './useOperationSqlCompilation';
import styles from './CodeModelCommandBar.module.css';

export function OperationSqlCompileAction({
  copy,
  result,
  onCompile,
}: Readonly<{
  copy: CodeViewCopy;
  result: OperationSqlCompilation | undefined;
  onCompile: () => void;
}>) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      data-slot="code-compile-operation"
      title={copy.operationCompileHelp}
      disabled={result?.kind === 'checking'}
      onClick={onCompile}
    >
      <Hammer aria-hidden="true" />
      {copy.operationCompileAction}
    </Button>
  );
}

export function OperationSqlCompileFeedback({
  copy,
  result,
}: Readonly<{ copy: CodeViewCopy; result: OperationSqlCompilation | undefined }>) {
  if (result == null) return null;
  const first = result.kind === 'invalid' ? result.diagnostics[0] : undefined;
  const message = first
    ? copy.operationCompileError
        .replace('{line}', String(first.line))
        .replace('{column}', String(first.column))
    : {
        checking: copy.operationCompiling,
        empty: copy.operationCompileEmpty,
        invalid: copy.operationCompileUnavailable,
        unavailable: copy.operationCompileUnavailable,
        valid: copy.operationCompileValid,
      }[result.kind];
  return (
    <div role="status" data-slot="code-operation-compilation-status" className={styles.bar}>
      <span className={cn(styles.status, first && styles.error)}>{message}</span>
      {first ? <span className={styles.status}>{first.message}</span> : null}
    </div>
  );
}
