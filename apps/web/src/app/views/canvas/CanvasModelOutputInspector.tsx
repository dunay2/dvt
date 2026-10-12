/** Fixed Model inspector backed by the canonical relational projection and output command. */
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import { Database } from 'lucide-react';

import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { CanvasRelationOutputs } from './CanvasRelationOutputs';
import { projectCanvasModelComposition } from './canvasModelCompositionProjection';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
import { resolveCanvasRelationalNodeCopy } from './canvasRelationalNodePresentation';
import type { CanvasRelationalTreeNode } from './canvasRelationalTreeProjection';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import { CanvasRelationalTreeEditorFrame } from './CanvasRelationalTreeEditorFrame';

export function CanvasModelOutputInspector({
  modelName,
  root,
  copy,
  editable,
  onOutputChange,
  onPendingOutputChange,
  onClose,
}: Readonly<{
  modelName: string;
  root: CanvasRelationalTreeNode;
  copy: CanvasRelationalTreeWorkbenchCopy;
  editable: boolean;
  onOutputChange: (document: SubstraitDocument) => void | boolean;
  onPendingOutputChange: (pending: boolean) => void;
  onClose: () => void;
}>): JSX.Element | null {
  const relationId = root.relationId;
  const language = useApplicationLanguageStore((state) => state.language);
  const labels = resolveCanvasSemanticEditorCopy(language);
  if (relationId == null) return null;
  const steps = projectCanvasModelComposition(root);

  return (
    <CanvasRelationalTreeEditorFrame
      operation="projection"
      label={modelName}
      relationId={relationId}
      hasExpression={false}
      onClose={onClose}
      dataSlot="canvas-model-output-inspector"
      output={
        <CanvasRelationOutputs
          relationId={relationId}
          disabled={!editable}
          onChange={onOutputChange}
          onPendingChange={onPendingOutputChange}
        />
      }
    >
      <h4 className="mb-2 text-xs font-semibold text-(--text-primary)">{labels.operations}</h4>
      <ol className="space-y-2" data-slot="canvas-model-composition-steps">
        {steps.map((step, index) => {
          const presentation = resolveCanvasRelationalNodeCopy(step.node, copy);
          const Icon = step.kind === 'input' ? Database : presentation.presentation.icon;
          return (
            <li
              key={step.locator}
              data-kind={step.kind}
              data-operator={step.node.operator}
              className="flex items-start gap-3 rounded-md border border-(--border-subtle) bg-(--surface-subtle) px-3 py-2.5"
            >
              <span className="grid size-6 shrink-0 place-items-center rounded-full border border-(--border-default) text-[10px] text-(--text-muted)">
                {index + 1}
              </span>
              <Icon aria-hidden="true" className="mt-1 size-4 shrink-0 text-(--status-info)" />
              <span className="min-w-0">
                <span className="block truncate text-xs font-semibold text-(--text-primary)">
                  {presentation.title}
                </span>
                {step.kind === 'input' ? null : (
                  <span className="block truncate text-[11px] text-(--text-muted)">
                    {presentation.detail}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </CanvasRelationalTreeEditorFrame>
  );
}
