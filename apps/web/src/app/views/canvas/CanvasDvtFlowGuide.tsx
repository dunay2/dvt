/** Owned concern: render the DVT source -> SQL -> sink flow proof above the Canvas viewport. */
import type { Node } from '@xyflow/react';
import { Code2, Database, SendHorizontal } from 'lucide-react';

import { cn } from '../../components/ui/utils';
import type { CanonicalNode } from '../../types/canonical';
import { createDvtNodeAuthoringMetadata } from './canvasDvtAuthoringModel';
import type { TransformationGraphValidationResult } from './transformationGraphValidation';
import { canvasViewCopy, formatTransformationGraphValidationSummary } from './copy';

type CanvasDvtFlowGuideProps = Readonly<{
  nodes: readonly Node[];
  validation: TransformationGraphValidationResult;
}>;

type DvtFlowRole = 'source' | 'sql_transform' | 'sink';

type DvtColumn = Readonly<{
  name: string;
  type: string;
  nullable: boolean;
}>;

function roleMatchesNode(role: DvtFlowRole, node: CanonicalNode): boolean {
  switch (role) {
    case 'source':
      return node.kind === 'dvt:source' || node.role === 'input';
    case 'sql_transform':
      return node.kind === 'dvt:sql_transform' || node.role === 'transform';
    case 'sink':
      return node.kind === 'dvt:sink' || node.role === 'output';
  }
}

function findFlowNode(
  role: DvtFlowRole,
  nodes: readonly CanonicalNode[],
  validation: TransformationGraphValidationResult
): CanonicalNode | null {
  const scopedNodeId = validation.scopedNodeIds.find(
    (nodeId) => validation.nodeRolesById[nodeId] === role
  );
  const scopedNode =
    scopedNodeId == null ? undefined : nodes.find((candidate) => candidate.id === scopedNodeId);

  return scopedNode ?? nodes.find((candidate) => roleMatchesNode(role, candidate)) ?? null;
}

function readMetadataRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readColumns(node: CanonicalNode | null): DvtColumn[] {
  const columns = node?.metadata?.columns;
  if (!Array.isArray(columns)) {
    return [];
  }

  return columns.filter((column): column is DvtColumn => {
    const record = readMetadataRecord(column);
    return (
      record != null &&
      typeof record.name === 'string' &&
      typeof record.type === 'string' &&
      typeof record.nullable === 'boolean'
    );
  });
}

function formatRowCount(node: CanonicalNode | null): string {
  const config = readMetadataRecord(node?.metadata?.config);
  const rowCount = readNumber(node?.metadata?.rowCount) ?? readNumber(config?.rowCount);

  return rowCount == null
    ? canvasViewCopy.dvtFlowGuideRowsUnknownLabel
    : `${new Intl.NumberFormat('en-US').format(rowCount)} ${
        rowCount === 1 ? canvasViewCopy.dvtFlowGuideRowLabel : canvasViewCopy.dvtFlowGuideRowsLabel
      }`;
}

function formatColumnCount(columns: readonly DvtColumn[]): string {
  return `${columns.length} ${
    columns.length === 1
      ? canvasViewCopy.dvtFlowGuideColumnLabel
      : canvasViewCopy.dvtFlowGuideColumnsLabel
  }`;
}

function formatColumn(column: DvtColumn): string {
  return `${column.name} ${column.type} ${
    column.nullable
      ? canvasViewCopy.dvtFlowGuideNullableLabel
      : canvasViewCopy.dvtFlowGuideRequiredLabel
  }`;
}

function summarizeSql(node: CanonicalNode | null): string {
  const metadata = node == null ? undefined : createDvtNodeAuthoringMetadata(node);
  if (metadata?.kind !== 'sql_transform') {
    return canvasViewCopy.dvtFlowGuideSqlMissingMessage;
  }

  const normalizedLines = metadata.sql
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return normalizedLines[0] ?? canvasViewCopy.dvtFlowGuideSqlMissingMessage;
}

function summarizeSource(node: CanonicalNode | null): string {
  const metadata = node == null ? undefined : createDvtNodeAuthoringMetadata(node);
  return metadata?.kind === 'source'
    ? `${metadata.schema}.${metadata.table}`
    : canvasViewCopy.dvtFlowGuideSourceMissingMessage;
}

function summarizeDestination(node: CanonicalNode | null): string {
  const metadata = node == null ? undefined : createDvtNodeAuthoringMetadata(node);
  return metadata?.kind === 'sink'
    ? `${metadata.schema}.${metadata.table}`
    : canvasViewCopy.dvtFlowGuideDestinationMissingMessage;
}

function readDestinationChips(node: CanonicalNode | null): readonly string[] {
  const metadata = node == null ? undefined : createDvtNodeAuthoringMetadata(node);
  return metadata?.kind === 'sink' ? [metadata.materialization, metadata.writeMode] : [];
}

