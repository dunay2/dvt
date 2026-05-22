/** Owned concern: render the passive Inspector shell over core node details and plugin-owned read-only panels. */
import { useState } from 'react';
import type { ReactNode } from 'react';
import { PanelRightClose } from 'lucide-react';

import type { CanonicalNode } from '../types/canonical';
import type { InspectorContext } from '../plugins/contracts/PluginManifest';
import { getInspectorPanels } from '../plugins/registry';
import { resolveString } from '../plugins/contracts/PluginManifest';
import { graphStatusDotClasses, graphVisualClasses } from '../plugins/graph/graphVisualTokens';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { cn } from './ui/utils';

// ---------------------------------------------------------------------------
// InspectorPanel
// ---------------------------------------------------------------------------

interface InspectorPanelProps {
  node: CanonicalNode | null;
  activeRunId: string | null;
  registeredPlugins?: ReadonlySet<string>;
  onHide: () => void;
  beforePanels?: ReactNode;
}

export default function InspectorPanel({
  node,
  activeRunId,
  registeredPlugins = new Set(),
  onHide,
  beforePanels,
}: Readonly<InspectorPanelProps>) {
  const [activeTab, setActiveTab] = useState<string | undefined>(undefined);

  const ctx: InspectorContext = { activeRunId, registeredPlugins };
  const panels = node ? getInspectorPanels(node, ctx) : [];
  const defaultTab = panels[0]?.id;

  if (!node) {
    return (
      <div className={graphVisualClasses.contextPanelRightShell}>
        <PanelHeader title="Inspector" status={null} kind="" onHide={onHide} />
        <div className="flex flex-1 items-center justify-center px-6">
          <div className={graphVisualClasses.contextPanelEmptyText}>
            <p>Select a node to inspect.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={graphVisualClasses.contextPanelRightShell}>
      <PanelHeader title={node.name} status={node.status} kind={node.kind} onHide={onHide} />
      <ScrollArea className="flex-1">
        <div className="space-y-4 p-4">
          <CoreNodeDetails node={node} />
          {beforePanels}

          {panels.length === 0 ? (
            <Card
              className={cn(graphVisualClasses.inspectorCard, graphVisualClasses.inspectorMuted)}
            >
              No plugin inspector panels are registered for this node.
            </Card>
          ) : (
            <Tabs
              value={activeTab ?? defaultTab}
              onValueChange={setActiveTab}
              className="flex flex-1 flex-col overflow-hidden"
            >
              <TabsList className={graphVisualClasses.contextPanelTabsList}>
                {panels.map((panel) => {
                  const Icon = panel.icon;
                  return (
                    <TabsTrigger
                      key={panel.id}
                      value={panel.id}
                      className={graphVisualClasses.contextPanelTabsTrigger}
                    >
                      <Icon className="mr-1 size-3" />
                      {resolveString(panel.label)}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {panels.map((panel) => {
                const PanelComponent = panel.component;
                return (
                  <TabsContent key={panel.id} value={panel.id} className="m-0 pt-3">
                    <PanelComponent node={node} activeRunId={activeRunId} onClose={onHide} />
                  </TabsContent>
                );
              })}
            </Tabs>
          )}
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

function CoreNodeDetails({ node }: Readonly<{ node: CanonicalNode }>) {
  const sql =
    typeof node.metadata?.compiledSql === 'string'
      ? node.metadata.compiledSql
      : typeof node.metadata?.sql === 'string'
        ? node.metadata.sql
        : null;

  return (
    <div className="space-y-3">
      <Card className={graphVisualClasses.inspectorCard}>
        <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
          <span className={graphVisualClasses.inspectorLabel}>Type</span>
          <span className="truncate">{node.kind}</span>
          <span className={graphVisualClasses.inspectorLabel}>Status</span>
          <span className="capitalize">{node.status}</span>
          <span className={graphVisualClasses.inspectorLabel}>Role</span>
          <span className="capitalize">{node.role}</span>
          {node.lastDuration != null && (
            <>
              <span className={graphVisualClasses.inspectorLabel}>Duration</span>
              <span>{node.lastDuration}s</span>
            </>
          )}
          {node.lastCost != null && (
            <>
              <span className={graphVisualClasses.inspectorLabel}>Cost</span>
              <span>${node.lastCost.toFixed(2)}</span>
            </>
          )}
        </div>
        {node.path && (
          <p className={cn('mt-2 truncate font-mono text-xs', graphVisualClasses.inspectorLabel)}>
            {node.path}
          </p>
        )}
      </Card>

      {sql && (
        <Card className={graphVisualClasses.inspectorCard}>
          <h3 className={graphVisualClasses.contextPanelSectionTitle}>Code</h3>
          <pre
            className={cn('mt-2 max-h-44 overflow-auto p-2', graphVisualClasses.inspectorCodeBlock)}
          >
            {sql}
          </pre>
        </Card>
      )}
    </div>
  );
}
