/** Owned concern: render the passive Inspector shell over core node details and plugin-owned read-only panels. */
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { PanelRightClose } from 'lucide-react';

import type { CanonicalEdge, CanonicalNode } from '../types/canonical';
import type {
  InspectorContext,
  InspectorPanelContribution,
} from '../plugins/contracts/PluginManifest';
import { getInspectorPanels } from '../plugins/registry';
import { graphStatusDotClasses, graphVisualClasses } from '../plugins/graph/graphVisualTokens';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { cn } from './ui/utils';
import { NodePropertiesTabs } from './inspector/NodePropertiesTabs';
import { buildNodePropertiesReadModel } from './inspector/nodePropertiesReadModel';

// ---------------------------------------------------------------------------
// InspectorPanel
// ---------------------------------------------------------------------------

interface InspectorPanelProps {
  node: CanonicalNode | null;
  nodes?: readonly CanonicalNode[];
  edges?: readonly CanonicalEdge[];
  activeRunId: string | null;
  registeredPlugins?: ReadonlySet<string>;
  preferredTabId?: string | null;
  panels?: readonly InspectorPanelContribution[];
  onHide: () => void;
  beforePanels?: ReactNode;
  tagsEditor?: ReactNode;
}

export default function InspectorPanel({
  node,
  nodes = [],
  edges = [],
  activeRunId,
  registeredPlugins = new Set(),
  preferredTabId = null,
  panels: panelOverrides,
  onHide,
  beforePanels,
  tagsEditor,
}: Readonly<InspectorPanelProps>) {
  const [activeTab, setActiveTab] = useState<string | undefined>(() => preferredTabId ?? undefined);
  const [appliedPreferredTabKey, setAppliedPreferredTabKey] = useState<string | null>(null);

  const ctx: InspectorContext = { activeRunId, registeredPlugins };
  const panels = node ? (panelOverrides ?? getInspectorPanels(node, ctx)) : [];
  const preferredTabKey =
    node != null && preferredTabId != null ? `${node.id}:${preferredTabId}` : null;

  useEffect(() => {
    if (preferredTabKey == null || preferredTabKey === appliedPreferredTabKey) {
      return;
    }

    setActiveTab(preferredTabId ?? undefined);
    setAppliedPreferredTabKey(preferredTabKey);
  }, [appliedPreferredTabKey, preferredTabId, preferredTabKey]);

  if (!node) {
    return (
      <div className={graphVisualClasses.contextPanelRightShell}>
        <PanelHeader title="Inspector" status={null} kind="" onHide={onHide} />
        {beforePanels ? (
          <ScrollArea className="flex-1">
            <div className="space-y-4 p-4">{beforePanels}</div>
          </ScrollArea>
        ) : (
          <div className="flex flex-1 items-center justify-center px-6">
            <div className={graphVisualClasses.contextPanelEmptyText}>
              <p>Select a node to inspect.</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={graphVisualClasses.contextPanelRightShell}>
      <PanelHeader title={node.name} status={node.status} kind={node.kind} onHide={onHide} />
      <ScrollArea className="flex-1">
        <div className="space-y-4 p-4">
          <CoreNodeDetails
            node={node}
            nodes={nodes}
            edges={edges}
            activeRunId={activeRunId}
            onHide={onHide}
            beforePanels={beforePanels}
            tagsEditor={tagsEditor}
            panels={panels}
            activeTab={activeTab}
            onActiveTabChange={setActiveTab}
          />
        </div>
      </ScrollArea>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PanelHeader
// ---------------------------------------------------------------------------

type PanelHeaderProps = {
  title: string;
  status: string | null;
  kind: string;
  onHide: () => void;
};

function PanelHeader({ title, status, kind, onHide }: PanelHeaderProps) {
  const dotClass = status ? (graphStatusDotClasses[status] ?? graphStatusDotClasses.idle) : null;

  return (
    <div className={graphVisualClasses.contextPanelHeaderRow}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {dotClass && <div className={cn('size-2 shrink-0 rounded-full', dotClass)} />}
          <h2 className={cn('truncate', graphVisualClasses.contextPanelTitle)}>{title}</h2>
        </div>
        {kind && <p className={cn('font-mono', graphVisualClasses.contextPanelSubtitle)}>{kind}</p>}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn('shrink-0', graphVisualClasses.contextPanelIconButton)}
        onClick={onHide}
        aria-label="Hide inspector panel"
      >
        <PanelRightClose className="size-4" />
      </Button>
    </div>
  );
}

function CoreNodeDetails({
  node,
  nodes,
  edges,
  activeRunId,
  onHide,
  beforePanels,
  tagsEditor,
  panels,
  activeTab,
  onActiveTabChange,
}: Readonly<{
  node: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  activeRunId: string | null;
  onHide: () => void;
  beforePanels?: ReactNode;
  tagsEditor?: ReactNode;
  panels: readonly InspectorPanelContribution[];
  activeTab?: string;
  onActiveTabChange: (tab: string) => void;
}>) {
  const model = buildNodePropertiesReadModel({ node, nodes, edges });
  const resolvedActiveTab = resolveActiveInspectorTab({
    activeTab,
    sectionIds: model.sections.map((section) => section.id),
    panels,
  });

  useEffect(() => {
    if (activeTab !== resolvedActiveTab) {
      onActiveTabChange(resolvedActiveTab);
    }
  }, [activeTab, onActiveTabChange, resolvedActiveTab]);

  return (
    <NodePropertiesTabs
      node={node}
      model={model}
      activeRunId={activeRunId}
      panels={panels}
      activeTab={resolvedActiveTab}
      beforePanels={beforePanels}
      tagsEditor={tagsEditor}
      onActiveTabChange={onActiveTabChange}
      onHide={onHide}
    />
  );
}

function resolveActiveInspectorTab({
  activeTab,
  sectionIds,
  panels,
}: Readonly<{
  activeTab?: string;
  sectionIds: readonly string[];
  panels: readonly InspectorPanelContribution[];
}>): string {
  if (
    activeTab != null &&
    (sectionIds.includes(activeTab) || panels.some((panel) => panel.id === activeTab))
  ) {
    return activeTab;
  }

  return sectionIds[0] ?? 'general';
}
