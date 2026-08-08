/** Owned concern: render DVT SQL transform authoring fields. */
import type { Dispatch, SetStateAction } from 'react';

import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { buildDvtTransformColumnOptions } from '../../components/inspector/dvtTransformColumnModel';
import { inspectorVisualClasses } from '../../components/inspector/inspectorVisualTokens';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { DvtSqlTransformAuthoringMetadata } from './canvasDvtAuthoringModel';
import { formatCanvasInspectorNodeDraftError } from './canvasCopyFormatting';
import type {
  CanvasInspectorNodeDraft,
  CanvasInspectorNodeDraftErrors,
} from './canvasInspectorAuthoring.types';
import { canvasViewCopy } from './copy';

export function DvtSqlTransformAuthoringSection({
  node,
  nodes,
  edges,
  disabled,
  draft,
  errors,
  section = 'all',
  onChange,
}: Readonly<{
  node: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  disabled: boolean;
  draft: DvtSqlTransformAuthoringMetadata;
  errors: CanvasInspectorNodeDraftErrors['dvt'];
  section?: 'all' | 'columns' | 'code';
  onChange: Dispatch<SetStateAction<CanvasInspectorNodeDraft>>;
}>): JSX.Element {
  const showCode = section === 'all' || section === 'code';
  const showColumns = section === 'all' || section === 'columns';
  const normalizedSqlLines = draft.sql
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const sqlLineCount = normalizedSqlLines.length;
  const sqlLineLabel =
    sqlLineCount === 1
      ? canvasViewCopy.inspectorDvtSqlLineSingularLabel
      : canvasViewCopy.inspectorDvtSqlLinePluralLabel;
  const columnOptions = buildDvtTransformColumnOptions({
    node,
    nodes,
    edges,
    selectedColumnRefs: draft.selectedColumns,
  });
  const updateColumnSelection = (columnRef: string, checked: boolean) => {
    onChange((currentDraft) => {
      if (currentDraft.dvt?.kind !== 'sql_transform') {
        return currentDraft;
      }

      const selectedColumns = checked
        ? Array.from(new Set([...currentDraft.dvt.selectedColumns, columnRef]))
        : currentDraft.dvt.selectedColumns.filter((candidate) => candidate !== columnRef);

      return {
        ...currentDraft,
        dvt: {
          ...currentDraft.dvt,
          selectedColumns,
        },
      };
    });
  };

  return (
    <div className={inspectorVisualClasses.inspectorDbtSection}>
      {showCode ? (
        <div className="space-y-3">
          <h3 className={inspectorVisualClasses.contextPanelSectionTitle}>
            {canvasViewCopy.inspectorDvtSqlTransformTitle}
          </h3>
          <div className="rounded border border-[color:var(--border-default)] bg-[var(--surface-elevated)] p-3 text-xs">
            <div className="flex items-center justify-between gap-3">
              <span className="text-(--text-muted)">{canvasViewCopy.inspectorDvtSqlBodyLabel}</span>
              <span className="text-(--text-muted)">
                {sqlLineCount} {sqlLineLabel}
              </span>
            </div>
            <code className="mt-2 block max-h-24 overflow-hidden whitespace-pre-wrap text-(--text-default)">
              {draft.sql || '-'}
            </code>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`inspector-dvt-transform-sql-${node.id}`}>
              {canvasViewCopy.inspectorDvtSqlLabel}
            </Label>
            <Textarea
              id={`inspector-dvt-transform-sql-${node.id}`}
              name="dvt-transform-sql"
              value={draft.sql}
              disabled={disabled}
              aria-invalid={errors?.sql ? 'true' : undefined}
              onChange={(event) =>
                onChange((currentDraft) =>
                  currentDraft.dvt?.kind === 'sql_transform'
                    ? {
                        ...currentDraft,
                        dvt: { ...currentDraft.dvt, sql: event.target.value },
                      }
                    : currentDraft
                )
              }
            />
            {errors?.sql ? (
              <p className={inspectorVisualClasses.inspectorErrorText}>
                {formatCanvasInspectorNodeDraftError(errors.sql, canvasViewCopy)}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
      {showColumns ? (
        <div className={showCode ? 'mt-4 space-y-2' : 'space-y-2'}>
          <div className="flex items-center justify-between gap-3">
            <h4 className={inspectorVisualClasses.contextPanelSectionTitle}>
              {canvasViewCopy.nodePresentationColumnsLabel}
            </h4>
            {columnOptions.length > 0 ? (
              <span className={inspectorVisualClasses.inspectorSubtle}>
                {draft.selectedColumns.length}/{columnOptions.length}{' '}
                {canvasViewCopy.dvtFlowGuideColumnsLabel}
              </span>
            ) : null}
          </div>
          {columnOptions.length > 0 ? (
            <div className="max-h-48 overflow-auto rounded border border-[color:var(--border-default)]">
              {columnOptions.map((option) => (
                <label
                  key={option.columnRef}
                  className="grid cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-[color:var(--border-muted)] px-3 py-2 text-xs last:border-b-0"
                >
                  <input
                    type="checkbox"
                    name="dvt-transform-column"
                    value={option.columnRef}
                    checked={option.selected}
                    disabled={disabled}
                    onChange={(event) =>
                      updateColumnSelection(option.columnRef, event.target.checked)
                    }
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-mono text-(--text-default)">
                      {option.sourceNodeName}.{option.columnName}
                    </span>
                    <span className="block truncate text-(--text-muted)">{option.columnRef}</span>
                  </span>
                  <span className="rounded border border-[color:var(--border-default)] px-2 py-1 font-mono text-(--text-muted)">
                    {option.dataType}
                    {option.nullable === false
                      ? ` ${canvasViewCopy.dvtFlowGuideRequiredLabel}`
                      : ''}
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <p className={inspectorVisualClasses.inspectorBody}>
              {canvasViewCopy.dvtFlowGuideColumnsMissingMessage}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}