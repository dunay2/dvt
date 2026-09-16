/** Owned concern: confirm one compatible UNION ALL without manufacturing a predicate. */
import { inspectorVisualClasses } from '../../components/inspector/inspectorVisualTokens';
import { Button } from '../../components/ui/button';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import { canvasViewCopy } from './copy';

export function DvtSubstraitUnionAllStartSection({
  disabled,
  inputs,
  onApply,
  onCancel,
}: Readonly<{
  disabled: boolean;
  inputs: readonly CanvasDvtCompositionInput[];
  onApply: () => void;
  onCancel: () => void;
}>): JSX.Element {
  return (
    <section data-slot="dvt-substrait-union-all-start" className="space-y-3">
      <h3 className={inspectorVisualClasses.contextPanelSectionTitle}>
        {canvasViewCopy.inspectorDvtSubstraitUnionAllTitle}
      </h3>
      <p className="text-xs text-(--text-muted)">
        {inputs.map((input) => `${input.schema}.${input.table}`).join(' + ')}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={disabled}
          data-slot="dvt-start-connected-union-all"
          onClick={onApply}
        >
          {canvasViewCopy.inspectorDvtRelationalApply}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          data-slot="dvt-cancel-relational-operation"
          onClick={onCancel}
        >
          {canvasViewCopy.inspectorDvtRelationalCancel}
        </Button>
      </div>
    </section>
  );
}
