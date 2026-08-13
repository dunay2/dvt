/** Owned concern: render DVT source authoring fields. */
import type { Dispatch, SetStateAction } from 'react';

import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import type { CanonicalNode } from '../../types/canonical';
import type { DvtSourceAuthoringMetadata } from './canvasDvtAuthoringModel';
import { formatCanvasInspectorNodeDraftError } from './canvasCopyFormatting';
import type {
  CanvasInspectorNodeDraft,
  CanvasInspectorNodeDraftErrors,
} from './canvasInspectorAuthoring.types';
import { canvasViewCopy } from './copy';
import { inspectorVisualClasses } from '../../components/inspector/inspectorVisualTokens';

export function DvtSourceAuthoringSection({
  node,
  disabled,
  draft,
  errors,
  sourceTarget,
  onChange,
}: Readonly<{
  node: CanonicalNode;
  disabled: boolean;
  draft: DvtSourceAuthoringMetadata;
  errors: CanvasInspectorNodeDraftErrors['dvt'];
  sourceTarget: string;
  onChange: Dispatch<SetStateAction<CanvasInspectorNodeDraft>>;
}>): JSX.Element {
  return (
    <div className={inspectorVisualClasses.inspectorDbtSection}>
      <h3 className={inspectorVisualClasses.contextPanelSectionTitle}>
        {canvasViewCopy.inspectorDvtSourceTitle}
      </h3>
      <div className="mb-3 grid grid-cols-1 gap-2 rounded border border-[color:var(--border-default)] bg-[var(--surface-elevated)] p-3 text-xs">
        <div>
          <span className="block text-(--text-muted)">
            {canvasViewCopy.inspectorDvtSourceTargetLabel}
          </span>
          <code className="mt-1 block truncate text-(--text-default)">{sourceTarget}</code>
        </div>
        <div>
          <span className="block text-(--text-muted)">{canvasViewCopy.inspectorDvtAliasLabel}</span>
          <code className="mt-1 block truncate text-(--text-default)">{draft.alias || '-'}</code>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3">
        <div className="space-y-2">
          <Label htmlFor={`inspector-dvt-source-schema-${node.id}`}>
            {canvasViewCopy.inspectorDvtSchemaLabel}
          </Label>
          <Input
            id={`inspector-dvt-source-schema-${node.id}`}
            name="dvt-source-schema"
            value={draft.schema}
            disabled={disabled}
            aria-invalid={errors?.schema ? 'true' : undefined}
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
          {errors?.schema ? (
            <p className={inspectorVisualClasses.inspectorErrorText}>
              {formatCanvasInspectorNodeDraftError(errors.schema, canvasViewCopy)}
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
            value={draft.table}
            disabled={disabled}
            aria-invalid={errors?.table ? 'true' : undefined}
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
          {errors?.table ? (
            <p className={inspectorVisualClasses.inspectorErrorText}>
              {formatCanvasInspectorNodeDraftError(errors.table, canvasViewCopy)}
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
            value={draft.alias}
            disabled={disabled}
            aria-invalid={errors?.alias ? 'true' : undefined}
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
          {errors?.alias ? (
            <p className={inspectorVisualClasses.inspectorErrorText}>
              {formatCanvasInspectorNodeDraftError(errors.alias, canvasViewCopy)}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
