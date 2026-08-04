/** Owned concern: project connected DBT model targets and their columns for test authoring. */
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { resolveConnectedDbtTestTargets } from './canvasDbtTestTargetPolicy';

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

function readColumnNames(node: CanonicalNode | undefined): readonly string[] {
  if (!node || !Array.isArray(node.metadata?.columns)) return [];

  const names = node.metadata.columns.flatMap((column) => {
    if (column === null || typeof column !== 'object' || Array.isArray(column)) return [];
    const name = 'name' in column && typeof column.name === 'string' ? column.name.trim() : '';
    return name.length > 0 ? [name] : [];
  });

  return [...new Set(names)];
}

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
    columnOptions: readColumnNames(nodeById.get(selectedTargetModelId)),
  };
}
