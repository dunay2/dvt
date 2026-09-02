/** Owned concern: update one field description in the canonical DVT Substrait sidecar. */
import type { DvtSubstraitTransformAuthoringMetadata } from './canvasDvtAuthoringModel';
import { inspectDvtSubstraitProjectionDraft } from './canvasDvtSubstraitProjection';

export function setDvtSubstraitFieldDescription(args: {
  metadata: DvtSubstraitTransformAuthoringMetadata;
  fieldId: string;
  description: string;
}): DvtSubstraitTransformAuthoringMetadata {
  if (args.metadata.shape !== 'projection') return args.metadata;
  const normalized = args.description.trim();
  let found = false;
  const fields = args.metadata.sidecar.fields.map((field) => {
    if (field.fieldId !== args.fieldId) return field;
    found = true;
    const { description: _currentDescription, ...fieldWithoutDescription } = field;
    return normalized.length === 0
      ? fieldWithoutDescription
      : { ...fieldWithoutDescription, description: normalized };
  });
  if (!found) return args.metadata;
  const next = { ...args.metadata, sidecar: { ...args.metadata.sidecar, fields } };
  return inspectDvtSubstraitProjectionDraft({ plan: next.plan, sidecar: next.sidecar }).ok
    ? next
    : args.metadata;
}
