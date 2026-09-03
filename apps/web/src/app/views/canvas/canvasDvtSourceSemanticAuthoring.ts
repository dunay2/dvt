/** Owns creation and persistence of the Source relation's canonical semantic draft. */
import type { CanonicalNode } from '../../types/canonical';
import {
  encodeDvtSubstraitFilterDocument,
  inspectDvtSubstraitFilter,
} from './canvasDvtSubstraitFilter';
import {
  createDvtSubstraitProjectionDraft,
  decodeDvtSubstraitProjectionDocument,
  encodeDvtSubstraitProjectionDocument,
  inspectDvtSubstraitProjectionDraft,
  resolveDvtSubstraitProjectionSource,
  type DvtSubstraitProjectionDraft,
} from './canvasDvtSubstraitProjection';
import {
  applyDvtSubstraitSemanticDocument,
  readDvtTransformAuthoringAuthority,
} from './canvasDvtTransformAuthoringAuthority';

function outputFieldId(name: string): string {
  return `output:${encodeURIComponent(name)}`;
}

export function createDvtSourceSemanticDraft(
  node: CanonicalNode
): DvtSubstraitProjectionDraft | undefined {
  const authority = readDvtTransformAuthoringAuthority(node);
  if (authority != null) {
    const draft = decodeDvtSubstraitProjectionDocument(authority.semanticDocument);
    if (!inspectDvtSubstraitProjectionDraft(draft).ok && inspectDvtSubstraitFilter(draft) == null) {
      throw new Error('DVT Source semantic authority is not an admitted projection shape.');
    }
    return draft;
  }
  const source = resolveDvtSubstraitProjectionSource(node);
  return source == null
    ? undefined
    : createDvtSubstraitProjectionDraft({
        source,
        targetNodeId: node.id,
        outputs: source.fields.map((field) => ({
          fieldId: outputFieldId(field.name),
          name: field.name,
          sourceFieldName: field.name,
        })),
      });
}

export function applyDvtSourceSemanticDraft(
  node: CanonicalNode,
  draft: DvtSubstraitProjectionDraft
): CanonicalNode {
  const document =
    inspectDvtSubstraitFilter(draft) == null
      ? encodeDvtSubstraitProjectionDocument(draft)
      : encodeDvtSubstraitFilterDocument(draft);
  return applyDvtSubstraitSemanticDocument(node, document);
}
