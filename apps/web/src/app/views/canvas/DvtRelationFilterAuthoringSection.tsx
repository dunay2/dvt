/** Owned concern: edit one catalog-admitted FilterRel on a projection relation. */
import { useEffect, useState } from 'react';

import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { inspectorVisualClasses } from '../../components/inspector/inspectorVisualTokens';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import {
  applyDvtSubstraitFilter,
  inspectDvtSubstraitFilter,
  removeDvtSubstraitFilter,
  resolveDvtSubstraitFilterCapabilities,
} from './canvasDvtSubstraitFilter';
import {
  inspectDvtSubstraitProjectionDraft,
  resolveDvtSubstraitProjectionEntry,
  type DvtSubstraitProjectionDraft,
} from './canvasDvtSubstraitProjection';
import { canvasViewCopy } from './copy';

export function DvtRelationFilterAuthoringSection({
  disabled,
  draft,
  node,
  nodes,
  edges,
  onChange,
}: Readonly<{
  disabled: boolean;
  draft: DvtSubstraitProjectionDraft;
  node: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  onChange: (draft: DvtSubstraitProjectionDraft) => void;
}>): JSX.Element | null {
  const active = inspectDvtSubstraitFilter(draft);
  const base = active == null ? draft : removeDvtSubstraitFilter(draft);
  const inspection = inspectDvtSubstraitProjectionDraft(base);
  const projection = resolveDvtSubstraitProjectionEntry({
    targetNode: node,
    nodes,
    edges,
    draft: base,
  });
  const compatibleOutputs =
    projection == null
      ? []
      : projection.outputs.filter(
          (output) =>
            resolveDvtSubstraitFilterCapabilities({
              dataType: output.dataType,
              provider: projection.source.sourceRef.connectionRef.provider,
            }).length > 0
        );
  const defaultFieldId = compatibleOutputs[0]?.fieldId ?? '';
  const [fieldId, setFieldId] = useState(active?.fieldId ?? defaultFieldId);
  const [value, setValue] = useState(active?.value ?? '');

  useEffect(() => {
    setFieldId(active?.fieldId ?? defaultFieldId);
    setValue(active?.value ?? '');
  }, [active?.fieldId, active?.value, defaultFieldId]);

  if (!inspection.ok || projection == null || compatibleOutputs.length === 0) return null;
  const selected = compatibleOutputs.find((output) => output.fieldId === fieldId);
  const capability =
    selected == null
      ? undefined
      : resolveDvtSubstraitFilterCapabilities({
          dataType: selected.dataType,
          provider: projection.source.sourceRef.connectionRef.provider,
        })[0];
  const apply = (): void => {
    if (selected == null || capability == null) return;
    onChange(
      applyDvtSubstraitFilter(base, {
        fieldId: selected.fieldId,
        dataType: selected.dataType,
        capabilityId: capability.capabilityId,
        value,
      })
    );
  };

  return (
    <div data-slot="dvt-filter-authoring" className="space-y-3">
      <h3 className={inspectorVisualClasses.contextPanelSectionTitle}>
        {canvasViewCopy.inspectorDvtFilterTitle}
      </h3>
      {active ? (
        <p data-slot="dvt-filter-active" className="text-xs text-(--text-muted)">
          {active.fieldName} = {JSON.stringify(active.value)}
        </p>
      ) : null}
      <div className="space-y-1">
        <Label htmlFor="dvt-filter-field">{canvasViewCopy.inspectorDvtFilterFieldLabel}</Label>
        <select
          id="dvt-filter-field"
          name="dvt-filter-field"
          className="h-9 w-full rounded-md border border-input bg-input-background px-3 text-sm"
          disabled={disabled}
          value={fieldId}
          onChange={(event) => setFieldId(event.currentTarget.value)}
        >
          {compatibleOutputs.map((output) => (
            <option key={output.fieldId} value={output.fieldId}>
              {output.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="dvt-filter-operator">
          {canvasViewCopy.inspectorDvtFilterOperatorLabel}
        </Label>
        <select
          id="dvt-filter-operator"
          name="dvt-filter-operator"
          className="h-9 w-full rounded-md border border-input bg-input-background px-3 text-sm"
          disabled
          value="equal"
        >
          <option value="equal">{canvasViewCopy.inspectorDvtFilterEqualLabel}</option>
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="dvt-filter-value">{canvasViewCopy.inspectorDvtFilterValueLabel}</Label>
        <Input
          id="dvt-filter-value"
          name="dvt-filter-value"
          disabled={disabled}
          value={value}
          onChange={(event) => setValue(event.currentTarget.value)}
        />
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          data-slot="dvt-filter-apply"
          disabled={disabled || selected == null || capability == null}
          onClick={apply}
        >
          {canvasViewCopy.inspectorDvtFilterApplyLabel}
        </Button>
        {active ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            data-slot="dvt-filter-remove"
            disabled={disabled}
            onClick={() => onChange(removeDvtSubstraitFilter(draft))}
          >
            {canvasViewCopy.inspectorDvtFilterRemoveLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
