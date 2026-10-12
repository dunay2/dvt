/** Private owned snapshot. Only the session publishes copies or serialized derived facts. */
import { PlanSchema, type Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { clone, toBinary } from '@bufbuild/protobuf';
import type { DvtSubstraitFieldBindingV1 } from '@dvt/contracts';
import { sha256Hex } from '@dvt/crypto';

import { type SubstraitDocument, SubstraitAnalysisError } from './document.js';
import { fingerprintEnvironment, fingerprintRelation } from './relationFingerprint.js';
import { indexSubstraitRelations, type IndexedRelation } from './relationIndex.js';
import { cloneLocalRelation } from './relationMessage.js';

export type AnalysisWork = { analyzed: number; fingerprinted: number; visited: number };
export type RelationLocation = Pick<
  IndexedRelation,
  'binding' | 'fields' | 'inputs' | 'consumers'
> &
  Readonly<{
    path: readonly number[];
    nextAnchor: number;
  }>;

export class RelationSnapshot {
  readonly relations = new Map<string, IndexedRelation>();
  readonly anchors = new Map<number, string>();
  readonly fields = new Map<string, DvtSubstraitFieldBindingV1>();
  readonly fieldConsumers = new Map<string, Set<string>>();
  readonly fingerprints = new Map<string, string>();
  readonly settled = new Set<string>();
  environment: string;
  header: Plan;
  rootId: string;
  rootNames: readonly string[];
  nextAnchor = 1;

  constructor(
    readonly authority: SubstraitDocument,
    readonly work: AnalysisWork
  ) {
    const indexed = indexSubstraitRelations(authority);
    if (!indexed.ok) throw indexed.error;
    const { index } = indexed;
    this.rootId = index.rootId;
    const root = authority.plan.relations[0]!;
    if (root.relType.case !== 'root') throw new Error('Expected root.');
    this.rootNames = [...root.relType.value.names];
    if (
      authority.sidecar.semanticPlanSha256 !== '0'.repeat(64) &&
      authority.sidecar.semanticPlanSha256 !== sha256Hex(toBinary(PlanSchema, authority.plan))
    )
      throw new SubstraitAnalysisError('stale_document', 'Plan and sidecar revisions differ.');
    this.header = clone(PlanSchema, {
      ...authority.plan,
      relations: [
        {
          ...root,
          relType: {
            case: 'root',
            value: { ...root.relType.value, input: undefined },
          },
        },
      ],
    });
    this.environment = fingerprintEnvironment(this.header);
    for (const id of index.postorder) {
      const original = index.relations.get(id)!;
      const entry: IndexedRelation = {
        ...original,
        relation: cloneLocalRelation(
          original.relation,
          original.inputs.map((input) => this.get(input).relation)
        ),
        binding: globalThis.structuredClone(original.binding),
        fields: globalThis.structuredClone(original.fields),
        inputs: [...original.inputs],
        consumers: [...original.consumers],
      };
      this.relations.set(id, entry);
      this.anchors.set(entry.binding.relAnchor, id);
      this.nextAnchor = Math.max(this.nextAnchor, entry.binding.relAnchor + 1);
      for (const field of entry.fields) this.fields.set(field.fieldId, field);
      for (const field of entry.fields) {
        for (const dependency of [
          field.parentFieldId,
          field.sourceFieldId,
          ...(field.operandFieldIds ?? []),
        ]) {
          if (dependency == null) continue;
          const consumers = this.fieldConsumers.get(dependency) ?? new Set<string>();
          consumers.add(field.fieldId);
          this.fieldConsumers.set(dependency, consumers);
        }
      }
      this.fingerprints.set(
        id,
        fingerprintRelation(
          entry,
          entry.inputs.map((input) => this.fingerprints.get(input)!),
          this.environment,
          id === this.rootId ? this.rootNames : undefined
        )
      );
      work.fingerprinted += 1;
      work.visited += 1;
    }
    // Retain only value metadata; never retain the caller's mutable document.
    this.authority = {
      plan: this.header,
      sidecar: { ...authority.sidecar, relations: [], fields: [] },
    };
  }

  get(id: string): IndexedRelation {
    const entry = this.relations.get(id);
    if (entry == null)
      throw new SubstraitAnalysisError('unknown_relation', 'Relation is outside the snapshot.', id);
    return entry;
  }

  locate(relationId: string): RelationLocation {
    const snapshot = this;
    const selected = snapshot.get(relationId);
    const path: number[] = [];
    let child = selected;
    while (child.consumers.length > 0) {
      const parent = snapshot.get(child.consumers[0]!);
      path.push(parent.inputs.indexOf(child.binding.relationId));
      child = parent;
      snapshot.work.visited += 1;
    }
    return {
      path: path.reverse(),
      binding: globalThis.structuredClone(selected.binding),
      fields: globalThis.structuredClone(selected.fields),
      inputs: [...selected.inputs],
      consumers: [...selected.consumers],
      nextAnchor: snapshot.nextAnchor,
    };
  }

  postorder(id: string, cutAtSettled = false): string[] {
    const ordered: string[] = [];
    const pending = [id];
    while (pending.length > 0) {
      const current = pending.pop()!;
      ordered.push(current);
      if (!cutAtSettled || current === id || !this.settled.has(current))
        pending.push(...this.get(current).inputs);
      this.work.visited += 1;
    }
    return ordered.reverse();
  }

  export(): SubstraitDocument {
    const copied = new Map<string, IndexedRelation['relation']>();
    for (const id of this.postorder(this.rootId)) {
      const entry = this.get(id);
      copied.set(
        id,
        cloneLocalRelation(
          entry.relation,
          entry.inputs.map((input) => copied.get(input)!)
        )
      );
    }
    const plan = clone(PlanSchema, this.header);
    const root = plan.relations[0]!.relType;
    if (root.case !== 'root') throw new Error('Expected root.');
    root.value.input = copied.get(this.rootId)!;
    root.value.names = [...this.rootNames];
    return {
      plan,
      sidecar: {
        ...this.authority.sidecar,
        semanticPlanSha256: sha256Hex(toBinary(PlanSchema, plan)),
        relations: [...this.relations.values()].map((entry) =>
          globalThis.structuredClone(entry.binding)
        ),
        fields: [...this.fields.values()].map((field) => globalThis.structuredClone(field)),
      },
    };
  }
}
