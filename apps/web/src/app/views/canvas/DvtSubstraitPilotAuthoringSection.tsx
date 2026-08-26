/** Owned concern: edit the single Substrait Plan shape admitted by VTX2 pilot #2598. */
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
  const inspection = inspectDvtSubstraitPilotDraft(draft);
  const projectedOutputName = inspection.ok ? inspection.projection.outputName : '';
  const [outputName, setOutputName] = useState(projectedOutputName);

  useEffect(() => {
    setOutputName(projectedOutputName);
  }, [projectedOutputName]);

  if (!inspection.ok) {
    return (
      <div data-slot="dvt-substrait-pilot-authoring" className="space-y-3">
        <h3 className={inspectorVisualClasses.contextPanelSectionTitle}>Substrait</h3>
        <p className="text-xs text-(--text-muted)">{canvasViewCopy.inspectorNodeReadOnlyMessage}</p>
      </div>
    );
  }

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

  const commitOutputName = (): void => {
    const normalized = outputName.trim();
    if (normalized.length === 0) {
      setOutputName(inspection.projection.outputName);
      return;
    }
    mutate((current) => ({
      ...current,
      ...renameDvtSubstraitPilotOutput(current, normalized),
    }));
  };

  const operations = inspection.projection.operations;
  const canAddTrim = operations.length === 0;
  const canAddUpper = operations.length === 1 && operations[0] === 'trim';

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
          {inspection.projection.sourceName} · {inspection.projection.inputFieldName}
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
          {inspection.projection.inputFieldName}
          {operations.map((operation) => ` → ${operation}`).join('')}
          {` → ${inspection.projection.outputName}`}
        </p>
      </div>
    </div>
  );
}
