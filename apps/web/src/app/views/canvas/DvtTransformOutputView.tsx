/** Owned concern: present canonical Substrait first and derive outputs only on explicit selection. */
import { useEffect, useRef, useState, type ChangeEvent } from 'react';

import { inspectorVisualClasses } from '../../components/inspector/inspectorVisualTokens';
import { MonacoCodeViewer } from '../../components/monaco/MonacoCodeViewer';
import { monacoVisualClasses } from '../../components/monaco/monacoVisualTokens';
import { cn } from '../../components/ui/utils';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { CanvasViewCopy } from './canvasCopy.types';
import { projectDvtSubstraitTransformOutputToPostgresSql } from './canvasDvtSubstraitOutputProjection';

type TransformOutputViewId = 'substrait' | 'postgres-sql';
type DerivedSqlState =
  | Readonly<{ status: 'idle' | 'loading' }>
  | Readonly<{ status: 'ready'; sql: string }>
  | Readonly<{ status: 'error' }>;

export type DvtTransformOutputViewProps = Readonly<{
  transformNode: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  canonicalContent: string;
  canonicalDescription?: string;
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
  canonicalDescription,
  copy,
}: DvtTransformOutputViewProps): JSX.Element {
  const [activeView, setActiveView] = useState<TransformOutputViewId>('substrait');
  const [derivedSql, setDerivedSql] = useState<DerivedSqlState>({ status: 'idle' });
  const requestId = useRef(0);

  useEffect(
    () => () => {
      requestId.current += 1;
    },
    []
  );

  const selectOutputView = (event: ChangeEvent<HTMLSelectElement>): void => {
    const nextView = event.currentTarget.value as TransformOutputViewId;
    setActiveView(nextView);
    if (nextView === 'substrait' || derivedSql.status === 'ready') return;

    const currentRequestId = ++requestId.current;
    setDerivedSql({ status: 'loading' });
    void projectDvtSubstraitTransformOutputToPostgresSql({ transformNode, nodes, edges }).then(
      (sql) => {
        if (requestId.current === currentRequestId) setDerivedSql({ status: 'ready', sql });
      },
      () => {
        if (requestId.current === currentRequestId) setDerivedSql({ status: 'error' });
      }
    );
  };

  return (
    <div data-slot="dvt-transform-output-view" className="flex min-h-0 flex-1 flex-col gap-3">
      <label className="block space-y-1 text-xs text-(--text-muted)">
        <span>{copy.inspectorTransformOutputViewLabel}</span>
        <select
          data-slot="dvt-transform-output-view-selector"
          className={inspectorVisualClasses.inspectorSelectInput}
          value={activeView}
          onChange={selectOutputView}
        >
          <option value="substrait">{copy.inspectorTransformOutputSubstraitLabel}</option>
          <option value="postgres-sql">{copy.inspectorTransformOutputPostgresSqlLabel}</option>
        </select>
      </label>

      {canonicalDescription == null ? null : (
        <p className={inspectorVisualClasses.contextPanelSectionDescription}>
          {canonicalDescription}
        </p>
      )}

      {activeView === 'substrait' ? (
        <MonacoCodeViewer
          ariaLabel={copy.inspectorTransformOutputSubstraitLabel}
          language="json"
          loadingLabel={copy.inspectorTransformOutputSubstraitLabel}
          containerClassName={cn(monacoVisualClasses.surface, 'h-auto min-h-0 flex-1')}
          value={canonicalContent}
        />
      ) : derivedSql.status === 'ready' ? (
        <MonacoCodeViewer
          ariaLabel={copy.inspectorTransformOutputPostgresSqlLabel}
          language="sql"
          loadingLabel={copy.inspectorTransformOutputPostgresSqlLabel}
          containerClassName={cn(monacoVisualClasses.surface, 'h-auto min-h-0 flex-1')}
          value={derivedSql.sql}
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
