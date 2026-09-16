/** Owned concern: show the ordered relation draft without introducing a second semantic tree. */
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import { canvasRelationalOperationLabel } from './DvtRelationalOperationChooser';

export function CanvasRelationalTreeDraftView({
  copy,
  inputs,
  operation,
  selectedInputIds,
}: Readonly<{
  copy: CanvasRelationalTreeWorkbenchCopy;
  inputs: readonly CanvasDvtCompositionInput[];
  operation: CanvasRelationalOperation | null;
  selectedInputIds: readonly string[];
}>): JSX.Element {
  const inputById = new Map(inputs.map((input) => [input.nodeId, input] as const));
  return (
    <section
      data-slot="canvas-relational-tree-draft"
      aria-label={copy.relationalTreeLabel}
      className="min-h-64 overflow-auto p-4"
    >
      <div className="inline-flex rounded border border-(--status-info) px-3 py-2 text-[10px] font-bold uppercase text-(--status-info)">
        {operation == null
          ? copy.relationalTreeOutputLabel
          : canvasRelationalOperationLabel(operation, copy)}
      </div>
      <ol className="ml-5 border-l border-(--border-subtle) pl-4">
        {selectedInputIds.map((nodeId, index) => {
          const input = inputById.get(nodeId);
          return (
            <li key={nodeId} className="mt-3">
              <span className="mb-1 block text-[9px] font-semibold uppercase text-(--text-muted)">
                {index === 0
                  ? copy.inspectorDvtRelationalLeftInput
                  : copy.inspectorDvtRelationalRightInput}
              </span>
              <span className="inline-flex rounded border border-(--border-subtle) bg-(--surface-subtle) px-3 py-2 font-mono text-[10px]">
                {input?.schema}.{input?.table}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
