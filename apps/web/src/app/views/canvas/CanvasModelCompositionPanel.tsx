/** Movable Model summary backed by the canonical relational projection and output command. */
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import { Database, GitBranch } from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { CanvasContextualWorkbenchPanel } from './CanvasContextualWorkbenchPanel';
import { CanvasRelationOutputs } from './CanvasRelationOutputs';
import { resolveCanvasModelCompositionCopy } from './canvasModelCompositionCopy';
import { projectCanvasModelComposition } from './canvasModelCompositionProjection';
import { resolveCanvasRelationalNodePresentation } from './canvasRelationalNodePresentation';
import type { CanvasRelationalTreeNode } from './canvasRelationalTreeProjection';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import { useCanvasNodeWorkbenchPosition } from './useCanvasNodeWorkbenchPosition';

export function CanvasModelCompositionPanel({
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
  const labels = resolveCanvasModelCompositionCopy(language);
  const position = useCanvasNodeWorkbenchPosition(relationId != null);
  if (relationId == null) return null;
  const steps = projectCanvasModelComposition(root);

  return (
    <div
      ref={position.surfaceRef}
      data-slot="canvas-model-composition"
      className="absolute z-30 flex h-[min(38rem,calc(100%-2rem))] w-[min(26rem,calc(100%-2rem))] overflow-hidden rounded-md border border-(--border-default) bg-(--surface-panel) shadow-2xl"
      style={{ left: position.position.left, top: position.position.top }}
      {...position.surfacePointerProps}
    >
      <CanvasContextualWorkbenchPanel
        title={`${labels.title} · ${modelName}`}
        closeLabel={labels.close}
        moveLabel={labels.move}
        onClose={onClose}
        dragHandleProps={position.dragHandleProps}
        className="h-full w-full sm:w-full sm:max-w-none"
      >
        <Tabs defaultValue="output" className="h-full min-h-0 gap-0">
          <TabsList className="workspace-navigation-tabs w-full border-b border-(--border-subtle)">
            <TabsTrigger
              value="output"
              data-slot="canvas-model-composition-output-tab"
              className="workspace-navigation-tab"
            >
              <Database aria-hidden="true" className="size-3.5" />
              {labels.output}
              <span className="text-[10px] text-(--text-muted)">{root.output.fields.length}</span>
            </TabsTrigger>
            <TabsTrigger
              value="operations"
              data-slot="canvas-model-composition-operations-tab"
              className="workspace-navigation-tab"
            >
              <GitBranch aria-hidden="true" className="size-3.5" />
              {labels.operations}
              <span className="text-[10px] text-(--text-muted)">{steps.length}</span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="output" className="m-0 min-h-0 overflow-auto p-4">
            <CanvasRelationOutputs
              relationId={relationId}
              disabled={!editable}
              onChange={onOutputChange}
              onPendingChange={onPendingOutputChange}
            />
          </TabsContent>
          <TabsContent value="operations" className="m-0 min-h-0 overflow-auto p-4">
            <ol className="space-y-2" data-slot="canvas-model-composition-steps">
              {steps.map((step, index) => {
                const presentation = resolveCanvasRelationalNodePresentation(step.node);
                const Icon = step.kind === 'input' ? Database : presentation.presentation.icon;
                const title =
                  step.kind === 'input'
                    ? (step.node.displayName ?? step.node.substraitKind)
                    : copy[presentation.presentation.labelKey];
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
                    <Icon
                      aria-hidden="true"
                      className="mt-1 size-4 shrink-0 text-(--status-info)"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-semibold text-(--text-primary)">
                        {title}
                      </span>
                      {step.kind === 'input' || step.node.displayName == null ? null : (
                        <span className="block truncate text-[11px] text-(--text-muted)">
                          {step.node.displayName}
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ol>
          </TabsContent>
        </Tabs>
      </CanvasContextualWorkbenchPanel>
    </div>
  );
}
