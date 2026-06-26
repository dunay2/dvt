/** Owned concern: render the Canvas-owned contextual node workbench panel. */
import { useCallback, useEffect, useState } from 'react';

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
import { createCanvasInspectorNodeDraft } from './canvasInspectorAuthoringModel';
import type { CanvasInspectorAuthoringContract } from './canvasInspectorAuthoring.types';
import { resolveNodeWorkbenchPrimarySectionIds } from './canvasNodeWorkbenchSectionStrategy';

export type CanvasNodeWorkbenchPanelProps = Readonly<{
  node: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  activeRunId: string | null;
  registeredPlugins?: ReadonlySet<string>;
  preferredTabId?: string | null;
  preferredTabRequestId?: number;
  primarySectionIds?: readonly string[];
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
  primarySectionIds,
  authoring,
  onClose,
}: CanvasNodeWorkbenchPanelProps): JSX.Element {
  const [activeTab, setActiveTab] = useState<string | undefined>(() => preferredTabId ?? undefined);
  const [appliedPreferredTabKey, setAppliedPreferredTabKey] = useState<string | null>(null);
  const [authoringDraft, setAuthoringDraft] = useState(() => createCanvasInspectorNodeDraft(node));
  const [authoringTagsText, setAuthoringTagsText] = useState(() =>
    createCanvasInspectorNodeDraft(node).tags.join(', ')
  );
  const model = buildNodePropertiesReadModel({ node, nodes, edges });
  const panels = getInspectorPanels(node, { activeRunId, registeredPlugins });
  const resolvedPrimarySectionIds =
    primarySectionIds == null
      ? undefined
      : resolveNodeWorkbenchPrimarySectionIds(primarySectionIds);
  const panelIds = panels.map((panel) => panel.id);
  const resolvedActiveTab = resolveActiveNodeWorkbenchTab({ activeTab, model, panelIds });
  const dotClass = graphStatusDotClasses[node.status] ?? graphStatusDotClasses.idle;
  const preferredTabKey =
    preferredTabId == null ? null : `${node.id}:${preferredTabId}:${preferredTabRequestId}`;
  const resetAuthoringDraft = useCallback(() => {
    const nextDraft = createCanvasInspectorNodeDraft(node);
    setAuthoringDraft(nextDraft);
    setAuthoringTagsText(nextDraft.tags.join(', '));
  }, [node.description, node.id, node.metadata, node.name, node.tags]);
  const renderAuthoringSection = (section: 'general' | 'columns' | 'code'): JSX.Element => (
    <div data-slot="canvas-node-workbench-authoring" className="space-y-3 pt-1">
      <CanvasInspectorAuthoringSection
        node={node}
        nodes={nodes}
        edges={edges}
        authoring={authoring}
        section={section}
        draftController={{
          draft: authoringDraft,
          tagsText: authoringTagsText,
          onDraftChange: setAuthoringDraft,
          onTagsTextChange: setAuthoringTagsText,
          onResetDraft: resetAuthoringDraft,
        }}
      />
    </div>
  );

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

  useEffect(() => {
    resetAuthoringDraft();
  }, [resetAuthoringDraft]);

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
            primarySectionIds={resolvedPrimarySectionIds}
            sectionChildren={{
              general: renderAuthoringSection('general'),
              columns: renderAuthoringSection('columns'),
              code: renderAuthoringSection('code'),
            }}
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
