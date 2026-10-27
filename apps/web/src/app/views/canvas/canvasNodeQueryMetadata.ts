/** Current native field/query inputs are independent of storage disposition. */
import type { CanonicalNode } from '../../types/canonical';
import { canConfigureNativeMaterialization } from './canvasDvtMaterializationPolicy';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';

export function canvasNodeQueryMetadata(node: CanonicalNode): CanonicalNode['metadata'] {
  const metadata = node.metadata;
  if (!canConfigureNativeMaterialization(node)) return metadata;
  try {
    const authority = readDvtTransformAuthoringAuthority(node);
    if (authority == null) return metadata;
    return { transformAuthoring: authority, columns: metadata?.columns ?? null };
  } catch {
    // Keep current invalid inputs observable; never reuse a prior successful identity.
    return metadata;
  }
}
