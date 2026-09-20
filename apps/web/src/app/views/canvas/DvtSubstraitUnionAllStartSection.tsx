/** Owned concern: confirm one compatible SetRel without manufacturing a predicate. */
import { inspectorVisualClasses } from '../../components/inspector/inspectorVisualTokens';
import { Button } from '../../components/ui/button';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import type { DvtSubstraitSetOperation } from './canvasDvtSubstraitSetComposition';
import { canvasViewCopy } from './copy';

function titleFor(operation: DvtSubstraitSetOperation): string {
  switch (operation) {
    case 'union_all':
      return canvasViewCopy.inspectorDvtSubstraitUnionAllTitle;
    case 'union_distinct':
      return canvasViewCopy.inspectorDvtSubstraitUnionDistinctTitle;
    case 'intersect_distinct':
      return canvasViewCopy.inspectorDvtSubstraitIntersectDistinctTitle;
    case 'except_distinct':
      return canvasViewCopy.inspectorDvtSubstraitExceptDistinctTitle;
    case 'intersect_all':
      return canvasViewCopy.inspectorDvtSubstraitIntersectAllTitle;
    case 'except_all':
      return canvasViewCopy.inspectorDvtSubstraitExceptAllTitle;
  }
}

export function DvtSubstraitUnionAllStartSection({
  disabled,
  inputs,
  operation = 'union_all',
  onApply,
  onCancel,
}: Readonly<{
  disabled: boolean;
  inputs: readonly CanvasDvtCompositionInput[];
  operation?: DvtSubstraitSetOperation;
  onApply: () => void;
  onCancel: () => void;
}>): JSX.Element {
  return (
    <section data-slot="dvt-substrait-union-all-start" className="space-y-3">
      <h3 className={inspectorVisualClasses.contextPanelSectionTitle}>{titleFor(operation)}</h3>
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
