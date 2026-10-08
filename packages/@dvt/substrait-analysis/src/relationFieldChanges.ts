/**
 * Owned concern: validate local field changes with complete referenced producer bindings.
 * @baseline ADR-0064: stable identities remain governed by the canonical sidecar contract.
 * @decision Complete producer context from actual staged fields without enlarging the delta.
 * @consequence Subset edits retain strict mapping validation and localized publication.
 * @version 1.1.0
 */
import {
  DvtSubstraitAuthoringSidecarV1Schema,
  type DvtSubstraitFieldBindingV1,
} from '@dvt/contracts';

import { SubstraitAnalysisError } from './document.js';
import type { IndexedRelation } from './relationIndex.js';
import type { RelationSnapshot } from './relationSnapshot.js';

export function fieldDependencies(field: DvtSubstraitFieldBindingV1): string[] {
  return [field.parentFieldId, field.sourceFieldId, ...(field.operandFieldIds ?? [])].filter(
    (id): id is string => id != null
  );
}

export function prepareFieldChanges(
  snapshot: RelationSnapshot,
  touched: ReadonlySet<string>,
  entries: ReadonlyMap<string, IndexedRelation>,
  rootId: string
): Readonly<{
  old: readonly DvtSubstraitFieldBindingV1[];
  next: readonly DvtSubstraitFieldBindingV1[];
}> {
  const old = [...touched].flatMap((id) => snapshot.relations.get(id)?.fields ?? []);
  const next = [...touched].flatMap((id) => entries.get(id)?.fields ?? []);
  const oldIds = new Set(old.map((field) => field.fieldId));
  const proposed = new Map<string, DvtSubstraitFieldBindingV1>();
  for (const field of next) {
    if (
      proposed.has(field.fieldId) ||
      (snapshot.fields.has(field.fieldId) && !oldIds.has(field.fieldId))
    )
      throw new SubstraitAnalysisError('invalid_binding', 'Duplicate field identity.');
    proposed.set(field.fieldId, field);
  }
  const find = (id: string): DvtSubstraitFieldBindingV1 | undefined =>
    proposed.get(id) ?? (oldIds.has(id) ? undefined : snapshot.fields.get(id));
  const pending = [
    ...proposed.keys(),
    ...old.flatMap((field) => [...(snapshot.fieldConsumers.get(field.fieldId) ?? [])]),
  ];
  const relations = new Map<string, IndexedRelation>();
  const includeRelation = (id: string): void => {
    if (relations.has(id)) return;
    const entry = entries.get(id) ?? snapshot.get(id);
    relations.set(id, entry);
    if (entry.binding.producerRef != null)
      pending.push(...entry.fields.map((field) => field.fieldId));
  };
  includeRelation(rootId);
  for (const id of touched) if (entries.has(id)) includeRelation(id);
  const included = new Map<string, DvtSubstraitFieldBindingV1>();
  while (pending.length > 0) {
    const id = pending.pop()!;
    if (included.has(id)) continue;
    const field = find(id);
    if (field == null) {
      if (oldIds.has(id)) continue;
      throw new SubstraitAnalysisError('invalid_binding', 'Field dependency is absent.');
    }
    included.set(id, field);
    includeRelation(field.relationId);
    pending.push(...fieldDependencies(field));
  }
  const validated = DvtSubstraitAuthoringSidecarV1Schema.safeParse({
    ...snapshot.authority.sidecar,
    relations: [...relations.values()].map((entry) => entry.binding),
    fields: [...included.values()],
  });
  if (!validated.success)
    throw new SubstraitAnalysisError('invalid_binding', validated.error.message);
  return { old, next };
}

export function publishFieldChanges(
  snapshot: RelationSnapshot,
  fields: ReturnType<typeof prepareFieldChanges>
): void {
  for (const field of fields.old) {
    snapshot.fields.delete(field.fieldId);
    for (const dependency of fieldDependencies(field)) {
      const consumers = snapshot.fieldConsumers.get(dependency);
      consumers?.delete(field.fieldId);
      if (consumers?.size === 0) snapshot.fieldConsumers.delete(dependency);
    }
  }
  for (const field of fields.next) {
    snapshot.fields.set(field.fieldId, field);
    for (const dependency of fieldDependencies(field)) {
      const consumers = snapshot.fieldConsumers.get(dependency) ?? new Set<string>();
      consumers.add(field.fieldId);
      snapshot.fieldConsumers.set(dependency, consumers);
    }
  }
}
