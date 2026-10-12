/** Prevent rewiring an input that already participates in authored semantics. */
import { jcsCanonicalize } from '@dvt/crypto';
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasInputBinding } from './canvasInputBindings';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';

export function canvasInputBindingIsConsumed(
  input: CanvasInputBinding,
  consumer: CanonicalNode,
  producer: CanonicalNode | undefined
): boolean {
  const authority = readDvtTransformAuthoringAuthority(consumer);
  if (authority == null) return false;
  const { relations, fields } = authority.semanticDocument.sidecar;
  return relations.some((relation) => {
    if (relation.producerRef?.nodeId === input.source.nodeId)
      return relation.producerRef.fields.some(
        (field) => field.producerFieldId === input.source.columnId
      );
    const sourceRef = producer?.metadata?.connectedSourceRef;
    return (
      sourceRef != null &&
      relation.sourceRef != null &&
      jcsCanonicalize(sourceRef) === jcsCanonicalize(relation.sourceRef) &&
      fields.some(
        (field) =>
          field.relationId === relation.relationId && field.displayName === input.source.columnId
      )
    );
  });
}
