/** Confirm ordered predicate-free composition without owning canonical construction. */
import { inspectorVisualClasses } from '../../components/inspector/inspectorVisualTokens';
import { Button } from '../../components/ui/button';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import type { CanvasSetOperation } from './canvasRelationalOperationChoices';
import { canvasViewCopy } from './copy';
import { canvasRelationalOperationPresentation } from './canvasRelationalOperationPresentation';

export type CanvasPredicateFreeOperation = CanvasSetOperation | 'cross_join';

export function DvtRelationCompositionConfirmation({
  disabled,
  inputs,
  operation,
  onApply,
  onCancel,
}: Readonly<{
  disabled: boolean;
  inputs: readonly CanvasDvtCompositionInput[];
  operation: CanvasPredicateFreeOperation;
  onApply: () => void;
  onCancel: () => void;
}>): JSX.Element {
  const title = canvasViewCopy[canvasRelationalOperationPresentation[operation].labelKey];
  return (
    <section data-slot="dvt-composition-confirmation" className="space-y-3">
      <h3 className={inspectorVisualClasses.contextPanelSectionTitle}>{title}</h3>
      <p className="text-xs text-(--text-muted)">
        {inputs.map((input) => `${input.schema}.${input.table}`).join(` ${title} `)}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={disabled}
          data-slot="dvt-confirm-composition"
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
