/** Owned concern: render DVT sink authoring fields. */
import type { Dispatch, SetStateAction } from 'react';

import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { inspectorVisualClasses } from '../../components/inspector/inspectorVisualTokens';
import type { CanonicalNode } from '../../types/canonical';
import type { DvtSinkAuthoringMetadata } from './canvasDvtAuthoringModel';
import { formatCanvasInspectorNodeDraftError } from './canvasCopyFormatting';
import type {
  CanvasInspectorNodeDraft,
  CanvasInspectorNodeDraftErrors,
} from './canvasInspectorAuthoring.types';
import { canvasViewCopy } from './copy';

export function DvtSinkAuthoringSection({
  node,
  disabled,
  draft,
  errors,
  destinationTarget,
  inheritedConnectionId,
  onChange,
}: Readonly<{
  node: CanonicalNode;
  disabled: boolean;
  draft: DvtSinkAuthoringMetadata;
  errors: CanvasInspectorNodeDraftErrors['dvt'];
  destinationTarget: string;
  inheritedConnectionId?: string;
  onChange: Dispatch<SetStateAction<CanvasInspectorNodeDraft>>;
}>): JSX.Element {
  const selectClassName = inspectorVisualClasses.inspectorSelectInput;
  const materializationOptions = [
    { value: 'table', label: canvasViewCopy.inspectorDvtMaterializationTableLabel },
    { value: 'view', label: canvasViewCopy.inspectorDvtMaterializationViewLabel },
  ] as const;
  const writeModeOptions = [
    { value: 'replace', label: canvasViewCopy.inspectorDvtWriteModeReplaceLabel },
    { value: 'append', label: canvasViewCopy.inspectorDvtWriteModeAppendLabel },
  ] as const;

  return (
    <div className={inspectorVisualClasses.inspectorDbtSection}>
      <h3 className={inspectorVisualClasses.contextPanelSectionTitle}>
        {canvasViewCopy.inspectorDvtSinkTitle}
      </h3>
      <div className="mb-3 grid grid-cols-1 gap-2 rounded border border-[color:var(--border-default)] bg-[var(--surface-elevated)] p-3 text-xs">
        <div>
          <span className="block text-(--text-muted)">
            {canvasViewCopy.inspectorDvtDestinationTargetLabel}
          </span>
          <code className="mt-1 block truncate text-(--text-default)">{destinationTarget}</code>
        </div>
        <div>
          <span className="block text-(--text-muted)">
            {canvasViewCopy.inspectorDvtInheritedConnectionLabel}
          </span>
          <code className="mt-1 block truncate text-(--text-default)">
            {inheritedConnectionId ?? '-'}
          </code>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded border border-[color:var(--border-default)] px-2 py-1 text-(--text-muted)">
            {draft.materialization}
          </span>
          <span className="rounded border border-[color:var(--border-default)] px-2 py-1 text-(--text-muted)">
            {draft.writeMode}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3">
        <div className="space-y-2">
          <Label htmlFor={`inspector-dvt-sink-schema-${node.id}`}>
            {canvasViewCopy.inspectorDvtSchemaLabel}
          </Label>
          <Input
            id={`inspector-dvt-sink-schema-${node.id}`}
            name="dvt-sink-schema"
            value={draft.schema}
            disabled={disabled}
            aria-invalid={errors?.schema ? 'true' : undefined}
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
          {errors?.schema ? (
            <p className={inspectorVisualClasses.inspectorErrorText}>
              {formatCanvasInspectorNodeDraftError(errors.schema, canvasViewCopy)}
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
            value={draft.table}
            disabled={disabled}
            aria-invalid={errors?.table ? 'true' : undefined}
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
          {errors?.table ? (
            <p className={inspectorVisualClasses.inspectorErrorText}>
              {formatCanvasInspectorNodeDraftError(errors.table, canvasViewCopy)}
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
            value={draft.materialization}
            disabled={disabled}
            className={selectClassName}
            aria-invalid={errors?.materialization ? 'true' : undefined}
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
          {errors?.materialization ? (
            <p className={inspectorVisualClasses.inspectorErrorText}>
              {formatCanvasInspectorNodeDraftError(errors.materialization, canvasViewCopy)}
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
            value={draft.writeMode}
            disabled={disabled}
            className={selectClassName}
            aria-invalid={errors?.writeMode ? 'true' : undefined}
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
          {errors?.writeMode ? (
            <p className={inspectorVisualClasses.inspectorErrorText}>
              {formatCanvasInspectorNodeDraftError(errors.writeMode, canvasViewCopy)}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
