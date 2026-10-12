/**
 * Owned concern: prove localized relation changes preserve complete canonical validation.
 * @baseline GH-3578: producer bindings require all real local fields, even outside final emit.
 * @decision Exercise transaction, export and contextual delta with atomic rejection cases.
 * @consequence Validation context cannot silently enlarge or repair the published change.
 * @version 1.1.0
 */
import { RelSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { PlanSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import {
  TypeSchema,
  Type_Nullability,
} from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { clone, create } from '@bufbuild/protobuf';
import { describe, expect, it } from 'vitest';

import type { SubstraitDocument } from '../src/document.js';
import { createProducerInput } from '../src/producerInput.js';
import { RelationAnalysisSession } from '../src/relationAnalysisSession.js';
import type { RelationChangeSet } from '../src/relationChangeSet.js';
import { prepareFieldChanges } from '../src/relationFieldChanges.js';
import { deriveSubstraitSchemas } from '../src/relationSchema.js';
import { RelationSnapshot } from '../src/relationSnapshot.js';

import { relationsFixture } from './relationsFixture.js';

function producerProjection(): {
  producer: SubstraitDocument;
  input: ReturnType<typeof createProducerInput>;
  project: RelationChangeSet['upserts'][number];
  document: SubstraitDocument;
} {
  const grammar = relationsFixture();
  const producer = grammar.document(grammar.read());
  const root = producer.plan.relations[0]!.relType;
  if (root.case !== 'root' || root.value.input?.relType.case !== 'read')
    throw new Error('Expected producer Read.');
  const schema = root.value.input.relType.value.baseSchema!;
  schema.names = root.value.names = ['value', 'record', 'nested'];
  schema.struct!.types.push(
    create(TypeSchema, {
      kind: {
        case: 'struct',
        value: {
          nullability: Type_Nullability.REQUIRED,
          types: [schema.struct!.types[0]!],
        },
      },
    })
  );
  producer.sidecar.fields.push(
    { fieldId: 'record', relationId: 'r1', outputOrdinal: 1, displayName: 'record' },
    {
      fieldId: 'nested',
      relationId: 'r1',
      parentFieldId: 'record',
      outputOrdinal: 0,
      displayName: 'nested',
    }
  );
  const input = createProducerInput(
    { nodeId: 'producer', name: 'Producer', document: producer },
    1
  );
  const project = {
    relation: create(RelSchema, {
      relType: {
        case: 'project',
        value: {
          input: input.relation,
          common: { relAnchor: 2, emitKind: { case: 'emit', value: { outputMapping: [0, 1] } } },
        },
      },
    }),
    binding: { relationId: 'consumer', relAnchor: 2 },
    fields: input.fields.map((field) => ({
      ...field,
      fieldId: `output:${field.fieldId}`,
      relationId: 'consumer',
      sourceFieldId: field.fieldId,
      ...(field.parentFieldId == null ? {} : { parentFieldId: `output:${field.parentFieldId}` }),
    })),
  };
  const document: SubstraitDocument = {
    plan: create(PlanSchema, {
      version: producer.plan.version,
      relations: [
        { relType: { case: 'root', value: { input: project.relation, names: schema.names } } },
      ],
    }),
    sidecar: {
      ...producer.sidecar,
      relations: [input.binding, project.binding],
      fields: [...input.fields, ...project.fields],
    },
  };
  return { producer, input, project, document };
}

describe('localized relation edits', () => {
  it('validates complete producer siblings without publishing them as part of a Project delta', async () => {
    const fixture = producerProjection();
    const producerBefore = globalThis.structuredClone(fixture.producer);
    const session = new RelationAnalysisSession({ document: fixture.document, scope: 'producer' });
    const initial = session.document();
    for (const mapping of [[0], [1, 0]]) {
      const relation = clone(RelSchema, fixture.project.relation);
      if (relation.relType.case !== 'project') throw new Error('Expected Project.');
      relation.relType.value.common!.emitKind = {
        case: 'emit',
        value: { $typeName: 'substrait.RelCommon.Emit', outputMapping: mapping },
      };
      const fields = mapping.flatMap((ordinal, outputOrdinal) => {
        const parent = fixture.project.fields.find(
          (field) => field.parentFieldId == null && field.outputOrdinal === ordinal
        )!;
        return [
          { ...parent, outputOrdinal },
          ...fixture.project.fields.filter((field) => field.parentFieldId === parent.fieldId),
        ];
      });
      const snapshot = new RelationSnapshot(session.document(), {
        analyzed: 0,
        fingerprinted: 0,
        visited: 0,
      });
      const project = { ...snapshot.get('consumer'), relation, fields };
      expect(
        prepareFieldChanges(
          snapshot,
          new Set(['consumer']),
          new Map([['consumer', project]]),
          'consumer'
        )
      ).toEqual({ old: snapshot.get('consumer').fields, next: fields });
      session.apply({
        expectedRevision: session.revision,
        upserts: [project],
        removed: [],
        rootNames: fields.map((field) => field.displayName!),
      });
      const saved = session.document();
      expect(session.locate(fixture.input.binding.relationId, session.revision).fields).toEqual(
        fixture.input.fields
      );
      expect(saved.sidecar.relations).toEqual(initial.sidecar.relations);
      expect((await session.query('consumer')).fields).toEqual(
        deriveSubstraitSchemas(saved).schemas.get('consumer')
      );
      expect((await session.query('consumer')).fields).toHaveLength(mapping.length);
      const reopened = new RelationAnalysisSession({ document: saved, scope: 'reopened' });
      expect((await reopened.query('consumer')).bindings).toEqual(fields);
      reopened.dispose();
    }
    expect(fixture.producer).toEqual(producerBefore);
    session.dispose();
  });

  it('validates a producer Read root when only root names change and no fields are touched', async () => {
    const { document, input } = producerProjection();
    const root = document.plan.relations[0]!.relType;
    if (root.case !== 'root') throw new Error('Expected root.');
    root.value.input = input.relation;
    document.sidecar.relations = [input.binding];
    document.sidecar.fields = input.fields;
    const session = new RelationAnalysisSession({ document, scope: 'producer-root' });
    const initial = session.document();
    const snapshot = new RelationSnapshot(initial, { analyzed: 0, fingerprinted: 0, visited: 0 });
    expect(prepareFieldChanges(snapshot, new Set(), new Map(), session.rootId)).toEqual({
      old: [],
      next: [],
    });
    session.apply({
      expectedRevision: 0,
      upserts: [],
      removed: [],
      rootNames: ['renamed', 'record', 'nested'],
    });
    expect(session.document().sidecar).toMatchObject({
      relations: initial.sidecar.relations,
      fields: initial.sidecar.fields,
    });
    expect(session.document().plan.relations[0]!.relType).toMatchObject({
      value: { names: ['renamed', 'record', 'nested'] },
    });
    expect((await session.query(session.rootId)).fields).toEqual(
      deriveSubstraitSchemas(session.document()).schemas.get(session.rootId)
    );
    session.dispose();
  });

  it.each(['missing', 'extra', 'duplicate', 'removed-local', 'removed-all-unpublished'] as const)(
    'rejects %s producer field mappings atomically instead of restoring or fabricating fields',
    async (corruption) => {
      const { document, input, project } = producerProjection();
      if (corruption === 'removed-all-unpublished') {
        if (project.relation.relType.case !== 'project') throw new Error('Expected Project.');
        project.relation.relType.value.common!.emitKind = {
          case: 'emit',
          value: { $typeName: 'substrait.RelCommon.Emit', outputMapping: [] },
        };
        const root = document.plan.relations[0]!.relType;
        if (root.case !== 'root') throw new Error('Expected root.');
        root.value.names = [];
        document.sidecar.fields = input.fields;
      }
      const session = new RelationAnalysisSession({ document, scope: 'invalid-producer' });
      const before = session.document();
      const query = await session.query(session.rootId);
      const changed = globalThis.structuredClone(input);
      const reference = changed.binding.producerRef!;
      if (corruption === 'missing') reference.fields.pop();
      if (corruption === 'extra')
        reference.fields.push({ fieldId: 'absent', producerFieldId: 'absent-published' });
      if (corruption === 'duplicate') reference.fields.push({ ...reference.fields[0]! });
      if (corruption === 'removed-local') changed.fields.pop();
      if (corruption === 'removed-all-unpublished') changed.fields = [];
      expect(() =>
        session.apply({ expectedRevision: 0, upserts: [changed], removed: [] })
      ).toThrow();
      expect(session.revision).toBe(0);
      expect(session.document()).toEqual(before);
      expect(await session.query(session.rootId)).toEqual(query);
      session.dispose();
    }
  );

  it('preserves provider-neutral output names through delta, query and export', async () => {
    const fixture = relationsFixture();
    const session = new RelationAnalysisSession({
      document: fixture.document(fixture.read()),
      scope: 'model',
    });
    const name = '😀'.repeat(256);
    session.apply({ expectedRevision: 0, upserts: [], removed: [], rootNames: [name] });
    const accepted = session.document();
    expect(accepted.plan.relations[0]!.relType).toMatchObject({
      case: 'root',
      value: { names: [name] },
    });
    expect((await session.query('r1')).fields).toEqual(
      deriveSubstraitSchemas(accepted).schemas.get('r1')
    );
    expect(() =>
      session.apply({ expectedRevision: 1, upserts: [], removed: [], rootNames: [name + 'x'] })
    ).toThrow();
    expect(session.document()).toEqual(accepted);
  });

  it('inserts, reconnects and removes a wrapper without stale dependencies', async () => {
    const fixture = relationsFixture();
    const read = fixture.read();
    const root = fixture.unary('project', read);
    const session = new RelationAnalysisSession({
      document: fixture.document(root),
      scope: 'model',
    });
    const baseline = await session.query('r2');
    const filter = create(RelSchema, {
      relType: {
        case: 'filter',
        value: {
          input: read,
          common: { relAnchor: 3 },
          condition: {
            rexType: { case: 'literal', value: { literalType: { case: 'boolean', value: true } } },
          },
        },
      },
    });
    const project = clone(RelSchema, root);
    if (project.relType.case !== 'project') throw new Error('Expected project');
    project.relType.value.input = filter;
    const original = session.document();
    const projectionEntry = {
      relation: project,
      binding: original.sidecar.relations[1]!,
      fields: [original.sidecar.fields[1]!],
    };
    session.apply({
      expectedRevision: 0,
      upserts: [
        projectionEntry,
        {
          relation: filter,
          binding: { relationId: 'r3', relAnchor: 3 },
          fields: [],
        },
      ],
      removed: [],
    });
    const applied = await session.query('r2');
    expect(applied.fingerprint).not.toBe(baseline.fingerprint);
    const authority = session.document();
    expect(applied.fields).toEqual(deriveSubstraitSchemas(authority).schemas.get('r2'));
    session.apply({
      expectedRevision: 1,
      upserts: [{ ...projectionEntry, relation: root }],
      removed: ['r3'],
    });
    expect((await session.query('r2')).fingerprint).toBe(baseline.fingerprint);
    await expect(session.query('r3')).rejects.toMatchObject({ code: 'unknown_relation' });
    expect(
      session
        .document()
        .sidecar.relations.map((entry) => entry.relationId)
        .sort()
    ).toEqual(['r1', 'r2']);
  });

  it('rejects a cycle atomically and retains a queryable previous snapshot', async () => {
    const fixture = relationsFixture();
    const filter = fixture.unary('filter', fixture.read());
    const document = fixture.document(filter);
    const session = new RelationAnalysisSession({ document, scope: 'model' });
    const before = await session.query('r2');
    const changed = clone(RelSchema, filter);
    if (changed.relType.case !== 'filter') throw new Error('Expected filter');
    changed.relType.value.input = filter;
    expect(() =>
      session.apply({
        expectedRevision: 0,
        removed: [],
        upserts: [
          {
            relation: changed,
            binding: document.sidecar.relations[1]!,
            fields: [document.sidecar.fields[1]!],
          },
        ],
      })
    ).toThrow();
    expect(await session.query('r2')).toEqual(before);
  });
});
