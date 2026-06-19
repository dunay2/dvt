/** Owned concern: render the Canvas-owned contextual node workbench panel. */
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import type { InspectorPanelContribution } from '../../plugins/contracts/PluginManifest';
import { getInspectorPanels } from '../../plugins/registry';
import { graphStatusDotClasses, graphVisualClasses } from '../../plugins/graph/graphVisualTokens';
import { Button } from '../../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { cn } from '../../components/ui/utils';
import type {
  NodePropertiesReadModel,
  NodePropertySection,
} from '../../components/inspector/nodePropertiesReadModel';
import { buildNodePropertiesReadModel } from '../../components/inspector/nodePropertiesReadModel';
import { resolveString } from '../../plugins/contracts/PluginManifest';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { CanvasInspectorAuthoringSection } from './CanvasInspectorAuthoringSection';
import type { CanvasInspectorAuthoringContract } from './canvasInspectorAuthoring.types';

const PRIMARY_NODE_WORKBENCH_SECTION_IDS = new Set<NodePropertySection['id']>([
  'general',
  'columns',
  'inputs-outputs',
  'tests',
  'code',
]);

type NodeWorkbenchTabItem = Readonly<{
  id: string;
  label: string;
  count: number;
}>;

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

function sectionSlot(section: NodePropertySection): string {
  return `canvas-node-workbench-${section.id}-section`;
}

function isPrimarySection(section: NodePropertySection): boolean {
  return PRIMARY_NODE_WORKBENCH_SECTION_IDS.has(section.id);
}

function renderCountBadge(count: number): JSX.Element | null {
  return count > 0 ? (
    <span className="rounded border border-(--border-subtle) px-1.5 py-0.5 text-[10px] leading-none text-(--text-muted)">
      {count}
    </span>
  ) : null;
}