export function CanvasDvtFlowGuide({ nodes, validation }: CanvasDvtFlowGuideProps): JSX.Element {
  const visibleCanonicalNodes: CanonicalNode[] = nodes.map((node) => {
    const data = node.data;
    const pluginKind =
      typeof data.pluginKind === 'string' ? data.pluginKind : ('dvt:unknown' as const);
    const [pluginId] = pluginKind.split(':');
    const metadata = readMetadataRecord(data.metadata);
    const tags = Array.isArray(data.tags)
      ? data.tags.filter((tag): tag is string => typeof tag === 'string')
      : [];

    return {
      id: node.id,
      name: typeof data.name === 'string' ? data.name : node.id,
      pluginId: pluginId || 'dvt',
      kind: pluginKind as CanonicalNode['kind'],
      role: (typeof data.role === 'string' ? data.role : 'transform') as CanonicalNode['role'],
      status: (typeof data.status === 'string' ? data.status : 'idle') as CanonicalNode['status'],
      tags,
      path: typeof data.path === 'string' ? data.path : undefined,
      description: typeof data.description === 'string' ? data.description : undefined,
      lastDuration: typeof data.lastDuration === 'number' ? data.lastDuration : undefined,
      lastCost: typeof data.lastCost === 'number' ? data.lastCost : undefined,
      metadata: metadata == null ? undefined : metadata,
    };
  });
  const sourceNode = findFlowNode('source', visibleCanonicalNodes, validation);
  const transformNode = findFlowNode('sql_transform', visibleCanonicalNodes, validation);
  const sinkNode = findFlowNode('sink', visibleCanonicalNodes, validation);
  const sourceColumns = readColumns(sourceNode);
  const destinationChips = readDestinationChips(sinkNode);

  return (
    <section
      data-slot="canvas-dvt-flow-guide"
      className="shrink-0 border-b border-[color:var(--border-default)] bg-[var(--surface-panel)] px-4 py-3"
      aria-label={canvasViewCopy.dvtFlowGuideTitle}
    >
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-64">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[var(--text-default)]">
              {canvasViewCopy.dvtFlowGuideTitle}
            </span>
            <span
              className={cn(
                'rounded border px-2 py-0.5 text-xs font-medium',
                validation.valid
                  ? 'border-[color:var(--status-success)] text-[var(--status-success)]'
                  : 'border-[color:var(--status-warning)] text-[var(--status-warning)]'
              )}
            >
              {validation.valid
                ? canvasViewCopy.dvtFlowGuideReadyLabel
                : canvasViewCopy.dvtFlowGuideNeedsWorkLabel}
            </span>
          </div>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {formatTransformationGraphValidationSummary(validation.summaryCode)}
          </p>
        </div>

        <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 md:grid-cols-3">
          <div className="min-w-0 rounded border border-[color:var(--border-default)] bg-[var(--surface-elevated)] p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)]">
              <Database className="size-4" />
              {canvasViewCopy.inspectorDvtSourceTitle}
            </div>
            <code className="mt-2 block truncate text-sm text-[var(--text-default)]">
              {summarizeSource(sourceNode)}
            </code>
            <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-[var(--text-muted)]">
              <span>{formatRowCount(sourceNode)}</span>
              <span>{formatColumnCount(sourceColumns)}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(sourceColumns.length > 0 ? sourceColumns.slice(0, 4) : []).map((column) => (
                <span
                  key={column.name}
                  className="max-w-full truncate rounded border border-[color:var(--border-default)] px-2 py-1 text-xs text-[var(--text-muted)]"
                >
                  {formatColumn(column)}
                </span>
              ))}
              {sourceColumns.length === 0 ? (
                <span className="text-xs text-[var(--text-muted)]">
                  {canvasViewCopy.dvtFlowGuideColumnsMissingMessage}
                </span>
              ) : null}
            </div>
          </div>

          <div className="min-w-0 rounded border border-[color:var(--border-default)] bg-[var(--surface-elevated)] p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)]">
              <Code2 className="size-4" />
              {canvasViewCopy.inspectorDvtSqlTransformTitle}
            </div>
            <code className="mt-2 block truncate text-sm text-[var(--text-default)]">
              {transformNode?.name ?? canvasViewCopy.dvtFlowGuideTransformMissingMessage}
            </code>
            <code className="mt-2 block truncate text-xs text-[var(--text-muted)]">
              {summarizeSql(transformNode)}
            </code>
          </div>

          <div className="min-w-0 rounded border border-[color:var(--border-default)] bg-[var(--surface-elevated)] p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)]">
              <SendHorizontal className="size-4" />
              {canvasViewCopy.inspectorDvtSinkTitle}
            </div>
            <code className="mt-2 block truncate text-sm text-[var(--text-default)]">
              {summarizeDestination(sinkNode)}
            </code>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {destinationChips.map((chip) => (
                <span
                  key={chip}
                  className="rounded border border-[color:var(--border-default)] px-2 py-1 text-xs text-[var(--text-muted)]"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
