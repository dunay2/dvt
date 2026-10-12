/**
 * Owned concern: order canonical calculated definitions by dependency and reject cycles.
 * @baseline ADR-0064: the dependency view is derived, never another persisted semantic model.
 * @decision One Kahn traversal computes bounded parallel projection layers.
 * @consequence Output display order cannot change evaluation order.
 * @version 1.0.0
 */
import type { TransformDefinition } from './canvasTransformDependencyModel';
import { transformExpressionDependencies } from './canvasTransformExpressionReferences';
import {
  TransformDependencyError,
  TRANSFORM_DEPENDENCY_REJECTION,
} from './TransformDependencyError';

export function orderTransformDefinitions(
  definitions: readonly TransformDefinition[],
  inputIds: readonly string[]
): readonly (readonly TransformDefinition[])[] {
  const byId = new Map(definitions.map((definition) => [definition.id, definition]));
  const inputs = new Set(inputIds);
  const remaining = new Map<string, number>();
  const consumers = new Map<string, string[]>();
  for (const definition of definitions) {
    const dependencies = transformExpressionDependencies(
      definition.expression,
      definition.inputIds
    );
    let count = 0;
    for (const id of dependencies) {
      if (inputs.has(id)) continue;
      if (!byId.has(id))
        throw new TransformDependencyError(TRANSFORM_DEPENDENCY_REJECTION.unavailable, [
          definition.binding.displayName ?? definition.id,
        ]);
      count += 1;
      consumers.set(id, [...(consumers.get(id) ?? []), definition.id]);
    }
    remaining.set(definition.id, count);
  }
  let ready = definitions.filter((definition) => remaining.get(definition.id) === 0);
  const layers: TransformDefinition[][] = [];
  let visited = 0;
  while (ready.length > 0) {
    layers.push(ready);
    visited += ready.length;
    const next: TransformDefinition[] = [];
    for (const definition of ready)
      for (const id of consumers.get(definition.id) ?? []) {
        const count = remaining.get(id)! - 1;
        remaining.set(id, count);
        if (count === 0) next.push(byId.get(id)!);
      }
    ready = next;
  }
  if (visited !== definitions.length)
    throw new TransformDependencyError(
      TRANSFORM_DEPENDENCY_REJECTION.cycle,
      definitions
        .filter((definition) => remaining.get(definition.id)! > 0)
        .map(
          (definition) =>
            definition.output?.displayName ?? definition.binding.displayName ?? definition.id
        )
    );
  return layers;
}
