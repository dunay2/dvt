/** Owns the canonical JOIN output identities available to column authoring. */
import type { CanonicalNode } from '../../types/canonical';
import {
  decodeDvtSubstraitJoinDocument,
  DVT_SUBSTRAIT_INNER_JOIN_FIELD_KEYS,
  inspectDvtSubstraitBinaryJoinDraft,
  inspectDvtSubstraitJoinDraft,
  type DvtSubstraitInnerJoinFieldKey,
} from './canvasDvtSubstraitJoinComposition';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';

export function readCanvasJoinColumnOutputs(node: CanonicalNode) {
  if (node.pluginId !== 'dvt' || node.kind !== 'dvt:transform' || node.role !== 'transform')
    return null;
  try {
    const authority = readDvtTransformAuthoringAuthority(node);
    if (authority == null) return null;
    const draft = decodeDvtSubstraitJoinDocument(authority.semanticDocument);
    const inspected = inspectDvtSubstraitJoinDraft(draft);
    if (!inspected.ok) return null;
    const { projection } = inspected;
    const binary = inspectDvtSubstraitBinaryJoinDraft(draft).ok;
    const usedNames = new Set(projection.outputs.map((output) => output.name));
    const fields = projection.inputs.flatMap((input, inputIndex) =>
      input.fields.flatMap((field) => {
        const fieldKey = DVT_SUBSTRAIT_INNER_JOIN_FIELD_KEYS.find(
          (key) => key === `${inputIndex === 0 ? 'left' : 'right'}.${field.name}`
        );
        if (binary && fieldKey == null) return [];
        const output = projection.outputs.find(
          (candidate) => candidate.source.fieldId === field.fieldId
        );
        let name = output?.name ?? field.name;
        if (output == null && usedNames.has(name))
          name = `${input.schema}.${input.table}.${field.name}`;
        usedNames.add(name);
        const selector: { fieldKey: DvtSubstraitInnerJoinFieldKey } | { sourceFieldId: string } =
          binary && fieldKey != null ? { fieldKey } : { sourceFieldId: field.fieldId };
        return [
          {
            columnId: output?.fieldId ?? field.fieldId,
            sourceFieldId: field.fieldId,
            name,
            dataType: field.dataType,
            selected: output != null,
            ordinal: output?.outputOrdinal ?? Number.MAX_SAFE_INTEGER,
            sourceReference: `${input.schema}.${input.table}.${field.name}`,
            selector,
          },
        ];
      })
    );
    return {
      draft,
      projection,
      fields: fields.sort((left, right) => left.ordinal - right.ordinal),
    };
  } catch {
    return null;
  }
}