function renderSectionBody(section: NodePropertySection): JSX.Element {
  if (section.code != null) {
    return (
      <pre
        data-slot="canvas-node-workbench-code"
        className={cn('max-h-80 overflow-auto p-3', graphVisualClasses.inspectorCodeBlock)}
      >
        {section.code}
      </pre>
    );
  }

  if (section.tableRows.length > 0) {
    const columnKeys = Array.from(
      new Set(section.tableRows.flatMap((row) => Object.keys(row.cells)))
    );

    return (
      <div className="max-h-80 overflow-auto rounded border border-(--border-subtle)">
        <table className="w-full border-collapse text-left text-xs">
          <thead className="sticky top-0 bg-(--surface-panel) text-(--text-muted)">
            <tr>
              {columnKeys.map((key) => (
                <th
                  key={key}
                  scope="col"
                  className="border-b border-(--border-subtle) px-2 py-2 font-medium capitalize"
                >
                  {key.replace(/([a-z])([A-Z])/g, '$1 $2')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-(--border-subtle)">
            {section.tableRows.map((row) => (
              <tr key={row.id}>
                {columnKeys.map((key) => (
                  <td
                    key={`${row.id}:${key}`}
                    className="px-2 py-2 align-top text-(--text-primary)"
                  >
                    {row.cells[key] || (
                      <span className={graphVisualClasses.inspectorSubtle}>-</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (section.rows.length > 0) {
    return (
      <dl className="grid grid-cols-[minmax(96px,0.36fr)_minmax(0,1fr)] gap-x-4 gap-y-3 text-sm">
        {section.rows.map((row) => (
          <div key={row.label} className="contents">
            <dt className={graphVisualClasses.inspectorLabel}>{row.label}</dt>
            <dd className="min-w-0 break-words text-(--text-primary)">{row.value}</dd>
          </div>
        ))}
      </dl>
    );
  }

  return (
    <p className={graphVisualClasses.inspectorBody}>
      {section.emptyState ?? 'No properties are recorded for this section.'}
    </p>
  );
}

function resolveActiveNodeWorkbenchTab({
  activeTab,
  model,
  panels,
}: Readonly<{
  activeTab?: string;
  model: NodePropertiesReadModel;
  panels: readonly InspectorPanelContribution[];
}>): string {
  if (
    activeTab != null &&
    (model.sections.some((section) => section.id === activeTab) ||
      panels.some((panel) => panel.id === activeTab))
  ) {
    return activeTab;
  }

  return model.sections[0]?.id ?? 'general';
}

function CanvasNodeWorkbenchSection({
  section,
  children,
}: Readonly<{ section: NodePropertySection; children?: ReactNode }>): JSX.Element {
  return (
    <section data-slot={sectionSlot(section)} className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className={graphVisualClasses.contextPanelSectionTitle}>{section.label}</h3>
        {renderCountBadge(section.tableRows.length)}
      </div>
      {renderSectionBody(section)}
      {children}
    </section>
  );
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
  const resolvedActiveTab = resolveActiveNodeWorkbenchTab({ activeTab, model, panels });
  const dotClass = graphStatusDotClasses[node.status] ?? graphStatusDotClasses.idle;
  const primarySections = model.sections.filter(isPrimarySection);
  const overflowSections = model.sections.filter((section) => !isPrimarySection(section));
  const overflowItems: readonly NodeWorkbenchTabItem[] = [
    ...overflowSections.map((section) => ({
      id: section.id,
      label: section.label,
      count: section.tableRows.length,
    })),
    ...panels.map((panel) => ({
      id: panel.id,
      label: resolveString(panel.label),
      count: 0,
    })),
  ];
  const activeOverflowItem = overflowItems.find((item) => item.id === resolvedActiveTab);
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
          <Tabs
            data-slot="canvas-node-workbench-tabs"
            value={resolvedActiveTab}
            onValueChange={setActiveTab}
            className="gap-4"
          >
            <TabsList
              data-slot="canvas-node-workbench-tabs-list"
              className={graphVisualClasses.contextPanelFlatTabsList}
            >
              {primarySections.map((section) => (
                <TabsTrigger
                  key={section.id}
                  value={section.id}
                  data-slot={`canvas-node-workbench-tab-${section.id}`}
                  className={graphVisualClasses.contextPanelFlatTabTrigger}
                >
                  {section.label}
                  {renderCountBadge(section.tableRows.length)}
                </TabsTrigger>
              ))}
              {overflowItems.length > 0 ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      data-slot="canvas-node-workbench-more-trigger"
                      className={cn(
                        graphVisualClasses.contextPanelFlatTabTrigger,
                        activeOverflowItem != null && 'border-(--focus-ring) text-slate-50'
                      )}
                    >
                      {activeOverflowItem == null ? 'More' : `More: ${activeOverflowItem.label}`}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="border-slate-700 bg-slate-950">
                    {overflowItems.map((item) => (
                      <DropdownMenuItem
                        key={item.id}
                        data-slot={`canvas-node-workbench-more-item-${item.id}`}
                        onSelect={() => setActiveTab(item.id)}
                      >
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        {renderCountBadge(item.count)}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </TabsList>

            {model.sections.map((section) => (
              <TabsContent key={section.id} value={section.id} className="m-0">
                <CanvasNodeWorkbenchSection section={section}>
                  {section.id === 'general' ? (
                    <div data-slot="canvas-node-workbench-authoring" className="space-y-3 pt-1">
                      <CanvasInspectorAuthoringSection
                        node={node}
                        nodes={nodes}
                        edges={edges}
                        authoring={authoring}
                      />
                    </div>
                  ) : null}
                </CanvasNodeWorkbenchSection>
              </TabsContent>
            ))}

            {panels.map((panel) => {
              const PanelComponent = panel.component;
              return (
                <TabsContent key={panel.id} value={panel.id} className="m-0">
                  <PanelComponent node={node} activeRunId={activeRunId} onClose={onClose} />
                </TabsContent>
              );
            })}
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
}
