/** Owned concern: present the admitted two-source Substrait INNER JOIN in Node Properties. */
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { inspectorVisualClasses } from '../../components/inspector/inspectorVisualTokens';
import type { DvtSubstraitTransformAuthoringMetadata } from './canvasDvtAuthoringModel';
import type { CanvasInspectorNodeDraft } from './canvasInspectorAuthoring.types';
import {
  DVT_SUBSTRAIT_INNER_JOIN_FIELD_KEYS,
  applyDvtSubstraitInnerJoinFieldEdit,
  inspectDvtSubstraitInnerJoinDraft,
  type DvtSubstraitInnerJoinFieldEdit,
} from './canvasDvtSubstraitJoinComposition';
import { canvasViewCopy } from './copy';
import type { Dispatch, SetStateAction } from 'react';

export function DvtSubstraitInnerJoinAuthoringSection({
  disabled,
  draft,
  onChange,
}: Readonly<{
  disabled: boolean;
  draft: DvtSubstraitTransformAuthoringMetadata;
  onChange: Dispatch<SetStateAction<CanvasInspectorNodeDraft>>;
}>): JSX.Element | null {
  const inspection = inspectDvtSubstraitInnerJoinDraft({
    plan: draft.plan,
    sidecar: draft.sidecar,
  });
  if (!inspection.ok) return null;
  const { projection } = inspection;
  const mutate = (edit: DvtSubstraitInnerJoinFieldEdit): void => {
    onChange((currentDraft) => {
      if (
        currentDraft.dvt?.kind !== 'sql_transform' ||
        currentDraft.dvt.mode !== 'substrait' ||
        currentDraft.dvt.shape !== 'inner_join'
      ) {
        return currentDraft;
      }
      return {
        ...currentDraft,
        dvt: {
          ...currentDraft.dvt,
          ...applyDvtSubstraitInnerJoinFieldEdit(currentDraft.dvt, edit),
        },
      };
    });
  };

  return (
    <div
      className={`${inspectorVisualClasses.inspectorDbtSection} space-y-3`}
      data-slot="dvt-substrait-inner-join-authoring"
    >
      <h3 className={inspectorVisualClasses.contextPanelSectionTitle}>
        {canvasViewCopy.inspectorDvtSubstraitInnerJoinTitle}
      </h3>
      <p className="text-xs text-(--text-muted)">
        {projection.left.table} + {projection.right.table}
      </p>
      <dl className="space-y-2 text-xs">
        <div>
          <dt className="text-(--text-muted)">
            {canvasViewCopy.inspectorDvtSubstraitJoinConditionLabel}
          </dt>
          <dd>
            {projection.left.table}.{projection.leftKey} = {projection.right.table}.
            {projection.rightKey}
          </dd>
        </div>
        <div className="space-y-2">
          <dt className="text-(--text-muted)">
            {canvasViewCopy.inspectorDvtSubstraitSelectedFieldsLabel}
          </dt>
          <dd className="space-y-2">
            {DVT_SUBSTRAIT_INNER_JOIN_FIELD_KEYS.map((fieldKey) => {
              const output = projection.outputs.find(
                (candidate) => candidate.fieldKey === fieldKey
              );
              const selected = output != null;
              const outputOrdinal = output?.outputOrdinal ?? -1;
              const defaultName = fieldKey.slice(fieldKey.indexOf('.') + 1);
              return (
                <div
                  key={fieldKey}
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded border border-[color:var(--border-default)] p-2"
                  data-slot="dvt-substrait-inner-join-field"
                  data-field-key={fieldKey}
                >
                  <input
                    type="checkbox"
                    name="dvt-substrait-inner-join-field"
                    value={fieldKey}
                    aria-label={`${canvasViewCopy.inspectorDvtSubstraitSelectedFieldsLabel}: ${defaultName}`}
                    checked={selected}
                    disabled={disabled || (selected && projection.outputs.length === 1)}
                    onChange={(event) =>
                      mutate({
                        kind: 'set-selected',
                        fieldKey,
                        selected: event.currentTarget.checked,
                      })
                    }
                  />
                  {output == null ? (
                    <span className="text-(--text-muted)">{defaultName}</span>
                  ) : (
                    <Input
                      key={`${output.fieldId}:${output.name}`}
                      data-slot="dvt-substrait-inner-join-output-name"
                      data-field-key={fieldKey}
                      aria-label={`${canvasViewCopy.inspectorDvtVisualOutputNameLabel}: ${defaultName}`}
                      disabled={disabled}
                      defaultValue={output.name}
                      onBlur={(event) =>
                        mutate({
                          kind: 'rename',
                          fieldKey,
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
                      data-action="move-substrait-inner-join-field-up"
                      data-field-key={fieldKey}
                      aria-label={`${canvasViewCopy.inspectorDvtSubstraitMoveFieldUpLabel}: ${defaultName}`}
                      disabled={disabled || !selected || outputOrdinal === 0}
                      onClick={() => mutate({ kind: 'move', fieldKey, direction: 'up' })}
                    >
                      ↑
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      data-action="move-substrait-inner-join-field-down"
                      data-field-key={fieldKey}
                      aria-label={`${canvasViewCopy.inspectorDvtSubstraitMoveFieldDownLabel}: ${defaultName}`}
                      disabled={
                        disabled || !selected || outputOrdinal === projection.outputs.length - 1
                      }
                      onClick={() => mutate({ kind: 'move', fieldKey, direction: 'down' })}
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
