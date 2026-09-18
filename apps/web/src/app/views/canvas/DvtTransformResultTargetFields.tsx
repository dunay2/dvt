/** Renders explicit Transform destination authoring; owns no transport or persistence. */
import type { ConnectionRef, DvtTransformResultTargetV1 } from '@dvt/contracts';
import { useId } from 'react';

import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { inspectorVisualClasses } from '../../components/inspector/inspectorVisualTokens';
import type { DvtNodeAuthoringMetadataErrors } from './canvasDvtAuthoringTypes';
import { formatCanvasInspectorNodeDraftError } from './canvasCopyFormatting';
import { canvasViewCopy } from './copy';

export function DvtTransformResultTargetFields({
  target,
  connection,
  disabled,
  errors,
  onChange,
}: Readonly<{
  target: DvtTransformResultTargetV1 | null | undefined;
  connection: ConnectionRef | undefined;
  disabled: boolean;
  errors?: DvtNodeAuthoringMetadataErrors;
  onChange: (target: DvtTransformResultTargetV1 | null) => void;
}>): JSX.Element {
  const id = useId();
  const candidate = connection?.provider === 'postgres' ? connection : undefined;
  const connections = target == null ? [] : [target.connectionRef];
  if (
    candidate != null &&
    !connections.some((item) => item.connectionId === candidate.connectionId)
  ) {
    connections.push({ ...candidate, provider: 'postgres' });
  }
  return (
    <fieldset className="space-y-3" data-slot="dvt-transform-result-target">
      <legend className={inspectorVisualClasses.contextPanelSectionTitle}>
        {canvasViewCopy.inspectorDvtDestinationTargetLabel}
      </legend>
      <div className="space-y-2">
        <Label htmlFor={`${id}-connection`}>{canvasViewCopy.inspectorDvtConnectionLabel}</Label>
        <select
          id={`${id}-connection`}
          name="dvt-transform-result-connection"
          value={target?.connectionRef.connectionId ?? ''}
          disabled={disabled || connections.length === 0}
          className={inspectorVisualClasses.inspectorSelectInput}
          onChange={(event) => {
            const selected = connections.find((item) => item.connectionId === event.target.value);
            onChange(
              selected == null
                ? null
                : {
                    schemaVersion: 'dvt-transform-result-target.v1',
                    connectionRef: selected,
                    schema: target?.schema ?? '',
                    relation: target?.relation ?? '',
                  }
            );
          }}
        >
          <option value="">{canvasViewCopy.inspectorDvtConnectionPlaceholder}</option>
          {connections.map((item) => (
            <option key={item.connectionId} value={item.connectionId}>
              {item.connectionId}
            </option>
          ))}
        </select>
      </div>
      {target == null ? null : (
        <div className="grid grid-cols-2 gap-3">
          {(['schema', 'relation'] as const).map((field) => {
            const error = field === 'schema' ? errors?.schema : errors?.table;
            return (
              <div key={field} className="space-y-2">
                <Label htmlFor={`${id}-${field}`}>
                  {field === 'schema'
                    ? canvasViewCopy.inspectorDvtSchemaLabel
                    : canvasViewCopy.inspectorDvtTableLabel}
                </Label>
                <Input
                  id={`${id}-${field}`}
                  name={`dvt-transform-result-${field}`}
                  value={target[field]}
                  disabled={disabled}
                  aria-invalid={error ? 'true' : undefined}
                  aria-describedby={error ? `${id}-${field}-error` : undefined}
                  onChange={(event) => onChange({ ...target, [field]: event.target.value })}
                />
                {error ? (
                  <p
                    id={`${id}-${field}-error`}
                    role="alert"
                    className={inspectorVisualClasses.inspectorErrorText}
                  >
                    {formatCanvasInspectorNodeDraftError(error, canvasViewCopy)}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </fieldset>
  );
}
