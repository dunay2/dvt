/** Owned concern: render the dbt source -> model -> validation proof above the Canvas viewport. */
import type { Node } from '@xyflow/react';
import { CheckCircle2, Code2, Database } from 'lucide-react';

import { cn } from '../../components/ui/utils';
import type { CanonicalNode } from '../../types/canonical';
import { createDbtNodeAuthoringMetadata } from './canvasDbtAuthoringModel';
import { canvasViewCopy } from './copy';

type CanvasDbtFlowGuideProps = Readonly<{
  nodes: readonly Node[];
  ready: boolean;
}>;

type DbtFlowRole = 'source' | 'model' | 'test';

type DbtColumn = Readonly<{
  name: string;
  type: string;
  nullable?: boolean;
}>;

function readMetadataRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function mapViewportNodeToCanonical(node: Node): CanonicalNode {
  const data = node.data;
  const pluginKind = typeof data.pluginKind === 'string' ? data.pluginKind : 'dbt:unknown';
  const [pluginId] = pluginKind.split(':');
  const metadata = readMetadataRecord(data.metadata);
  const tags = Array.isArray(data.tags)
    ? data.tags.filter((tag): tag is string => typeof tag === 'string')
    : [];

  return {
    id: node.id,
    name: typeof data.name === 'string' ? data.name : node.id,
    pluginId: pluginId || 'dbt',
    kind: pluginKind as CanonicalNode['kind'],
    role: (typeof data.role === 'string' ? data.role : 'transform') as CanonicalNode['role'],
    status: (typeof data.status === 'string' ? data.status : 'idle') as CanonicalNode['status'],
    tags,
    path: readString(data.path) ?? undefined,
    description: readString(data.description) ?? undefined,
    lastDuration: typeof data.lastDuration === 'number' ? data.lastDuration : undefined,
    lastCost: typeof data.lastCost === 'number' ? data.lastCost : undefined,
    metadata: metadata == null ? undefined : metadata,
  };
}

function roleMatchesNode(role: DbtFlowRole, node: CanonicalNode): boolean {
  switch (role) {
    case 'source':
      return node.pluginId === 'dbt' && (node.kind === 'dbt:source' || node.role === 'input');
    case 'model':
      return node.pluginId === 'dbt' && (node.kind === 'dbt:model' || node.role === 'transform');
    case 'test':
      return node.pluginId === 'dbt' && (node.kind === 'dbt:test' || node.role === 'check');
  }
}

function findFlowNode(role: DbtFlowRole, nodes: readonly CanonicalNode[]): CanonicalNode | null {
  return nodes.find((node) => roleMatchesNode(role, node)) ?? null;
}

function readColumns(node: CanonicalNode | null): DbtColumn[] {
  const columns = node?.metadata?.columns;
  if (!Array.isArray(columns)) {
    return [];
  }

  return columns.filter((column): column is DbtColumn => {
    const record = readMetadataRecord(column);
    return record != null && typeof record.name === 'string' && typeof record.type === 'string';
  });
}

function formatRowCount(node: CanonicalNode | null): string {
  const config = readMetadataRecord(node?.metadata?.config);
  const rowCount = readNumber(node?.metadata?.rowCount) ?? readNumber(config?.rowCount);

  return rowCount == null
    ? canvasViewCopy.dbtFlowGuideRowsUnknownLabel
    : `${new Intl.NumberFormat('en-US').format(rowCount)} ${
        rowCount === 1 ? canvasViewCopy.dbtFlowGuideRowLabel : canvasViewCopy.dbtFlowGuideRowsLabel
      }`;
}

function formatColumnCount(columns: readonly DbtColumn[]): string {
  return `${columns.length} ${
    columns.length === 1
      ? canvasViewCopy.dbtFlowGuideColumnLabel
      : canvasViewCopy.dbtFlowGuideColumnsLabel
  }`;
}

function formatColumn(column: DbtColumn): string {
  const nullability =
    column.nullable === false
      ? canvasViewCopy.dbtFlowGuideRequiredLabel
      : canvasViewCopy.dbtFlowGuideNullableLabel;
  return `${column.name} ${column.type} ${nullability}`;
}

function summarizeSource(node: CanonicalNode | null): string {
  if (node == null || node.pluginId !== 'dbt') {
    return canvasViewCopy.dbtFlowGuideSourceMissingMessage;
  }

  const metadata = createDbtNodeAuthoringMetadata(node);
  return `${metadata.sourceName}.${metadata.schemaName}.${metadata.tableName}`;
}

function summarizeModelSql(
  modelNode: CanonicalNode | null,
  sourceNode: CanonicalNode | null
): string {
  const compiledSql = readString(modelNode?.metadata?.compiledSql);
  if (compiledSql != null) {
    return (
      compiledSql
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find((line) => line.length > 0) ?? canvasViewCopy.dbtFlowGuideSqlMissingMessage
    );
  }

  if (sourceNode != null) {
    const sourceMetadata = createDbtNodeAuthoringMetadata(sourceNode);
    return `select * from {{ source("${sourceMetadata.sourceName}", "${sourceMetadata.tableName}") }}`;
  }

  return canvasViewCopy.dbtFlowGuideSqlMissingMessage;
}

