/** Owned concern: derive dbt Inspector authoring presentation state from Canvas graph inputs. */
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { createDbtNodeAuthoringMetadata } from './canvasDbtAuthoringModel';
import { createDvtNodeAuthoringMetadata } from './canvasDvtAuthoringModel';

export type DbtOriginNode = CanonicalNode;

export type DbtOriginOption = Readonly<{
  value: string;
  label: string;
}>;

export type DbtAuthoringModelProjection = Readonly<{
  originOptions: readonly DbtOriginOption[];
  selectedOriginId: string;
  generatedModelSql: string | null;
}>;

function isDbtSourceOrigin(candidate: CanonicalNode | undefined): candidate is CanonicalNode {
  return candidate?.pluginId === 'dbt' && candidate.kind === 'dbt:source';
}

function isWarehouseSourceOrigin(candidate: CanonicalNode | undefined): candidate is CanonicalNode {
  return candidate?.pluginId === 'dvt.warehouse-source' && candidate.kind === 'dvt:source';
}

function isDbtModelOrigin(candidate: CanonicalNode | undefined): candidate is CanonicalNode {
  return candidate?.pluginId === 'dbt' && candidate.kind === 'dbt:model';
}

function isDbtOriginNode(candidate: CanonicalNode | undefined): candidate is DbtOriginNode {
  return (
    isDbtSourceOrigin(candidate) ||
    isWarehouseSourceOrigin(candidate) ||
    isDbtModelOrigin(candidate)
  );
}

function formatOriginKindLabel(
  candidate: DbtOriginNode,
  kindLabels: Readonly<Record<'dbt:source' | 'dbt:model', string>>
): string {
  return isDbtModelOrigin(candidate) ? kindLabels['dbt:model'] : kindLabels['dbt:source'];
}

function buildSourceSql(origin: CanonicalNode): string | null {
  if (isDbtSourceOrigin(origin)) {
    const sourceMetadata = createDbtNodeAuthoringMetadata(origin);
    return `{{ source('${sourceMetadata.sourceName}', '${sourceMetadata.tableName}') }}`;
  }

  if (isWarehouseSourceOrigin(origin)) {
    const sourceMetadata = createDvtNodeAuthoringMetadata(origin);
    return sourceMetadata?.kind === 'source'
      ? `{{ source('${sourceMetadata.alias}', '${sourceMetadata.table}') }}`
      : null;
  }

  return null;
}

function isSourceOrigin(candidate: CanonicalNode): boolean {
  return isDbtSourceOrigin(candidate) || isWarehouseSourceOrigin(candidate);
}

export function buildDbtOriginOptions(args: {
  node: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  kindLabels: Readonly<Record<'dbt:source' | 'dbt:model', string>>;
}): readonly DbtOriginOption[] {
  const nodeById = new Map(args.nodes.map((candidate) => [candidate.id, candidate]));
  return args.edges
    .filter((edge) => edge.targetId === args.node.id)
    .map((edge) => nodeById.get(edge.sourceId))
    .filter(isDbtOriginNode)
    .map((candidate) => ({
      value: candidate.id,
      label: `${candidate.name} (${formatOriginKindLabel(candidate, args.kindLabels)})`,
    }));
}

export function normalizeDbtIdentifier(value: string, fallback: string): string {
  const normalized = value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();

  return normalized.length > 0 ? normalized : fallback;
}

export function resolveDbtModelOrigin(args: {
  node: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  selectedOriginId: string;
}): CanonicalNode | null {
  const nodeById = new Map(args.nodes.map((candidate) => [candidate.id, candidate]));
  const incomingOrigins = args.edges
    .filter((edge) => edge.targetId === args.node.id)
    .map((edge) => nodeById.get(edge.sourceId))
    .filter(isDbtOriginNode);

  return (
    incomingOrigins.find((candidate) => candidate.id === args.selectedOriginId) ??
    incomingOrigins.find(isSourceOrigin) ??
    incomingOrigins[0] ??
    null
  );
}

export function buildGeneratedDbtModelSqlPreview(args: {
  node: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  selectedOriginId: string;
}): string | null {
  const origin = resolveDbtModelOrigin(args);
  if (origin == null) {
    return null;
  }

  const sourceSql = buildSourceSql(origin);
  if (sourceSql !== null) {
    return ['select *', `from ${sourceSql}`].join('\n');
  }

  return ['select *', `from {{ ref('${normalizeDbtIdentifier(origin.name, origin.id)}') }}`].join(
    '\n'
  );
}

export function buildDbtAuthoringModelProjection(args: {
  node: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  selectedOriginId: string;
  kindLabels: Readonly<Record<'dbt:source' | 'dbt:model', string>>;
}): DbtAuthoringModelProjection {
  const originOptions = buildDbtOriginOptions(args);
  const selectedOriginId = args.selectedOriginId || originOptions[0]?.value || '';

  return {
    originOptions,
    selectedOriginId,
    generatedModelSql: buildGeneratedDbtModelSqlPreview({
      node: args.node,
      nodes: args.nodes,
      edges: args.edges,
      selectedOriginId,
    }),
  };
}
