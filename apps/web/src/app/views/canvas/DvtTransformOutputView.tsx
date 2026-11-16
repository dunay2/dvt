/** Owned concern: present canonical Substrait first and derive outputs only on explicit selection. */
import { useState, type ChangeEvent } from 'react';

import { inspectorVisualClasses } from '../../components/inspector/inspectorVisualTokens';
import { MonacoCodeViewer } from '../../components/monaco/MonacoCodeViewer';
import { monacoVisualClasses } from '../../components/monaco/monacoVisualTokens';
import { cn } from '../../components/ui/utils';
import type { CanvasViewCopy } from './canvasCopy.types';
import type { DvtSubstraitTransformOutputProjectionArgs } from './canvasDvtSubstraitOutputProjection';
import { useCanvasTransformSqlOutput } from './useCanvasTransformSqlOutput';
import { CanvasSqlPresentationResult } from './CanvasSqlPresentationResult';

type TransformOutputViewId = 'substrait' | 'postgres-sql';

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
  codeProjection,
}: DvtTransformOutputViewProps): JSX.Element {
  const [activeView, setActiveView] = useState<TransformOutputViewId>('substrait');
  const {
    state: derivedSql,
    isCurrent: isCurrentProjection,
    request,
  } = useCanvasTransformSqlOutput({ transformNode, nodes, edges, codeProjection });
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
            value: derivedSql.result.sql,
          }
        : null;

  const selectOutputView = (event: ChangeEvent<HTMLSelectElement>): void => {
    const nextView = event.currentTarget.value as TransformOutputViewId;
    setActiveView(nextView);
    if (nextView === 'substrait' || (isCurrentProjection && derivedSql.status === 'loading'))
      return;

    request();
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
        selectedView === 'postgres-sql' && derivedSql.status === 'ready' ? (
          <CanvasSqlPresentationResult result={derivedSql.result}>
            {(sql) => (
              <MonacoCodeViewer
                ariaLabel={displayedCode.label}
                language="sql"
                loadingLabel={displayedCode.label}
                containerClassName={cn(monacoVisualClasses.surface, monacoVisualClasses.flexFill)}
                value={sql}
              />
            )}
          </CanvasSqlPresentationResult>
        ) : (
          <MonacoCodeViewer
            ariaLabel={displayedCode.label}
            language={displayedCode.language}
            loadingLabel={displayedCode.label}
            containerClassName={cn(monacoVisualClasses.surface, monacoVisualClasses.flexFill)}
            value={displayedCode.value}
          />
        )
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