function summarizeModelChips(node: CanonicalNode | null): readonly string[] {
  if (node == null || node.pluginId !== 'dbt') {
    return [];
  }

  const metadata = createDbtNodeAuthoringMetadata(node);
  return [metadata.materialized, node.path].filter(
    (chip): chip is string => typeof chip === 'string' && chip.length > 0
  );
}

function summarizeTestSeverity(node: CanonicalNode | null): string {
  const config = readMetadataRecord(node?.metadata?.config);
  return readString(config?.severity) ?? canvasViewCopy.dbtFlowGuideTestSeverityUnknownLabel;
}

export function CanvasDbtFlowGuide({ nodes, ready }: CanvasDbtFlowGuideProps): JSX.Element {
  const visibleCanonicalNodes = nodes.map(mapViewportNodeToCanonical);
  const sourceNode = findFlowNode('source', visibleCanonicalNodes);
  const modelNode = findFlowNode('model', visibleCanonicalNodes);
  const testNode = findFlowNode('test', visibleCanonicalNodes);
  const sourceColumns = readColumns(sourceNode);
  const modelColumns = readColumns(modelNode);
  const modelChips = summarizeModelChips(modelNode);

  return (
    <section
      data-slot="canvas-dbt-flow-guide"
      className="shrink-0 border-b border-[color:var(--border-default)] bg-[var(--surface-panel)] px-4 py-3"
      aria-label={canvasViewCopy.dbtFlowGuideTitle}
    >
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-64">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[var(--text-default)]">
              {canvasViewCopy.dbtFlowGuideTitle}
            </span>
            <span
              className={cn(
                'rounded border px-2 py-0.5 text-xs font-medium',
                ready
                  ? 'border-[color:var(--status-success)] text-[var(--status-success)]'
                  : 'border-[color:var(--status-warning)] text-[var(--status-warning)]'
              )}
            >
              {ready
                ? canvasViewCopy.dbtFlowGuideReadyLabel
                : canvasViewCopy.dbtFlowGuideNeedsWorkLabel}
            </span>
          </div>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {canvasViewCopy.dbtFlowGuideSummary}
          </p>
        </div>

        <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 xl:grid-cols-3">
          <div className="min-w-0 rounded border border-[color:var(--border-default)] bg-[var(--surface-elevated)] p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)]">
              <Database className="size-4" />
              {canvasViewCopy.dbtFlowGuideSourceTitle}
            </div>
            <code className="mt-2 block truncate text-sm text-[var(--text-default)]">
              {summarizeSource(sourceNode)}
            </code>
            <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-[var(--text-muted)]">
              <span>{formatRowCount(sourceNode)}</span>
              <span>{formatColumnCount(sourceColumns)}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {sourceColumns.slice(0, 4).map((column) => (
                <span
                  key={column.name}
                  className="max-w-full truncate rounded border border-[color:var(--border-default)] px-2 py-1 text-xs text-[var(--text-muted)]"
                >
                  {formatColumn(column)}
                </span>
              ))}
              {sourceColumns.length === 0 ? (
                <span className="text-xs text-[var(--text-muted)]">
                  {canvasViewCopy.dbtFlowGuideColumnsMissingMessage}
                </span>
              ) : null}
            </div>
          </div>

          <div className="min-w-0 rounded border border-[color:var(--border-default)] bg-[var(--surface-elevated)] p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)]">
              <Code2 className="size-4" />
              {canvasViewCopy.dbtFlowGuideModelTitle}
            </div>
            <code className="mt-2 block truncate text-sm text-[var(--text-default)]">
              {modelNode?.name ?? canvasViewCopy.dbtFlowGuideModelMissingMessage}
            </code>
            <code className="mt-2 block truncate text-xs text-[var(--text-muted)]">
              {summarizeModelSql(modelNode, sourceNode)}
            </code>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {modelChips.map((chip) => (
                <span
                  key={chip}
                  className="rounded border border-[color:var(--border-default)] px-2 py-1 text-xs text-[var(--text-muted)]"
                >
                  {chip}
                </span>
              ))}
              {modelColumns.length > 0 ? (
                <span className="rounded border border-[color:var(--border-default)] px-2 py-1 text-xs text-[var(--text-muted)]">
                  {formatColumnCount(modelColumns)}
                </span>
              ) : null}
            </div>
          </div>

          <div className="min-w-0 rounded border border-[color:var(--border-default)] bg-[var(--surface-elevated)] p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)]">
              <CheckCircle2 className="size-4" />
              {canvasViewCopy.dbtFlowGuideTestTitle}
            </div>
            <code className="mt-2 block truncate text-sm text-[var(--text-default)]">
              {testNode?.name ?? canvasViewCopy.dbtFlowGuideTestMissingMessage}
            </code>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {testNode != null ? (
                <span className="rounded border border-[color:var(--border-default)] px-2 py-1 text-xs text-[var(--text-muted)]">
                  {summarizeTestSeverity(testNode)}
                </span>
              ) : (
                <span className="text-xs text-[var(--text-muted)]">
                  {canvasViewCopy.dbtFlowGuideTestMissingMessage}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
