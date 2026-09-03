/** Public DVT authoring dispatcher; kind-specific behavior lives in focused modules. */
import type { CanonicalNode } from '../../types/canonical';
import {
  applyDvtSinkAuthoringMetadata,
  createDvtSinkAuthoringMetadata,
  validateDvtSinkAuthoringMetadata,
} from './canvasDvtSinkAuthoring';
import {
  applyDvtSourceAuthoringMetadata,
  createDvtSourceAuthoringMetadata,
  DVT_AUTHORING_PLUGIN_ID,
  DVT_WAREHOUSE_SOURCE_PLUGIN_ID,
  validateDvtSourceAuthoringMetadata,
} from './canvasDvtSourceAuthoring';
import {
  applyDvtTransformAuthoringMetadata,
  createDvtTransformAuthoringMetadata,
} from './canvasDvtTransformAuthoring';
import type {
  DvtNodeAuthoringMetadata,
  DvtNodeAuthoringMetadataErrors,
} from './canvasDvtAuthoringTypes';

export type {
  DvtNodeAuthoringMetadata,
  DvtNodeAuthoringMetadataErrors,
  DvtSinkAuthoringMetadata,
  DvtSourceAuthoringMetadata,
  DvtSubstraitTransformAuthoringMetadata,
  DvtUninitializedTransformAuthoringMetadata,
} from './canvasDvtAuthoringTypes';
export {
  resolveEffectiveDvtConnectionRef,
  resolveInheritedDvtConnectionRef,
} from './canvasDvtSourceAuthoring';

export function createDvtNodeAuthoringMetadata(
  node: CanonicalNode
): DvtNodeAuthoringMetadata | undefined {
  switch (node.kind) {
    case 'dvt:source':
      return node.pluginId === DVT_AUTHORING_PLUGIN_ID ||
        node.pluginId === DVT_WAREHOUSE_SOURCE_PLUGIN_ID
        ? createDvtSourceAuthoringMetadata(node)
        : undefined;
    case 'dvt:transform':
      return node.pluginId === DVT_AUTHORING_PLUGIN_ID
        ? createDvtTransformAuthoringMetadata(node)
        : undefined;
    case 'dvt:sink':
      return node.pluginId === DVT_AUTHORING_PLUGIN_ID
        ? createDvtSinkAuthoringMetadata(node)
        : undefined;
    default:
      return undefined;
  }
}

export function validateDvtNodeAuthoringMetadata(
  metadata: DvtNodeAuthoringMetadata
): DvtNodeAuthoringMetadataErrors {
  return metadata.kind === 'source'
    ? validateDvtSourceAuthoringMetadata(metadata)
    : metadata.kind === 'sink'
      ? validateDvtSinkAuthoringMetadata(metadata)
      : {};
}

export function applyDvtNodeAuthoringMetadata(
  node: CanonicalNode,
  metadata: DvtNodeAuthoringMetadata
): CanonicalNode {
  return metadata.kind === 'source'
    ? applyDvtSourceAuthoringMetadata(node, metadata)
    : metadata.kind === 'transform'
      ? applyDvtTransformAuthoringMetadata(node, metadata)
      : applyDvtSinkAuthoringMetadata(node, metadata);
}
