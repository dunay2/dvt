/** Owned concern: render DVT SQL transform authoring fields. */
import type { Dispatch, SetStateAction } from 'react';

import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { graphVisualClasses } from '../../plugins/graph/graphVisualTokens';
import type { CanonicalNode } from '../../types/canonical';
import type { DvtSqlTransformAuthoringMetadata } from './canvasDvtAuthoringModel';
import { formatCanvasInspectorNodeDraftError } from './canvasCopyFormatting';
import type {
  CanvasInspectorNodeDraft,
  CanvasInspectorNodeDraftErrors,
} from './canvasInspectorAuthoring.types';
import { canvasViewCopy } from './copy';

export function DvtSqlTransformAuthoringSection({
  node,
  disabled,
  draft,
  errors,
  onChange,
}: Readonly<{
  node: CanonicalNode;
  disabled: boolean;
  draft: DvtSqlTransformAuthoringMetadata;
  errors: CanvasInspectorNodeDraftErrors['dvt'];
  onChange: Dispatch<SetStateAction<CanvasInspectorNodeDraft>>;
}>): JSX.Element {
  const normalizedSqlLines = draft.sql
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const sqlLineCount = normalizedSqlLines.length;
  const sqlLineLabel =
    sqlLineCount === 1
      ? canvasViewCopy.inspectorDvtSqlLineSingularLabel
      : canvasViewCopy.inspectorDvtSqlLinePluralLabel;

  return (
    <div className={graphVisualClasses.inspectorDbtSection}>
      <h3 className={graphVisualClasses.contextPanelSectionTitle}>
        {canvasViewCopy.inspectorDvtSqlTransformTitle}
      </h3>
      <div className="mb-3 rounded border border-[color:var(--border-default)] bg-[var(--surface-elevated)] p-3 text-xs">
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
          <p className={graphVisualClasses.inspectorErrorText}>
            {formatCanvasInspectorNodeDraftError(errors.sql, canvasViewCopy)}
          </p>
        ) : null}
      </div>
    </div>
  );
}
