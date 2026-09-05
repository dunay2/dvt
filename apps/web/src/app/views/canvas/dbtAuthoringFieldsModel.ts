/** Owned concern: derive dbt Inspector authoring presentation state from Canvas graph inputs. */
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import {
  isDbtCompatibleModel,
  isDbtCompatibleSource,
  type DbtNodeAuthoringMetadata,
} from './canvasDbtAuthoringModel';
import {
  projectDbtModelArtifact,
  type DbtModelArtifactProjection,
} from './canvasDbtModelArtifactProjection';
import { isObjectFilePostgresNode } from './objectFilePostgresAuthoringModel';

export type DbtOriginNode = CanonicalNode;

export type DbtOriginOption = Readonly<{
  value: string;
  label: string;
}>;

export type DbtAuthoringModelProjection = Readonly<{
  originOptions: readonly DbtOriginOption[];
  selectedOriginId: string;
  modelArtifact: DbtModelArtifactProjection | null;
  projectionError: string | null;
}>;

function isDbtSourceOrigin(candidate: CanonicalNode | undefined): candidate is CanonicalNode {
  return candidate != null && isDbtCompatibleSource(candidate);
}

function isWarehouseSourceOrigin(candidate: CanonicalNode | undefined): candidate is CanonicalNode {
  return candidate?.pluginId === 'dvt.warehouse-source' && candidate.kind === 'dvt:source';
}

function isDbtModelOrigin(candidate: CanonicalNode | undefined): candidate is CanonicalNode {
  return candidate != null && isDbtCompatibleModel(candidate);
}

function isDbtOriginNode(candidate: CanonicalNode | undefined): candidate is DbtOriginNode {
  return (
    isDbtSourceOrigin(candidate) ||
    isWarehouseSourceOrigin(candidate) ||
    (candidate != null && isObjectFilePostgresNode(candidate)) ||
    isDbtModelOrigin(candidate)
  );
}

function formatOriginKindLabel(
  candidate: DbtOriginNode,
  kindLabels: Readonly<Record<'dvt:source' | 'dvt:transform', string>>
): string {
  return isDbtModelOrigin(candidate) ? kindLabels['dvt:transform'] : kindLabels['dvt:source'];
}

export function buildDbtOriginOptions(args: {
  node: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  kindLabels: Readonly<Record<'dvt:source' | 'dvt:transform', string>>;
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

export function buildDbtAuthoringModelProjection(args: {
  node: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  authoringMetadata: DbtNodeAuthoringMetadata;
  kindLabels: Readonly<Record<'dvt:source' | 'dvt:transform', string>>;
}): DbtAuthoringModelProjection {
  const originOptions = buildDbtOriginOptions(args);
  const selectedOriginId = originOptions.some(
    (option) => option.value === args.authoringMetadata.selectedSourceId
  )
    ? args.authoringMetadata.selectedSourceId
    : originOptions.length === 1
      ? (originOptions[0]?.value ?? '')
      : '';
  const artifactProjection = projectDbtModelArtifact({
    modelNode: args.node,
    nodes: args.nodes,
    edges: args.edges,
    authoringMetadata: {
      ...args.authoringMetadata,
      selectedSourceId: selectedOriginId,
    },
  });

  return {
    originOptions,
    selectedOriginId,
    modelArtifact: artifactProjection.ok ? artifactProjection.artifact : null,
    projectionError: artifactProjection.ok ? null : artifactProjection.message,
  };
}
