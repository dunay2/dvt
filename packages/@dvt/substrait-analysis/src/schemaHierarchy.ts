/** Structural field positions belong to Substrait; identities belong to the sidecar. */
import type { Type } from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import type { DvtSubstraitFieldBindingV1 } from '@dvt/contracts';

import {
  invalidSchema,
  requireSchemaType,
  schemaFieldAt,
  type SchemaField,
} from './schemaTypes.js';

export function schemaNameCount(types: readonly Type[]): number {
  let count = types.length;
  const pending = [...types];
  while (pending.length > 0) {
    const kind = requireSchemaType(pending.pop()).kind;
    if (kind.case === 'struct') {
      count += kind.value.types.length;
      pending.push(...kind.value.types);
    } else if (kind.case === 'list') pending.push(requireSchemaType(kind.value.type));
    else if (kind.case === 'map')
      pending.push(requireSchemaType(kind.value.key), requireSchemaType(kind.value.value));
  }
  return count;
}

export function bindSchemaFields(
  fields: readonly SchemaField[],
  bindings: readonly DvtSubstraitFieldBindingV1[]
): ReadonlyMap<string, SchemaField> {
  const children = new Map<string | undefined, DvtSubstraitFieldBindingV1[]>();
  for (const binding of bindings) {
    const siblings = children.get(binding.parentFieldId) ?? [];
    siblings.push(binding);
    children.set(binding.parentFieldId, siblings);
  }
  const result = new Map<string, SchemaField>();
  const pending: { parent?: string; fields: readonly SchemaField[] }[] = [{ fields }];
  while (pending.length > 0) {
    const current = pending.pop()!;
    for (const binding of children.get(current.parent) ?? []) {
      const field = schemaFieldAt(current.fields, binding.outputOrdinal);
      result.set(binding.fieldId, field);
      if (children.has(binding.fieldId)) {
        if (field.children == null) return invalidSchema('A field binding has no struct parent.');
        pending.push({ parent: binding.fieldId, fields: field.children });
      }
    }
  }
  if (result.size !== bindings.length) return invalidSchema('Unresolved field hierarchy.');
  return result;
}

export function deriveReadFields(
  types: readonly Type[],
  bindings: readonly DvtSubstraitFieldBindingV1[]
): readonly SchemaField[] {
  type MutableField = { type: Type; sourceFieldIds: string[]; children?: MutableField[] };
  const fields: MutableField[] = [];
  const pending = [{ types, fields }];
  while (pending.length > 0) {
    const item = pending.pop()!;
    for (const type of item.types) {
      const field: MutableField = { type: requireSchemaType(type), sourceFieldIds: [] };
      item.fields.push(field);
      if (type.kind.case === 'struct') {
        field.children = [];
        pending.push({ types: type.kind.value.types, fields: field.children });
      }
    }
  }
  const byId = bindSchemaFields(fields, bindings);
  const identities = new Map([...byId].map(([id, field]) => [field, id]));
  const check = [...fields];
  while (check.length > 0) {
    const field = check.pop()!;
    const id = identities.get(field);
    if (id == null) return invalidSchema('A Read field has no stable identity binding.');
    field.sourceFieldIds = [id];
    check.push(...(field.children ?? []));
  }
  return fields;
}
