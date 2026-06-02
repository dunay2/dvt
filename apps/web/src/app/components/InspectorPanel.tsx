/** Owned concern: render the passive Inspector shell over core node details and plugin-owned read-only panels. */
import { useState } from 'react';
import type { ReactNode } from 'react';
import { PanelRightClose } from 'lucide-react';

import type { CanonicalEdge, CanonicalNode } from '../types/canonical';
import type {
  InspectorContext,
  InspectorPanelContribution,
} from '../plugins/contracts/PluginManifest';
import { getInspectorPanels } from '../plugins/registry';
import { resolveString } from '../plugins/contracts/PluginManifest';
import { graphStatusDotClasses, graphVisualClasses } from '../plugins/graph/graphVisualTokens';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { cn } from './ui/utils';

// ---------------------------------------------------------------------------
// InspectorPanel
// ---------------------------------------------------------------------------

interface InspectorPanelProps {
  node: CanonicalNode | null;
  nodes?: readonly CanonicalNode[];
  edges?: readonly CanonicalEdge[];
  activeRunId: string | null;
  registeredPlugins?: ReadonlySet<string>;
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
  onHide,
  beforePanels,
  tagsEditor,
}: Readonly<InspectorPanelProps>) {
  const [activeTab, setActiveTab] = useState<string | undefined>(undefined);

  const ctx: InspectorContext = { activeRunId, registeredPlugins };
  const panels = node ? getInspectorPanels(node, ctx) : [];
  const defaultTab = 'details';

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
            activeTab={activeTab ?? defaultTab}
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
  activeTab: string;
  onActiveTabChange: (tab: string) => void;
}>) {
  type InspectorColumn = Readonly<{
    name: string;
    type: string;
    nullable?: boolean;
    description?: string;
  }>;

  function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  function asRecord(value: unknown): Record<string, unknown> {
    return isRecord(value) ? value : {};
  }

  function readString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
  }

  function readBoolean(value: unknown): boolean | undefined {
    return typeof value === 'boolean' ? value : undefined;
  }

  function readNumber(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
  }

  function readFirstString(...values: readonly unknown[]): string | undefined {
    for (const value of values) {
      const text = readString(value);
      if (text != null) {
        return text;
      }
    }

    return undefined;
  }

  function formatWords(value: string): string {
    const words = value.replace(/[_-]+/g, ' ').trim();
    return words.length > 0 ? words.charAt(0).toUpperCase() + words.slice(1) : value;
  }

  function formatCost(value: number): string {
    return `$${value.toFixed(2)}`;
  }

  function readColumns(value: unknown): readonly InspectorColumn[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.flatMap((candidate): readonly InspectorColumn[] => {
      if (!isRecord(candidate)) {
        return [];
      }

      const name = readString(candidate.name);
      if (name == null) {
        return [];
      }

      return [
        {
          name,
          type: readString(candidate.type) ?? 'unknown',
          nullable: readBoolean(candidate.nullable),
          description: readString(candidate.description),
        },
      ];
    });
  }

  const metadata = asRecord(node.metadata);
  const config = asRecord(metadata.config);
  const dbt = asRecord(metadata.dbt);
  const columns = readColumns(metadata.columns);
  const nodeById = new Map(nodes.map((candidate) => [candidate.id, candidate]));
  const upstreamNodes = edges
    .filter((edge) => edge.targetId === node.id)
    .map((edge) => nodeById.get(edge.sourceId)?.name ?? edge.sourceId);
  const downstreamNodes = edges
    .filter((edge) => edge.sourceId === node.id)
    .map((edge) => nodeById.get(edge.targetId)?.name ?? edge.targetId);
  const sql =
    readString(metadata.compiledSql) ?? readString(metadata.sql) ?? readString(config.sql) ?? null;

  const summaryRows: Array<readonly [string, string]> = [];
  const addRow = (label: string, value: string | undefined | null): void => {
    if (value != null && value.trim().length > 0) {
      summaryRows.push([label, value]);
    }
  };

  addRow('Type', readString(metadata.typeLabel) ?? node.kind);
  addRow('Status', formatWords(node.status));
  addRow('Role', formatWords(node.role));
  addRow('Package', readFirstString(dbt.packageName, metadata.packageName, metadata.package));
  addRow(
    'Materialization',
    readFirstString(
      config.materialization,
      config.materialized,
      dbt.materialized,
      metadata.materialization,
      metadata.materialized
    )
  );
  addRow('Database', readFirstString(config.database, metadata.database, dbt.databaseName));
  addRow('Schema', readFirstString(config.schema, metadata.schema, dbt.schemaName));
  addRow('Table', readFirstString(config.table, metadata.tableName, dbt.tableName));
  addRow('Source', readFirstString(config.alias, metadata.sourceName, dbt.sourceName));
  addRow('Path', node.path ?? readString(metadata.path));
  addRow('Owner', readString(metadata.owner));
  addRow('Last run', readFirstString(metadata.lastRunStatus, metadata.lastRunAt));

  const rowCount = readNumber(metadata.rowCount) ?? readNumber(metadata.rows);
  if (rowCount != null) {
    addRow('Rows', new Intl.NumberFormat('en-US').format(rowCount));
  }

  const size = readString(metadata.size) ?? readString(metadata.sizeLabel);
  addRow('Size', size);

  if (node.lastDuration != null) {
    addRow('Duration', `${node.lastDuration}s`);
  }
  if (node.lastCost != null) {
    addRow('Cost', formatCost(node.lastCost));
  }

  const dependencyCount = upstreamNodes.length + downstreamNodes.length;
  return (
    <Tabs
      data-slot="node-inspector-core-tabs"
      value={activeTab}
      onValueChange={onActiveTabChange}
      className="gap-4"
    >
      <TabsList
        data-slot="node-inspector-core-tabs-list"
        className={graphVisualClasses.contextPanelFlatTabsList}
      >
        <TabsTrigger
          value="details"
          data-slot="node-inspector-tab-details"
          className={graphVisualClasses.contextPanelFlatTabTrigger}
        >
          Details
        </TabsTrigger>
        <TabsTrigger
          value="columns"
          data-slot="node-inspector-tab-columns"
          className={graphVisualClasses.contextPanelFlatTabTrigger}
        >
          Columns
          <Badge variant="secondary" className={graphVisualClasses.contextPanelTabBadge}>
            {columns.length}
          </Badge>
        </TabsTrigger>
        <TabsTrigger
          value="depends"
          data-slot="node-inspector-tab-depends"
          className={graphVisualClasses.contextPanelFlatTabTrigger}
        >
          Depends On
          <Badge variant="secondary" className={graphVisualClasses.contextPanelTabBadge}>
            {dependencyCount}
          </Badge>
        </TabsTrigger>
        {sql ? (
          <TabsTrigger
            value="code"
            data-slot="node-inspector-tab-code"
            className={graphVisualClasses.contextPanelFlatTabTrigger}
          >
            Code
          </TabsTrigger>
        ) : null}
        {panels.map((panel) => {
          const Icon = panel.icon;
          return (
            <TabsTrigger
              key={panel.id}
              value={panel.id}
              className={graphVisualClasses.contextPanelFlatTabTrigger}
            >
              <Icon className="mr-1 size-3" />
              {resolveString(panel.label)}
            </TabsTrigger>
          );
        })}
      </TabsList>

      <TabsContent value="details" className="m-0 space-y-4">
        <section
          data-slot="node-inspector-details-section"
          className={graphVisualClasses.contextPanelDetailsSection}
        >
          <div className="grid grid-cols-[minmax(92px,0.42fr)_minmax(0,1fr)] gap-x-4 gap-y-3 text-sm">
            {summaryRows.map(([label, value]) => (
              <div key={label} className="contents">
                <span className={graphVisualClasses.inspectorLabel}>{label}</span>
                <span className="min-w-0 break-words">{value}</span>
              </div>
            ))}
            {node.tags.length > 0 ? (
              <div className="contents">
                <span className={graphVisualClasses.inspectorLabel}>Tags</span>
                <span className="flex min-w-0 flex-wrap gap-1">
                  {node.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </span>
              </div>
            ) : null}
            {node.description ? (
              <div className="contents">
                <span className={graphVisualClasses.inspectorLabel}>Description</span>
                <span className={graphVisualClasses.inspectorBody}>{node.description}</span>
              </div>
            ) : null}
          </div>
        </section>

        {beforePanels ? (
          <div data-slot="node-inspector-editable-properties" className="space-y-3">
            {beforePanels}
          </div>
        ) : null}
      </TabsContent>

      <TabsContent value="columns" className="m-0">
        <section data-slot="node-inspector-columns-section" className="space-y-3">
          <h3 className={graphVisualClasses.contextPanelSectionTitle}>
            Columns ({columns.length})
          </h3>
          {columns.length > 0 ? (
            <div className={graphVisualClasses.contextPanelColumnsList}>
              {columns.map((column) => (
                <div key={`${node.id}:${column.name}`} className="py-2">
                  <div className="flex min-w-0 items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 break-words font-mono">{column.name}</span>
                    <span className={graphVisualClasses.contextPanelColumnType}>{column.type}</span>
                  </div>
                  {(column.nullable != null || column.description) && (
                    <div className={graphVisualClasses.contextPanelColumnMeta}>
                      {column.nullable != null ? (
                        <span>{column.nullable ? 'nullable' : 'not null'}</span>
                      ) : null}
                      {column.description ? <span>{column.description}</span> : null}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className={graphVisualClasses.inspectorBody}>
              No columns are recorded for this node.
            </p>
          )}
        </section>
      </TabsContent>

      <TabsContent value="depends" className="m-0">
        <section data-slot="node-inspector-depends-section" className="space-y-3">
          <h3 className={graphVisualClasses.contextPanelSectionTitle}>Connected graph</h3>
          {dependencyCount > 0 ? (
            <div className="space-y-4 text-sm">
              {upstreamNodes.length > 0 && (
                <div>
                  <div className={graphVisualClasses.inspectorLabel}>Depends on</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {upstreamNodes.map((name) => (
                      <Badge key={`${node.id}:upstream:${name}`} variant="outline">
                        {name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {downstreamNodes.length > 0 && (
                <div>
                  <div className={graphVisualClasses.inspectorLabel}>Downstream</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {downstreamNodes.map((name) => (
                      <Badge key={`${node.id}:downstream:${name}`} variant="outline">
                        {name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className={graphVisualClasses.inspectorBody}>
              No graph dependencies are recorded for this node.
            </p>
          )}
        </section>
      </TabsContent>

      {sql ? (
        <TabsContent value="code" className="m-0">
          <section data-slot="node-inspector-code-section" className="space-y-3">
            <h3 className={graphVisualClasses.contextPanelSectionTitle}>Code</h3>
            <pre
              className={cn('max-h-72 overflow-auto p-2', graphVisualClasses.inspectorCodeBlock)}
            >
              {sql}
            </pre>
          </section>
        </TabsContent>
      ) : null}

      {panels.map((panel) => {
        const PanelComponent = panel.component;
        return (
          <TabsContent key={panel.id} value={panel.id} className="m-0">
            <PanelComponent
              node={node}
              activeRunId={activeRunId}
              onClose={onHide}
              tagsEditor={tagsEditor}
            />
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
