/** A trusted local command reports canonical changed messages; it does not invent another IR. */
import type { Rel } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { PlanSchema, type Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { clone } from '@bufbuild/protobuf';
import {
  DvtSubstraitFieldBindingV1Schema,
  DvtSubstraitRelationBindingV1Schema,
  type DvtSubstraitFieldBindingV1,
  type DvtSubstraitRelationBindingV1,
  DvtSemanticFieldNameV1Schema,
} from '@dvt/contracts';

import { SubstraitAnalysisError } from './document.js';
import { relationChangeOrder } from './relationChangeOrder.js';
import { prepareFieldChanges, publishFieldChanges } from './relationFieldChanges.js';
import { fingerprintEnvironment, fingerprintRelation } from './relationFingerprint.js';
import type { IndexedRelation } from './relationIndex.js';
import { cloneLocalRelation } from './relationMessage.js';
import type { RelationSnapshot } from './relationSnapshot.js';
import { readRelationStructure } from './relationStructure.js';

export type RelationChangeSet = Readonly<{
  expectedRevision: number;
  upserts: readonly Readonly<{
    relation: Rel;
    binding: DvtSubstraitRelationBindingV1;
    fields: readonly DvtSubstraitFieldBindingV1[];
  }>[];
  removed: readonly string[];
  rootId?: string;
  rootNames?: readonly string[];
  extensions?: Pick<Plan, 'extensionUrns' | 'extensions'>;
}>;

function invalid(message: string): never {
  throw new SubstraitAnalysisError('invalid_binding', message);
}

export function applyRelationChanges(snapshot: RelationSnapshot, change: RelationChangeSet): void {
  const header =
    change.extensions == null
      ? snapshot.header
      : clone(PlanSchema, {
          ...snapshot.header,
          extensionUrns: change.extensions.extensionUrns,
          extensions: change.extensions.extensions,
        });
  const environment =
    header === snapshot.header ? snapshot.environment : fingerprintEnvironment(header);
  const touched = new Set([
    ...change.removed,
    ...change.upserts.map((entry) => entry.binding.relationId),
  ]);
  if (touched.size !== change.removed.length + change.upserts.length)
    invalid('Repeated change identity.');
  const removed = new Set(change.removed);
  for (const id of removed) snapshot.get(id);
  const rootId = change.rootId ?? snapshot.rootId;
  const rootNames =
    change.rootNames?.map((name) => DvtSemanticFieldNameV1Schema.parse(name)) ?? snapshot.rootNames;
  const anchors = new Map<number, string>();
  for (const entry of change.upserts) {
    const binding = DvtSubstraitRelationBindingV1Schema.parse(entry.binding);
    const occupied = snapshot.anchors.get(binding.relAnchor);
    if (anchors.has(binding.relAnchor) || (occupied != null && !touched.has(occupied)))
      invalid('Duplicate relation anchor.');
    if (readRelationStructure(entry.relation).common?.relAnchor !== binding.relAnchor)
      invalid('Relation anchor and binding differ.');
    anchors.set(binding.relAnchor, binding.relationId);
  }
  const staged = new Map<string, IndexedRelation>();
  const get = (id: string): IndexedRelation => {
    if (removed.has(id)) return invalid('Removed relation remains connected.');
    return staged.get(id) ?? snapshot.get(id);
  };
  for (const entry of change.upserts) {
    const id = entry.binding.relationId;
    const inputs = readRelationStructure(entry.relation).inputs.map((input) => {
      const anchor = readRelationStructure(input).common?.relAnchor;
      const inputId =
        anchor == null ? undefined : (anchors.get(anchor) ?? snapshot.anchors.get(anchor));
      if (inputId == null || removed.has(inputId))
        return invalid('Input is outside the changed snapshot.');
      return inputId;
    });
    if (new Set(inputs).size !== inputs.length)
      invalid('Each input occurrence requires its own identity.');
    const fields = entry.fields.map((field) => DvtSubstraitFieldBindingV1Schema.parse(field));
    if (fields.some((field) => field.relationId !== id))
      invalid('Field belongs to another relation.');
    staged.set(id, {
      relation: entry.relation,
      binding: globalThis.structuredClone(entry.binding),
      inputs,
      consumers: [...(snapshot.relations.get(id)?.consumers ?? [])],
      fields: fields.sort((a, b) => a.outputOrdinal - b.outputOrdinal),
    });
  }
  const affected = new Set<string>();
  const pending = [
    ...(environment === snapshot.environment ? [] : snapshot.relations.keys()),
    ...touched,
    ...(change.rootNames != null || change.rootId != null ? [rootId, snapshot.rootId] : []),
  ];
  while (pending.length > 0) {
    const id = pending.pop()!;
    if (affected.has(id)) continue;
    affected.add(id);
    pending.push(...(snapshot.relations.get(id)?.consumers ?? []));
  }
  const reviseConsumer = (input: string, consumer: string, add: boolean): void => {
    if (removed.has(input)) return;
    const entry = get(input);
    const consumers = new Set(entry.consumers);
    if (add) consumers.add(consumer);
    else consumers.delete(consumer);
    staged.set(input, { ...entry, consumers: [...consumers] });
  };
  for (const id of touched) {
    for (const input of snapshot.relations.get(id)?.inputs ?? []) reviseConsumer(input, id, false);
  }
  for (const entry of change.upserts) {
    for (const input of get(entry.binding.relationId).inputs)
      reviseConsumer(input, entry.binding.relationId, true);
  }
  for (const id of affected) {
    if (!removed.has(id) && !staged.has(id)) staged.set(id, snapshot.get(id));
  }
  for (const id of [rootId, snapshot.rootId, ...staged.keys()]) {
    if (removed.has(id)) continue;
    const entry = get(id);
    if (entry.consumers.length !== (id === rootId ? 0 : 1))
      invalid('Change disconnects or shares a relation occurrence.');
    for (const input of entry.inputs) get(input);
  }
  get(rootId);
  const order = relationChangeOrder(affected, removed, get);
  const fields = prepareFieldChanges(snapshot, touched, staged, rootId);
  const fingerprints = new Map<string, string>();
  for (const id of order) {
    const entry = get(id);
    const owned = {
      ...entry,
      relation: cloneLocalRelation(
        entry.relation,
        entry.inputs.map((input) => get(input).relation)
      ),
    };
    staged.set(id, owned);
    fingerprints.set(
      id,
      fingerprintRelation(
        owned,
        entry.inputs.map((input) => fingerprints.get(input) ?? snapshot.fingerprints.get(input)!),
        environment,
        id === rootId ? rootNames : undefined
      )
    );
  }
  // Everything above is private preparation. Publish synchronously only after all invariants pass.
  for (const id of touched) {
    const old = snapshot.relations.get(id);
    if (old != null) snapshot.anchors.delete(old.binding.relAnchor);
  }
  for (const id of removed) {
    snapshot.relations.delete(id);
    snapshot.fingerprints.delete(id);
    snapshot.settled.delete(id);
  }
  for (const [id, entry] of staged) {
    snapshot.relations.set(id, entry);
    snapshot.anchors.set(entry.binding.relAnchor, id);
    snapshot.nextAnchor = Math.max(snapshot.nextAnchor, entry.binding.relAnchor + 1);
  }
  publishFieldChanges(snapshot, fields);
  for (const [id, fingerprint] of fingerprints) {
    if (snapshot.fingerprints.get(id) !== fingerprint) snapshot.settled.delete(id);
    snapshot.fingerprints.set(id, fingerprint);
  }
  snapshot.rootId = rootId;
  snapshot.rootNames = rootNames;
  snapshot.header = header;
  snapshot.environment = environment;
  snapshot.work.fingerprinted += fingerprints.size;
  snapshot.work.visited += affected.size;
}
