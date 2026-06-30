/** Owned concern: derive dbt Inspector authoring presentation state from Canvas graph inputs. */
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { createDbtNodeAuthoringMetadata } from './canvasDbtAuthoringModel';

export type DbtOriginNode = CanonicalNode & Readonly<{ kind: 'dbt:source' | 'dbt:model' }>;

export type DbtOriginOption = Readonly<{
  value: string;
  label: string;
}>;

export type DbtAuthoringModelProjection = Readonly<{
  originOptions: readonly DbtOriginOption[];
  selectedOriginId: string;
  generatedModelSql: string | null;
}>;

function isDbtOriginNode(candidate: CanonicalNode | undefined): candidate is DbtOriginNode {
  return (
    candidate?.pluginId === 'dbt' &&
    (candidate.kind === 'dbt:source' || candidate.kind === 'dbt:model')
  );
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
      label: `${candidate.name} (${args.kindLabels[candidate.kind]})`,
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
    incomingOrigins.find((candidate) => candidate.kind === 'dbt:source') ??
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

  if (origin.kind === 'dbt:source') {
    const sourceMetadata = createDbtNodeAuthoringMetadata(origin);
    return [
      'select *',
      `from {{ source('${sourceMetadata.sourceName}', '${sourceMetadata.tableName}') }}`,
    ].join('\n');
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
