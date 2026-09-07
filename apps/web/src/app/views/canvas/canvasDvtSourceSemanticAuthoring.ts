/** Owns persistence of an existing Source semantic draft. */
import type { CanonicalNode } from '../../types/canonical';
import {
  decodeDvtSubstraitProjectionDocument,
  encodeDvtSubstraitProjectionDocument,
  inspectDvtSubstraitProjectionDraft,
  type DvtSubstraitProjectionDraft,
} from './canvasDvtSubstraitProjection';
import {
  applyDvtSubstraitSemanticDocument,
  readDvtTransformAuthoringAuthority,
} from './canvasDvtTransformAuthoringAuthority';

export function createDvtSourceSemanticDraft(
  node: CanonicalNode
): DvtSubstraitProjectionDraft | undefined {
  const authority = readDvtTransformAuthoringAuthority(node);
  if (authority == null) return undefined;
  const draft = decodeDvtSubstraitProjectionDocument(authority.semanticDocument);
  if (!inspectDvtSubstraitProjectionDraft(draft).ok) {
    throw new Error('DVT Source semantic authority is not an admitted projection shape.');
  }
  return draft;
}

export function applyDvtSourceSemanticDraft(
  node: CanonicalNode,
  draft: DvtSubstraitProjectionDraft
): CanonicalNode {
  return applyDvtSubstraitSemanticDocument(node, encodeDvtSubstraitProjectionDocument(draft));
}
