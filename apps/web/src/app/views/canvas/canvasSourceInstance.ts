/**
 * Owned concern: allocate a placement identity referencing a registered source.
 * @baseline GH-3610: a repeated catalogue drop is a new instance, not a duplicate definition.
 * @decision Keep configuration authority on the source and reuse shared secure UUID allocation.
 * @consequence The persisted instance has independent position and name but no configuration copy.
 * @version 1.0.1
 */
import { randomUuidV4 } from '@dvt/crypto';
import type { CanonicalNode } from '../../types/canonical';

export function createCanvasSourceInstance(
  source: CanonicalNode,
  existingNames: ReadonlySet<unknown>,
  id: string = randomUuidV4()
): CanonicalNode {
  let name = source.name;
  let ordinal = 2;
  while (existingNames.has(name)) name = `${source.name} ${ordinal++}`;
  return { ...source, id, name, sourceDefinitionId: source.id, status: 'idle' };
}
