/** Reuse the existing unary editor after a staged card receives its explicit Input. */
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import { CanvasRelationalTreeOperatorForm } from './CanvasRelationalTreeOperatorForm';
import type { CanvasStagedOperation } from './canvasStagedOperation';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import { useSelectedRelationTool } from './useSelectedRelationTool';
import type { CanvasRelationalOperatorTool } from './relational-operator-form/OperatorTool';
import { resolveCanvasRelationalOperationPresentation } from './canvasRelationalOperationPresentation';

type ConfigurableOperation = CanvasRelationalOperatorTool['id'];
const configurable = new Set<ConfigurableOperation>([
  'filter',
  'aggregate',
  'window',
  'sort',
  'fetch',
]);

function isConfigurable(
  operation: CanvasStagedOperation['operation']
): operation is ConfigurableOperation {
  return configurable.has(operation as ConfigurableOperation);
}

export function CanvasStagedOperationInspector({
  staged,
  draft,
  copy,
  onChange,
  onComplete,
  onRemove,
  onPendingChange,
}: Readonly<{
  staged: CanvasStagedOperation;
  draft: SubstraitDocument | null;
  copy: CanvasRelationalTreeWorkbenchCopy;
  onChange: (document: SubstraitDocument) => void;
  onComplete: () => void;
  onRemove: () => void;
  onPendingChange: (pending: boolean) => void;
}>): JSX.Element | null {
  const operation = isConfigurable(staged.operation) ? staged.operation : null;
  if (operation == null) return null;
  return (
    <CanvasStagedUnaryOperationInspector
      operation={operation}
      staged={staged}
      draft={draft}
      copy={copy}
      onChange={onChange}
      onComplete={onComplete}
      onRemove={onRemove}
      onPendingChange={onPendingChange}
    />
  );
}

function CanvasStagedUnaryOperationInspector({
  operation,
  staged,
  draft,
  copy,
  onChange,
  onComplete,
  onRemove,
  onPendingChange,
}: Readonly<{
  operation: ConfigurableOperation;
  staged: CanvasStagedOperation;
  draft: SubstraitDocument | null;
  copy: CanvasRelationalTreeWorkbenchCopy;
  onChange: (document: SubstraitDocument) => void;
  onComplete: () => void;
  onRemove: () => void;
  onPendingChange: (pending: boolean) => void;
}>): JSX.Element | null {
  const relationId = staged.inputs[0] ?? null;
  const selected = useSelectedRelationTool(relationId, operation, 'insert');
  if (draft == null || relationId == null || selected == null) return null;
  const title = copy[resolveCanvasRelationalOperationPresentation(operation).labelKey];
  return (
    <aside className="w-80 shrink-0 overflow-y-auto border-l border-(--border-subtle) bg-(--surface-panel) p-4">
      <h2 className="mb-4 text-sm font-semibold text-(--text-strong)">{title}</h2>
      <CanvasRelationalTreeOperatorForm
        tool={selected.tool}
        draft={draft}
        title={title}
        targetRelationId={relationId}
        inline
        onPendingChange={onPendingChange}
        onClose={onRemove}
        onChange={(document) => {
          onChange(document);
          onComplete();
        }}
      />
    </aside>
  );
}
