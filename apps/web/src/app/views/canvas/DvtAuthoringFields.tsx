/** Owned concern: render DVT-specific Canvas Inspector authoring fields. */
import type { Dispatch, SetStateAction } from 'react';

import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { graphVisualClasses } from '../../plugins/graph/graphVisualTokens';
import type { CanonicalNode } from '../../types/canonical';
import { formatCanvasInspectorNodeDraftError } from './canvasCopyFormatting';
import {
  createCanvasInspectorNodeDraft,
  validateCanvasInspectorNodeDraft,
} from './canvasInspectorAuthoringModel';
import { canvasViewCopy } from './copy';

type DvtAuthoringFieldsProps = Readonly<{
  node: CanonicalNode;
  disabled: boolean;
  draft: ReturnType<typeof createCanvasInspectorNodeDraft>;
  errors: ReturnType<typeof validateCanvasInspectorNodeDraft>;
  onChange: Dispatch<SetStateAction<ReturnType<typeof createCanvasInspectorNodeDraft>>>;
}>;

export function DvtAuthoringFields({
  node,
  disabled,
  draft,
  errors,
  onChange,
}: DvtAuthoringFieldsProps): JSX.Element | null {
  if (!draft.dvt) {
    return null;
  }

  const selectClassName = graphVisualClasses.inspectorSelectInput;
  const materializationOptions = [
    { value: 'table', label: canvasViewCopy.inspectorDvtMaterializationTableLabel },
    { value: 'view', label: canvasViewCopy.inspectorDvtMaterializationViewLabel },
  ] as const;
  const writeModeOptions = [
    { value: 'replace', label: canvasViewCopy.inspectorDvtWriteModeReplaceLabel },
    { value: 'append', label: canvasViewCopy.inspectorDvtWriteModeAppendLabel },
  ] as const;

  if (draft.dvt.kind === 'source') {
    return (
      <div className={graphVisualClasses.inspectorDbtSection}>
        <h3 className={graphVisualClasses.contextPanelSectionTitle}>
          {canvasViewCopy.inspectorDvtSourceTitle}
        </h3>
        <div className="grid grid-cols-1 gap-3">
          <div className="space-y-2">
            <Label htmlFor={`inspector-dvt-source-schema-${node.id}`}>
              {canvasViewCopy.inspectorDvtSchemaLabel}
            </Label>
            <Input
              id={`inspector-dvt-source-schema-${node.id}`}
              name="dvt-source-schema"
              value={draft.dvt.schema}
              disabled={disabled}
              aria-invalid={errors.dvt?.schema ? 'true' : undefined}
              onChange={(event) =>
                onChange((currentDraft) =>
                  currentDraft.dvt?.kind === 'source'
                    ? {
                        ...currentDraft,
                        dvt: { ...currentDraft.dvt, schema: event.target.value },
                      }
                    : currentDraft
                )
              }
            />
            {errors.dvt?.schema ? (
              <p className={graphVisualClasses.inspectorErrorText}>
                {formatCanvasInspectorNodeDraftError(errors.dvt.schema, canvasViewCopy)}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor={`inspector-dvt-source-table-${node.id}`}>
              {canvasViewCopy.inspectorDvtTableLabel}
            </Label>
            <Input
              id={`inspector-dvt-source-table-${node.id}`}
              name="dvt-source-table"
              value={draft.dvt.table}
              disabled={disabled}
              aria-invalid={errors.dvt?.table ? 'true' : undefined}
              onChange={(event) =>
                onChange((currentDraft) =>
                  currentDraft.dvt?.kind === 'source'
                    ? {
                        ...currentDraft,
                        dvt: { ...currentDraft.dvt, table: event.target.value },
                      }
                    : currentDraft
                )
              }
            />
            {errors.dvt?.table ? (
              <p className={graphVisualClasses.inspectorErrorText}>
                {formatCanvasInspectorNodeDraftError(errors.dvt.table, canvasViewCopy)}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor={`inspector-dvt-source-alias-${node.id}`}>
              {canvasViewCopy.inspectorDvtAliasLabel}
            </Label>
            <Input
              id={`inspector-dvt-source-alias-${node.id}`}
              name="dvt-source-alias"
              value={draft.dvt.alias}
              disabled={disabled}
              aria-invalid={errors.dvt?.alias ? 'true' : undefined}
              onChange={(event) =>
                onChange((currentDraft) =>
                  currentDraft.dvt?.kind === 'source'
                    ? {
                        ...currentDraft,
                        dvt: { ...currentDraft.dvt, alias: event.target.value },
                      }
                    : currentDraft
                )
              }
            />
            {errors.dvt?.alias ? (
              <p className={graphVisualClasses.inspectorErrorText}>
                {formatCanvasInspectorNodeDraftError(errors.dvt.alias, canvasViewCopy)}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  if (draft.dvt.kind === 'sql_transform') {
    return (
      <div className={graphVisualClasses.inspectorDbtSection}>
        <h3 className={graphVisualClasses.contextPanelSectionTitle}>
          {canvasViewCopy.inspectorDvtSqlTransformTitle}
        </h3>
        <div className="space-y-2">
          <Label htmlFor={`inspector-dvt-transform-sql-${node.id}`}>
            {canvasViewCopy.inspectorDvtSqlLabel}
          </Label>
          <Textarea
            id={`inspector-dvt-transform-sql-${node.id}`}
            name="dvt-transform-sql"
            value={draft.dvt.sql}
            disabled={disabled}
            aria-invalid={errors.dvt?.sql ? 'true' : undefined}
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
          {errors.dvt?.sql ? (
            <p className={graphVisualClasses.inspectorErrorText}>
              {formatCanvasInspectorNodeDraftError(errors.dvt.sql, canvasViewCopy)}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className={graphVisualClasses.inspectorDbtSection}>
      <h3 className={graphVisualClasses.contextPanelSectionTitle}>
        {canvasViewCopy.inspectorDvtSinkTitle}
      </h3>
      <div className="grid grid-cols-1 gap-3">
        <div className="space-y-2">
          <Label htmlFor={`inspector-dvt-sink-schema-${node.id}`}>
            {canvasViewCopy.inspectorDvtSchemaLabel}
          </Label>
          <Input
            id={`inspector-dvt-sink-schema-${node.id}`}
            name="dvt-sink-schema"
            value={draft.dvt.schema}
            disabled={disabled}
            aria-invalid={errors.dvt?.schema ? 'true' : undefined}
            onChange={(event) =>
              onChange((currentDraft) =>
                currentDraft.dvt?.kind === 'sink'
                  ? {
                      ...currentDraft,
                      dvt: { ...currentDraft.dvt, schema: event.target.value },
                    }
                  : currentDraft
              )
            }
          />
          {errors.dvt?.schema ? (
            <p className={graphVisualClasses.inspectorErrorText}>
              {formatCanvasInspectorNodeDraftError(errors.dvt.schema, canvasViewCopy)}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor={`inspector-dvt-sink-table-${node.id}`}>
            {canvasViewCopy.inspectorDvtTableLabel}
          </Label>
          <Input
            id={`inspector-dvt-sink-table-${node.id}`}
            name="dvt-sink-table"
            value={draft.dvt.table}
            disabled={disabled}
            aria-invalid={errors.dvt?.table ? 'true' : undefined}
            onChange={(event) =>
              onChange((currentDraft) =>
                currentDraft.dvt?.kind === 'sink'
                  ? {
                      ...currentDraft,
                      dvt: { ...currentDraft.dvt, table: event.target.value },
                    }
                  : currentDraft
              )
            }
          />
          {errors.dvt?.table ? (
            <p className={graphVisualClasses.inspectorErrorText}>
              {formatCanvasInspectorNodeDraftError(errors.dvt.table, canvasViewCopy)}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor={`inspector-dvt-sink-materialization-${node.id}`}>
            {canvasViewCopy.inspectorDvtMaterializationLabel}
          </Label>
          <select
            id={`inspector-dvt-sink-materialization-${node.id}`}
            name="dvt-sink-materialization"
            value={draft.dvt.materialization}
            disabled={disabled}
            className={selectClassName}
            aria-invalid={errors.dvt?.materialization ? 'true' : undefined}
            onChange={(event) =>
              onChange((currentDraft) =>
                currentDraft.dvt?.kind === 'sink'
                  ? {
                      ...currentDraft,
                      dvt: { ...currentDraft.dvt, materialization: event.target.value },
                    }
                  : currentDraft
              )
            }
          >
            {materializationOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.dvt?.materialization ? (
            <p className={graphVisualClasses.inspectorErrorText}>
              {formatCanvasInspectorNodeDraftError(errors.dvt.materialization, canvasViewCopy)}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor={`inspector-dvt-sink-write-mode-${node.id}`}>
            {canvasViewCopy.inspectorDvtWriteModeLabel}
          </Label>
          <select
            id={`inspector-dvt-sink-write-mode-${node.id}`}
            name="dvt-sink-write-mode"
            value={draft.dvt.writeMode}
            disabled={disabled}
            className={selectClassName}
            aria-invalid={errors.dvt?.writeMode ? 'true' : undefined}
            onChange={(event) =>
              onChange((currentDraft) =>
                currentDraft.dvt?.kind === 'sink'
                  ? {
                      ...currentDraft,
                      dvt: { ...currentDraft.dvt, writeMode: event.target.value },
                    }
                  : currentDraft
              )
            }
          >
            {writeModeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.dvt?.writeMode ? (
            <p className={graphVisualClasses.inspectorErrorText}>
              {formatCanvasInspectorNodeDraftError(errors.dvt.writeMode, canvasViewCopy)}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
