/**
 * Owned concern: allocate an independent instance referencing a registered node definition.
 * @baseline GH-3610: a repeated catalogue drop is a new instance, not a duplicate definition.
 * @decision Keep configuration authority on the definition and reuse secure UUID allocation.
 * @consequence The persisted instance has independent position and name but no configuration copy.
 * @version 1.0.1
 */
import { randomUuidV4 } from '@dvt/crypto';
import { workspaceNodeDefinitionId } from '@dvt/contracts';
import type { CanonicalNode } from '../../types/canonical';

export function createCanvasNodeInstance(
  definition: CanonicalNode,
  existingNames: ReadonlySet<unknown>,
  id: string = randomUuidV4()
): CanonicalNode {
  if (
    workspaceNodeDefinitionId(definition) != null ||
    (definition.role !== 'input' && definition.role !== 'transform')
  )
    throw new Error('Only registered Source or Model definitions can be instantiated.');
  let name = definition.name;
  let ordinal = 2;
  while (existingNames.has(name)) name = `${definition.name} ${ordinal++}`;
  return { ...definition, id, name, definitionId: definition.id, status: 'idle' };
}
