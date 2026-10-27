/** Owned concern: present canonical Substrait first and derive outputs only on explicit selection. */
import { useEffect, useRef, useState, type ChangeEvent } from 'react';

import { inspectorVisualClasses } from '../../components/inspector/inspectorVisualTokens';
import { MonacoCodeViewer } from '../../components/monaco/MonacoCodeViewer';
import { monacoVisualClasses } from '../../components/monaco/monacoVisualTokens';
import { cn } from '../../components/ui/utils';
import type { CanvasViewCopy } from './canvasCopy.types';
import {
  projectDvtSubstraitTransformOutputToPostgresSql,
  type DvtSubstraitTransformOutputProjectionArgs,
} from './canvasDvtSubstraitOutputProjection';

type TransformOutputViewId = 'substrait' | 'postgres-sql';
type DerivedSqlState =
  | Readonly<{ status: 'idle' }>
  | Readonly<{ status: 'loading' | 'error'; input: DvtSubstraitTransformOutputProjectionArgs }>
  | Readonly<{ status: 'ready'; sql: string; input: DvtSubstraitTransformOutputProjectionArgs }>;

export type DvtTransformOutputViewProps = DvtSubstraitTransformOutputProjectionArgs &
  Readonly<{
    canonicalContent: string;
    copy: Pick<
      CanvasViewCopy,
      | 'inspectorTransformOutputViewLabel'
      | 'inspectorTransformOutputSubstraitLabel'
      | 'inspectorTransformOutputPostgresSqlLabel'
      | 'inspectorTransformOutputLoadingMessage'
      | 'inspectorTransformOutputErrorMessage'
    >;
  }>;

export function DvtTransformOutputView({
  transformNode,
  nodes,
  edges,
  canonicalContent,
  copy,
}: DvtTransformOutputViewProps): JSX.Element {
  const [activeView, setActiveView] = useState<TransformOutputViewId>('substrait');
  const [derivedSql, setDerivedSql] = useState<DerivedSqlState>({ status: 'idle' });
  const requestId = useRef(0);
  const isCurrentProjection =
    derivedSql.status !== 'idle' &&
    derivedSql.input.transformNode === transformNode &&
    derivedSql.input.nodes === nodes &&
    derivedSql.input.edges === edges;
  const selectedView = isCurrentProjection ? activeView : 'substrait';
  const displayedCode =
    selectedView === 'substrait'
      ? {
          language: 'json',
          label: copy.inspectorTransformOutputSubstraitLabel,
          value: canonicalContent,
        }
      : derivedSql.status === 'ready'
        ? {
            language: 'sql',
            label: copy.inspectorTransformOutputPostgresSqlLabel,
            value: derivedSql.sql,
          }
        : null;

  useEffect(
    () => () => {
      requestId.current += 1;
    },
    []
  );

  const selectOutputView = (event: ChangeEvent<HTMLSelectElement>): void => {
    const nextView = event.currentTarget.value as TransformOutputViewId;
    setActiveView(nextView);
    if (
      nextView === 'substrait' ||
      (isCurrentProjection && (derivedSql.status === 'ready' || derivedSql.status === 'loading'))
    )
      return;

    const currentRequestId = ++requestId.current;
    const input = { transformNode, nodes, edges };
    setDerivedSql({ status: 'loading', input });
    void projectDvtSubstraitTransformOutputToPostgresSql(input).then(
      (sql) => {
        if (requestId.current === currentRequestId) setDerivedSql({ status: 'ready', sql, input });
      },
      () => {
        if (requestId.current === currentRequestId) setDerivedSql({ status: 'error', input });
      }
    );
  };

  return (
    <div
      data-slot="dvt-transform-output-view"
      className={cn('flex min-h-0 flex-1 flex-col gap-2', inspectorVisualClasses.inspectorForm)}
    >
      <label className="flex shrink-0 items-center gap-2 text-xs text-(--text-muted)">
        <span className="shrink-0">{copy.inspectorTransformOutputViewLabel}</span>
        <select
          data-slot="dvt-transform-output-view-selector"
          className={cn(inspectorVisualClasses.inspectorSelectInput, 'min-w-0 flex-1')}
          value={selectedView}
          onChange={selectOutputView}
        >
          <option value="substrait">{copy.inspectorTransformOutputSubstraitLabel}</option>
          <option value="postgres-sql">{copy.inspectorTransformOutputPostgresSqlLabel}</option>
        </select>
      </label>

      {displayedCode != null ? (
        <MonacoCodeViewer
          ariaLabel={displayedCode.label}
          language={displayedCode.language}
          loadingLabel={displayedCode.label}
          containerClassName={cn(monacoVisualClasses.surface, 'h-auto min-h-0 flex-1')}
          value={displayedCode.value}
        />
      ) : (
        <p
          role={derivedSql.status === 'error' ? 'alert' : 'status'}
          className={
            derivedSql.status === 'error'
              ? inspectorVisualClasses.inspectorErrorText
              : inspectorVisualClasses.inspectorMuted
          }
        >
          {derivedSql.status === 'error'
            ? copy.inspectorTransformOutputErrorMessage
            : copy.inspectorTransformOutputLoadingMessage}
        </p>
      )}
    </div>
  );
}
