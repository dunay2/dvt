/** Owned concern: render the Canvas-owned contextual node workbench panel. */
import { useEffect, useState } from 'react';

import { getInspectorPanels } from '../../plugins/registry';
import { graphStatusDotClasses, graphVisualClasses } from '../../plugins/graph/graphVisualTokens';
import { Button } from '../../components/ui/button';
import { ScrollArea } from '../../components/ui/scroll-area';
import { cn } from '../../components/ui/utils';
import { NodePropertiesTabs } from '../../components/inspector/NodePropertiesTabs';
import type { NodePropertiesReadModel } from '../../components/inspector/nodePropertiesReadModel';
import { buildNodePropertiesReadModel } from '../../components/inspector/nodePropertiesReadModel';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { CanvasInspectorAuthoringSection } from './CanvasInspectorAuthoringSection';
import type { CanvasInspectorAuthoringContract } from './canvasInspectorAuthoring.types';

export type CanvasNodeWorkbenchPanelProps = Readonly<{
  node: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  activeRunId: string | null;
  registeredPlugins?: ReadonlySet<string>;
  preferredTabId?: string | null;
  preferredTabRequestId?: number;
  authoring: CanvasInspectorAuthoringContract;
  onClose: () => void;
}>;

function resolveActiveNodeWorkbenchTab({
  activeTab,
  model,
  panelIds,
}: Readonly<{
  activeTab?: string;
  model: NodePropertiesReadModel;
  panelIds: readonly string[];
}>): string {
  if (
    activeTab != null &&
    (model.sections.some((section) => section.id === activeTab) || panelIds.includes(activeTab))
  ) {
    return activeTab;
  }

  return model.sections[0]?.id ?? 'general';
}

export function CanvasNodeWorkbenchPanel({
  node,
  nodes,
  edges,
  activeRunId,
  registeredPlugins = new Set(),
  preferredTabId = null,
  preferredTabRequestId = 0,
  authoring,
  onClose,
}: CanvasNodeWorkbenchPanelProps): JSX.Element {
  const [activeTab, setActiveTab] = useState<string | undefined>(() => preferredTabId ?? undefined);
  const [appliedPreferredTabKey, setAppliedPreferredTabKey] = useState<string | null>(null);
  const model = buildNodePropertiesReadModel({ node, nodes, edges });
  const panels = getInspectorPanels(node, { activeRunId, registeredPlugins });
  const panelIds = panels.map((panel) => panel.id);
  const resolvedActiveTab = resolveActiveNodeWorkbenchTab({ activeTab, model, panelIds });
  const dotClass = graphStatusDotClasses[node.status] ?? graphStatusDotClasses.idle;
  const preferredTabKey =
    preferredTabId == null ? null : `${node.id}:${preferredTabId}:${preferredTabRequestId}`;

  useEffect(() => {
    if (preferredTabKey == null || preferredTabKey === appliedPreferredTabKey) {
      return;
    }

    setActiveTab(preferredTabId ?? undefined);
    setAppliedPreferredTabKey(preferredTabKey);
  }, [appliedPreferredTabKey, preferredTabId, preferredTabKey]);

  useEffect(() => {
    if (activeTab !== resolvedActiveTab) {
      setActiveTab(resolvedActiveTab);
    }
  }, [activeTab, resolvedActiveTab]);

  return (
    <div data-slot="canvas-node-workbench-panel" className="flex h-full min-h-0 flex-col">
      <div className={graphVisualClasses.contextPanelHeaderRow}>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className={cn('size-2 shrink-0 rounded-full', dotClass)} />
            <h2 className={cn('truncate', graphVisualClasses.contextPanelTitle)}>{node.name}</h2>
          </div>
          <p className={cn('font-mono', graphVisualClasses.contextPanelSubtitle)}>{node.kind}</p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 p-4">
          <NodePropertiesTabs
            node={node}
            model={model}
            activeRunId={activeRunId}
            panels={panels}
            activeTab={resolvedActiveTab}
            beforePanels={
              <div data-slot="canvas-node-workbench-authoring" className="space-y-3 pt-1">
                <CanvasInspectorAuthoringSection
                  node={node}
                  nodes={nodes}
                  edges={edges}
                  authoring={authoring}
                />
              </div>
            }
            slotPrefix="canvas-node-workbench"
            surface="workbench"
            showSectionCountBadge
            onActiveTabChange={setActiveTab}
            onHide={onClose}
          />
        </div>
      </ScrollArea>
    </div>
  );
}
