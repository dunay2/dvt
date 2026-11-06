/** Owned concern: resolve layout references against current file-owned resource definitions. */
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasResourceInstance } from '../../stores/canvasInteractionStore';

export function isPlaceableCanvasResource(node: CanonicalNode): boolean {
  return (
    node.metadata?.authority === 'dbt-project-files' &&
    ((node.role === 'input' && node.metadata.resourceType === 'source') ||
      (node.role === 'transform' && node.metadata.resourceType === 'model'))
  );
}

export function projectCanvasResourcePlacements(
  resources: readonly CanonicalNode[],
  instances: readonly CanvasResourceInstance[]
): Readonly<{ nodes: CanonicalNode[]; definitionIdByInstanceId: ReadonlyMap<string, string> }> {
  const definitions = new Map(resources.map((node) => [node.id, node]));
  const definitionIdByInstanceId = new Map<string, string>();
  const ordinals = new Map<string, number>();
  const nodes = [...resources];
  for (const instance of instances) {
    const definition = definitions.get(instance.resourceId);
    if (
      definition == null ||
      !isPlaceableCanvasResource(definition) ||
      !instance.id ||
      definitions.has(instance.id) ||
      definitionIdByInstanceId.has(instance.id)
    )
      continue;
    const ordinal = (ordinals.get(definition.id) ?? 1) + 1;
    ordinals.set(definition.id, ordinal);
    definitionIdByInstanceId.set(instance.id, definition.id);
    nodes.push({ ...definition, id: instance.id, name: `${definition.name} ${ordinal}` });
  }
  return { nodes, definitionIdByInstanceId };
}
