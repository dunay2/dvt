/** Owned concern: edit the admitted single-source Substrait projection in Node Properties. */
import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { inspectorVisualClasses } from '../../components/inspector/inspectorVisualTokens';
import type { DvtSubstraitTransformAuthoringMetadata } from './canvasDvtAuthoringModel';
import type { CanvasInspectorNodeDraft } from './canvasInspectorAuthoring.types';
import {
  applyDvtSubstraitPilotFunction,
  inspectDvtSubstraitPilotDraft,
  renameDvtSubstraitPilotOutput,
} from './canvasDvtSubstraitPilot';
import {
  applyDvtSubstraitPilotAggregation,
  inspectDvtSubstraitPilotAggregationDraft,
  removeDvtSubstraitPilotAggregation,
  renameDvtSubstraitPilotCountOutput,
} from './canvasDvtSubstraitAggregation';
import { canvasViewCopy } from './copy';

export function DvtSubstraitPilotAuthoringSection({
  disabled,
  draft,
  onChange,
}: Readonly<{
  disabled: boolean;
  draft: DvtSubstraitTransformAuthoringMetadata;
  onChange: Dispatch<SetStateAction<CanvasInspectorNodeDraft>>;
}>): JSX.Element {
  const pilotInspection = inspectDvtSubstraitPilotDraft(draft);
  const aggregateInspection = inspectDvtSubstraitPilotAggregationDraft(draft);
  const projectedOutputName = pilotInspection.ok ? pilotInspection.projection.outputName : '';
  const projectedCountName = aggregateInspection.ok
    ? aggregateInspection.projection.measure.name
    : 'row_count';
  const defaultGrainFieldId = pilotInspection.ok
    ? (pilotInspection.projection.outputs.at(-1)?.fieldId ?? '')
    : '';
  const [outputName, setOutputName] = useState(projectedOutputName);
  const [grainFieldId, setGrainFieldId] = useState(defaultGrainFieldId);
  const [countOutputName, setCountOutputName] = useState(projectedCountName);

  useEffect(() => {
    setOutputName(projectedOutputName);
  }, [projectedOutputName]);

  useEffect(() => {
    setCountOutputName(projectedCountName);
  }, [projectedCountName]);

  useEffect(() => {
    if (defaultGrainFieldId.length > 0) setGrainFieldId(defaultGrainFieldId);
  }, [defaultGrainFieldId]);

  const mutate = (
    update: (
      current: DvtSubstraitTransformAuthoringMetadata
    ) => DvtSubstraitTransformAuthoringMetadata
  ): void => {
    onChange((currentDraft) =>
      currentDraft.dvt?.kind === 'sql_transform' && currentDraft.dvt.mode === 'substrait'
        ? { ...currentDraft, dvt: update(currentDraft.dvt) }
        : currentDraft
    );
  };

  if (aggregateInspection.ok) {
    const commitCountOutputName = (): void => {
      const normalized = countOutputName.trim();
      if (
        normalized.length === 0 ||
        normalized === aggregateInspection.projection.groupField.name
      ) {
        setCountOutputName(aggregateInspection.projection.measure.name);
        return;
      }
      mutate((current) => ({
        ...current,
        ...renameDvtSubstraitPilotCountOutput(current, normalized),
      }));
    };

    return (
      <div data-slot="dvt-substrait-pilot-authoring" className="space-y-4">
        <h3 className={inspectorVisualClasses.contextPanelSectionTitle}>Substrait</h3>
        <div
          data-slot="dvt-substrait-aggregation-authoring"
          data-capability-id={aggregateInspection.projection.measure.capabilityId}
          className="space-y-3"
        >
          <p className="text-xs font-medium text-(--text-default)">
            {canvasViewCopy.inspectorDvtSubstraitAggregationTitle}
          </p>
          <div className="space-y-1">
            <p className="text-xs font-medium text-(--text-default)">
              {canvasViewCopy.inspectorDvtSubstraitGrainFieldLabel}
            </p>
            <div
              data-slot="dvt-substrait-grain-field-readonly"
              className="rounded border border-[color:var(--border-default)] px-2 py-1.5 text-xs"
            >
              {aggregateInspection.projection.groupField.name}
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="dvt-substrait-count-output-name">
              {canvasViewCopy.inspectorDvtSubstraitCountOutputLabel}
            </Label>
            <Input
              id="dvt-substrait-count-output-name"
              data-slot="dvt-substrait-count-output-name"
              disabled={disabled}
              value={countOutputName}
              onChange={(event) => setCountOutputName(event.target.value)}
              onBlur={commitCountOutputName}
              onKeyDown={(event) => {
                if (event.key === 'Enter') event.currentTarget.blur();
              }}
            />
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            data-slot="dvt-substrait-remove-aggregation"
            disabled={disabled}
            onClick={() =>
              mutate((current) => ({
                ...current,
                ...removeDvtSubstraitPilotAggregation(current),
              }))
            }
          >
            {canvasViewCopy.inspectorDvtSubstraitRemoveAggregationLabel}
          </Button>
        </div>
      </div>
    );
  }

  if (!pilotInspection.ok) {
    return (
      <div data-slot="dvt-substrait-pilot-authoring" className="space-y-3">
        <h3 className={inspectorVisualClasses.contextPanelSectionTitle}>Substrait</h3>
        <p className="text-xs text-(--text-muted)">{canvasViewCopy.inspectorNodeReadOnlyMessage}</p>
      </div>
    );
  }

  const commitOutputName = (): void => {
    const normalized = outputName.trim();
    if (normalized.length === 0) {
      setOutputName(pilotInspection.projection.outputName);
      return;
    }
    mutate((current) => ({
      ...current,
      ...renameDvtSubstraitPilotOutput(current, normalized),
    }));
  };

  const operations = pilotInspection.projection.operations;
  const canAddTrim = operations.length === 0;
  const canAddUpper = operations.length === 1 && operations[0] === 'trim';
  const normalizedCountOutputName = countOutputName.trim();
  const canApplyAggregation =
    grainFieldId.length > 0 &&
    normalizedCountOutputName.length > 0 &&
    !pilotInspection.projection.outputs.some(
      (output) => output.fieldId === grainFieldId && output.name === normalizedCountOutputName
    );
  const applyAggregation = (): void => {
    mutate((current) => ({
      ...current,
      ...applyDvtSubstraitPilotAggregation(current, {
        groupFieldId: grainFieldId,
        countOutputName: normalizedCountOutputName,
      }),
    }));
  };

  return (
    <div data-slot="dvt-substrait-pilot-authoring" className="space-y-4">
      <h3 className={inspectorVisualClasses.contextPanelSectionTitle}>Substrait</h3>

      <div className="space-y-2">
        <Label htmlFor="dvt-substrait-output-name">
          {canvasViewCopy.inspectorDvtVisualOutputNameLabel}
        </Label>
        <Input
          id="dvt-substrait-output-name"
          data-slot="dvt-substrait-output-name"
          disabled={disabled}
          value={outputName}
          onChange={(event) => setOutputName(event.target.value)}
          onBlur={commitOutputName}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur();
          }}
        />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-(--text-default)">
          {canvasViewCopy.inspectorDvtVisualInputsLabel}
        </p>
        <div className="rounded border border-[color:var(--border-default)] px-2 py-1.5 text-xs">
          {pilotInspection.projection.sourceName} · {pilotInspection.projection.inputFieldName}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-(--text-default)">
          {canvasViewCopy.inspectorDvtVisualOperationsLabel}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={operations.includes('trim') ? 'secondary' : 'outline'}
            disabled={disabled || !canAddTrim}
            onClick={() =>
              mutate((current) => ({
                ...current,
                ...applyDvtSubstraitPilotFunction(current, 'trim'),
              }))
            }
          >
            TRIM
          </Button>
          <Button
            type="button"
            size="sm"
            variant={operations.includes('upper') ? 'secondary' : 'outline'}
            disabled={disabled || !canAddUpper}
            onClick={() =>
              mutate((current) => ({
                ...current,
                ...applyDvtSubstraitPilotFunction(current, 'upper'),
              }))
            }
          >
            UPPER
          </Button>
        </div>
        <p className="font-mono text-xs text-(--text-muted)">
          {pilotInspection.projection.inputFieldName}
          {operations.map((operation) => ` → ${operation}`).join('')}
          {` → ${pilotInspection.projection.outputName}`}
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-medium text-(--text-default)">
          {canvasViewCopy.inspectorDvtSubstraitAggregationTitle}
        </p>
        <div className="space-y-1">
          <Label htmlFor="dvt-substrait-grain-field">
            {canvasViewCopy.inspectorDvtSubstraitGrainFieldLabel}
          </Label>
          <select
            id="dvt-substrait-grain-field"
            name="dvt-substrait-grain-field"
            data-slot="dvt-substrait-grain-field"
            className="h-9 w-full rounded-md border border-input bg-input-background px-3 text-sm"
            disabled={disabled}
            value={grainFieldId}
            onChange={(event) => setGrainFieldId(event.currentTarget.value)}
          >
            {pilotInspection.projection.outputs.map((output) => (
              <option key={output.fieldId} value={output.fieldId}>
                {output.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="dvt-substrait-count-output-name">
            {canvasViewCopy.inspectorDvtSubstraitCountOutputLabel}
          </Label>
          <Input
            id="dvt-substrait-count-output-name"
            data-slot="dvt-substrait-count-output-name"
            disabled={disabled}
            value={countOutputName}
            onChange={(event) => setCountOutputName(event.target.value)}
          />
        </div>
        <Button
          type="button"
          size="sm"
          data-slot="dvt-substrait-apply-aggregation"
          disabled={disabled || !canApplyAggregation}
          onClick={applyAggregation}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            applyAggregation();
          }}
        >
          {canvasViewCopy.inspectorDvtSubstraitApplyAggregationLabel}
        </Button>
      </div>
    </div>
  );
}
