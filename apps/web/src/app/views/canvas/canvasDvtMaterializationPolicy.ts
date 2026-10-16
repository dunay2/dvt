/** Native Transform materialization admission, shared by command and presentation. */
import type { CanonicalNode } from '../../types/canonical';
import { DVT_TRANSFORM_MATERIALIZATIONS } from '@dvt/contracts';
import { hasDbtCompatibilityMetadata } from './canvasDbtAuthoringModel';
import type { DvtNodeAuthoringMetadata } from './canvasDvtAuthoringTypes';

export { DVT_TRANSFORM_MATERIALIZATIONS };
export type DvtTransformMaterialization = (typeof DVT_TRANSFORM_MATERIALIZATIONS)[number];

/** Apply an explicit disposition intent; never repair imported drafts on read. */
export function withDvtTransformMaterialization<
  T extends Extract<DvtNodeAuthoringMetadata, { kind: 'transform' }>,
>(draft: T, materialized: string): T {
  return {
    ...draft,
    materialized,
    ...(materialized === 'ephemeral' ? { resultTarget: null } : {}),
  };
}

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
