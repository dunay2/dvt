/** Owned concern: project connected DBT model targets and their columns for test authoring. */
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import {
  readDeclaredDbtModelColumnNames,
  resolveConnectedDbtTestTargets,
} from './canvasDbtTestTargetPolicy';

export type DbtTestTargetOption = Readonly<{
  value: string;
  label: string;
}>;

export type DbtTestAuthoringFieldsModel = Readonly<{
  targetOptions: readonly DbtTestTargetOption[];
  selectedTargetModelId: string;
  columnOptions: readonly string[];
}>;

type BuildDbtTestAuthoringFieldsModelArgs = Readonly<{
  node: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  targetModelId: string;
}>;

export function buildDbtTestAuthoringFieldsModel(
  args: BuildDbtTestAuthoringFieldsModelArgs
): DbtTestAuthoringFieldsModel {
  const nodeById = new Map(args.nodes.map((node) => [node.id, node]));
  const targetNodes = resolveConnectedDbtTestTargets({
    testNodeId: args.node.id,
    nodes: args.nodes,
    edges: args.edges,
  });
  const targetOptions = targetNodes.map((node) => ({ value: node.id, label: node.name }));
  const requestedTargetId = args.targetModelId.trim();
  const selectedTargetModelId = targetNodes.some((node) => node.id === requestedTargetId)
    ? requestedTargetId
    : (targetNodes[0]?.id ?? '');

  return {
    targetOptions,
    selectedTargetModelId,
    columnOptions: readDeclaredDbtModelColumnNames(nodeById.get(selectedTargetModelId)),
  };
}
