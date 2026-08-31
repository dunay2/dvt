/** Owned concern: edit the admitted two-source Substrait UNION ALL in Node Properties. */
import type { Dispatch, SetStateAction } from 'react';

import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { inspectorVisualClasses } from '../../components/inspector/inspectorVisualTokens';
import type { DvtSubstraitTransformAuthoringMetadata } from './canvasDvtAuthoringModel';
import type { CanvasInspectorNodeDraft } from './canvasInspectorAuthoring.types';
import {
  applyDvtSubstraitUnionAllFieldEdit,
  inspectDvtSubstraitUnionAllDraft,
  type DvtSubstraitUnionAllFieldEdit,
} from './canvasDvtSubstraitSetComposition';
import { canvasViewCopy } from './copy';

export function DvtSubstraitUnionAllAuthoringSection({
  disabled,
  draft,
  onChange,
}: Readonly<{
  disabled: boolean;
  draft: DvtSubstraitTransformAuthoringMetadata;
  onChange: Dispatch<SetStateAction<CanvasInspectorNodeDraft>>;
}>): JSX.Element | null {
  const inspection = inspectDvtSubstraitUnionAllDraft({
    plan: draft.plan,
    sidecar: draft.sidecar,
  });
  if (!inspection.ok) return null;
  const mutate = (edit: DvtSubstraitUnionAllFieldEdit): void => {
    onChange((currentDraft) => {
      if (
        currentDraft.dvt?.kind !== 'sql_transform' ||
        currentDraft.dvt.mode !== 'substrait' ||
        currentDraft.dvt.shape !== 'union_all'
      ) {
        return currentDraft;
      }
      return {
        ...currentDraft,
        dvt: {
          ...currentDraft.dvt,
          ...applyDvtSubstraitUnionAllFieldEdit(currentDraft.dvt, edit),
        },
      };
    });
  };

  return (
    <div
      className={`${inspectorVisualClasses.inspectorDbtSection} space-y-3`}
      data-slot="dvt-substrait-union-all-authoring"
    >
      <h3 className={inspectorVisualClasses.contextPanelSectionTitle}>
        {canvasViewCopy.inspectorDvtSubstraitUnionAllTitle}
      </h3>
      <dl className="space-y-3 text-xs">
        <div>
          <dt className="text-(--text-muted)">
            {canvasViewCopy.inspectorDvtSubstraitUnionAllInputsLabel}
          </dt>
          <dd className="font-mono">
            {inspection.projection.inputs
              .map((input) => `${input.schema}.${input.table}`)
              .join(' UNION ALL ')}
          </dd>
        </div>
        <div>
          <dt className="text-(--text-muted)">
            {canvasViewCopy.inspectorDvtSubstraitUnionAllFieldsLabel}
          </dt>
          <dd className="font-mono">
            {inspection.projection.outputs.map((output) => output.name).join(', ')}
          </dd>
        </div>
        <div className="space-y-2">
          <dt className="text-(--text-muted)">
            {canvasViewCopy.inspectorDvtSubstraitSelectedFieldsLabel}
          </dt>
          <dd className="space-y-2">
            {inspection.projection.availableFields.map((field) => {
              const output = inspection.projection.outputs.find(
                (candidate) => candidate.fieldKey === field.fieldKey
              );
              const selected = output != null;
              const outputOrdinal = output?.outputOrdinal ?? -1;
              return (
                <div
                  key={field.fieldKey}
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded border border-[color:var(--border-default)] p-2"
                >
                  <input
                    type="checkbox"
                    data-slot="dvt-substrait-union-all-field"
                    data-field-key={field.fieldKey}
                    aria-label={`${canvasViewCopy.inspectorDvtSubstraitSelectedFieldsLabel}: ${field.defaultName}`}
                    checked={selected}
                    disabled={disabled || (selected && inspection.projection.outputs.length === 1)}
                    onChange={(event) =>
                      mutate({
                        kind: 'set-selected',
                        fieldKey: field.fieldKey,
                        selected: event.currentTarget.checked,
                      })
                    }
                  />
                  {output == null ? (
                    <span className="text-(--text-muted)">{field.defaultName}</span>
                  ) : (
                    <Input
                      key={`${output.fieldId}:${output.name}`}
                      data-slot="dvt-substrait-union-all-output-name"
                      data-field-key={field.fieldKey}
                      aria-label={`${canvasViewCopy.inspectorDvtVisualOutputNameLabel}: ${field.defaultName}`}
                      disabled={disabled}
                      defaultValue={output.name}
                      onBlur={(event) =>
                        mutate({
                          kind: 'rename',
                          fieldKey: field.fieldKey,
                          outputName: event.currentTarget.value,
                        })
                      }
                    />
                  )}
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      data-action="move-substrait-union-all-field-up"
                      data-field-key={field.fieldKey}
                      aria-label={`${canvasViewCopy.inspectorDvtSubstraitMoveFieldUpLabel}: ${field.defaultName}`}
                      disabled={disabled || !selected || outputOrdinal === 0}
                      onClick={() =>
                        mutate({ kind: 'move', fieldKey: field.fieldKey, direction: 'up' })
                      }
                    >
                      ↑
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      data-action="move-substrait-union-all-field-down"
                      data-field-key={field.fieldKey}
                      aria-label={`${canvasViewCopy.inspectorDvtSubstraitMoveFieldDownLabel}: ${field.defaultName}`}
                      disabled={
                        disabled ||
                        !selected ||
                        outputOrdinal === inspection.projection.outputs.length - 1
                      }
                      onClick={() =>
                        mutate({ kind: 'move', fieldKey: field.fieldKey, direction: 'down' })
                      }
                    >
                      ↓
                    </Button>
                  </div>
                </div>
              );
            })}
          </dd>
        </div>
      </dl>
    </div>
  );
}
