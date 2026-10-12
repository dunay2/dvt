/** Native Transform materialization admission, shared by command and presentation. */
import type { CanonicalNode } from '../../types/canonical';
import { hasDbtCompatibilityMetadata } from './canvasDbtAuthoringModel';

export const DVT_TRANSFORM_MATERIALIZATIONS = ['view', 'table'] as const;
export type DvtTransformMaterialization = (typeof DVT_TRANSFORM_MATERIALIZATIONS)[number];

export function isDvtTransformMaterialization(
  value: unknown
): value is DvtTransformMaterialization {
  return DVT_TRANSFORM_MATERIALIZATIONS.some((mode) => mode === value);
}

export function canConfigureNativeMaterialization(
  node: CanonicalNode | undefined
): node is CanonicalNode {
  return (
    node?.pluginId === 'dvt' && node.kind === 'dvt:transform' && !hasDbtCompatibilityMetadata(node)
  );
}
