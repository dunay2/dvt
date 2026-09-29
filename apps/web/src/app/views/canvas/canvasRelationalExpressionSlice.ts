/** Index canonical expression edges once, then read a local relation slice. */
import type { SemanticWorkbenchGraph } from './semanticWorkbenchProjection';

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
  return (relationId: string) => {
    const ids = new Set<string>();
    const edges: SemanticWorkbenchGraph['edges'] = [];
    const pending = (inputs.get(relationId) ?? []).map((edge) => edge.source).reverse();
    while (pending.length > 0) {
      const id = pending.pop()!;
      if (ids.has(id)) continue;
      ids.add(id);
      for (const edge of inputs.get(id) ?? []) {
        edges.push(edge);
        pending.push(edge.source);
      }
    }
    return {
      nodes: [...ids].map((id) => nodes.get(id)!),
      edges,
      referencedFields: new Set(
        projection.nodes
          .filter((item) => ids.has(item.id))
          .flatMap((item) =>
            item.data.fieldReference == null ? [] : [item.data.fieldReference.fieldId]
          )
      ),
    };
  };
}
