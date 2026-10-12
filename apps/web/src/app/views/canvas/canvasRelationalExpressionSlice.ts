/**
 * Owned concern: read local expression detail from the existing canonical expression graph.
 * @baseline ADR-0064: authoring ownership does not replace canonical expression semantics.
 * @decision Project grouped calculations through their public output bindings.
 * @consequence Hidden definitions retain a physical removal location without a false public identity.
 * @version 1.0.0
 */
import type { SemanticWorkbenchGraph } from './semanticWorkbenchProjection';
import type { TransformDependencyModel } from './canvasTransformDependencyModel';

function projectGroupedOutputs(
  nodes: SemanticWorkbenchGraph['nodes'],
  inputs: ReadonlyMap<string, SemanticWorkbenchGraph['edges']>,
  model: TransformDependencyModel,
  unavailable: ReadonlySet<string>
): SemanticWorkbenchGraph['nodes'] {
  const ordinals = new Map(nodes.map((node) => [node.id, node.data.projectExpressionOrdinal]));
  const outputs = new Map(
    model.definitions.flatMap((definition) => {
      const root = inputs
        .get(definition.owner.binding.relationId)
        ?.find((edge) => ordinals.get(edge.source) === definition.ordinal);
      return root == null ? [] : [[root.source, definition] as const];
    })
  );
  return nodes.map((node) => {
    if (!outputs.has(node.id)) return node;
    const definition = outputs.get(node.id)!;
    const output = definition.output;
    const projectExpressionRelationId = definition.owner.binding.relationId;
    if (output == null || unavailable.has(output.fieldId)) {
      const { fieldReference: _reference, fieldSelection: _selection, ...data } = node.data;
      return {
        ...node,
        data: { ...data, projectExpressionRelationId, unavailable: output != null },
      };
    }
    return {
      ...node,
      data: {
        ...node.data,
        projectExpressionRelationId,
        fieldReference: { fieldId: output.fieldId, relationId: model.root.binding.relationId },
        fieldSelection: 'output' as const,
      },
    };
  });
}

export function relationalExpressionSlices(
  projection: SemanticWorkbenchGraph,
  unavailable: ReadonlySet<string>
) {
  const nodes = new Map(
    projection.nodes.map((item) => {
      const reference = item.data.fieldReference;
      return [
        item.id,
        reference != null &&
        (unavailable.has(reference.fieldId) || unavailable.has(reference.sourceFieldId ?? ''))
          ? { ...item, data: { ...item.data, unavailable: true, fieldReference: undefined } }
          : item,
      ];
    })
  );
  const inputs = new Map<string, SemanticWorkbenchGraph['edges']>();
  for (const edge of projection.edges) {
    if (edge.data?.semanticEdgeKind !== 'expression') continue;
    inputs.set(edge.target, [...(inputs.get(edge.target) ?? []), edge]);
  }
  return (relationId: string, group?: TransformDependencyModel) => {
    const ids = new Set<string>();
    const edges: SemanticWorkbenchGraph['edges'] = [];
    const relationIds =
      group == null ? [relationId] : group.members.map((member) => member.binding.relationId);
    const pending = relationIds
      .flatMap((id) => inputs.get(id) ?? [])
      .map((edge) => edge.source)
      .reverse();
    while (pending.length > 0) {
      const id = pending.pop()!;
      if (ids.has(id)) continue;
      ids.add(id);
      for (const edge of inputs.get(id) ?? []) {
        edges.push(edge);
        pending.push(edge.source);
      }
    }
    const local = [...ids].map((id) => {
      const node = nodes.get(id)!;
      return node.data.fieldReference?.relationId === relationId
        ? { ...node, data: { ...node.data, fieldSelection: 'output' as const } }
        : node;
    });
    const projected =
      group == null ? local : projectGroupedOutputs(local, inputs, group, unavailable);
    return {
      nodes: projected,
      edges,
      referencedFields: new Set([
        ...projection.nodes
          .filter((item) => ids.has(item.id))
          .flatMap((item) =>
            item.data.fieldReference == null ? [] : [item.data.fieldReference.fieldId]
          ),
        ...(group?.definitions.flatMap((definition) =>
          definition.output == null ? [] : [definition.output.fieldId]
        ) ?? []),
      ]),
    };
  };
}
