/** Reuse sidecar identity/aliases for the applied scalar tree and its field ordinals. */
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import type { Rel } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { createCanvasFieldAliasLabels } from './canvasFieldAliasLabels';
import { relationAnchor } from './canvasRelationalTraversal';

export function createCanvasSemanticFieldNames(document: SubstraitDocument) {
  const relations = new Map(
    document.sidecar.relations.map((binding) => [binding.relationId, binding])
  );
  const fields = new Map(document.sidecar.fields.map((field) => [field.fieldId, field]));
  const aliases = new Map(
    document.sidecar.relations.map((binding) => [binding.relAnchor, binding.displayName])
  );
  const label = createCanvasFieldAliasLabels(
    (field) => (field.sourceFieldId == null ? undefined : fields.get(field.sourceFieldId)),
    (id) => relations.get(id)!.displayName
  );
  const names = new Map<number, { plain: string[]; qualified: string[] }>();
  for (const field of fields.values()) {
    if (field.parentFieldId != null) continue;
    const anchor = relations.get(field.relationId)!.relAnchor;
    const entry = names.get(anchor) ?? { plain: [], qualified: [] };
    entry.plain[field.outputOrdinal] = field.displayName ?? '—';
    entry.qualified[field.outputOrdinal] = label(field);
    names.set(anchor, entry);
  }
  return (relation: Rel, qualified = false): readonly string[] => {
    const anchor = relationAnchor(relation) ?? -1;
    const entry = names.get(anchor);
    if (entry != null) return qualified ? entry.qualified : entry.plain;
    const physicalNames =
      relation.relType.case === 'read' ? (relation.relType.value.baseSchema?.names ?? []) : [];
    const alias = aliases.get(anchor);
    return qualified && alias ? physicalNames.map((name) => `${alias}.${name}`) : physicalNames;
  };
}
