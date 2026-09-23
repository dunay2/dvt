import { describe, expect, it } from 'vitest';

import {
  inspectDvtSubstraitAcceptedCrossDraft,
  inspectDvtSubstraitJoinDraft,
  inspectDvtSubstraitSetDraft,
  projectSubstraitToPostgresSql,
} from '../src/index.js';

import { readOccurrences, repeatFirstSource } from './occurrenceAdmissionFixtures.js';
import { identityFixture, refreshDigest } from './relationIdentityFixtures.js';

const scenarios = [
  {
    kind: 'join',
    inspect: inspectDvtSubstraitJoinDraft,
  },
  {
    kind: 'cross',
    inspect: inspectDvtSubstraitAcceptedCrossDraft,
  },
  {
    kind: 'mixed-cross',
    inspect: inspectDvtSubstraitAcceptedCrossDraft,
  },
  { kind: 'set', inspect: inspectDvtSubstraitSetDraft },
] as const;

describe.each(scenarios)('$kind occurrence admission', ({ kind, inspect }) => {
  it('keeps relation labels out of semantic admission and SQL generation', async () => {
    const draft = identityFixture(kind);
    const before = await projectSubstraitToPostgresSql(draft);
    const identities = draft.sidecar.relations.map(({ relationId }) => relationId);
    draft.sidecar.relations.forEach((rel, ordinal) => {
      rel.displayName = `Label ${ordinal}`;
    });

    expect(inspect(draft).ok).toBe(true);
    expect((await projectSubstraitToPostgresSql(draft)).sql).toBe(before.sql);
    expect(draft.sidecar.relations.map(({ relationId }) => relationId)).toEqual(identities);
  });

  it('admits repeated physical sources with independent occurrence and field identities', async () => {
    const draft = identityFixture(kind);
    const identities = draft.sidecar.fields.map(({ fieldId }) => fieldId);
    repeatFirstSource(draft);
    const before = globalThis.structuredClone(draft);
    const inspection = inspect(draft);

    expect(inspection.ok).toBe(true);
    if (!inspection.ok) throw new Error('Expected admitted repeated source');
    const inputs = inspection.projection.inputs;
    expect(inputs.at(-1)!.sourceRef).toEqual(inputs[0]!.sourceRef);
    expect(inputs.at(-1)!.relationId).not.toBe(inputs[0]!.relationId);
    expect(inputs.at(-1)!.fields[0]!.fieldId).not.toBe(inputs[0]!.fields[0]!.fieldId);
    const rendered = await projectSubstraitToPostgresSql(draft);
    expect(rendered.sql.split(`${inputs[0]!.schema}.${inputs[0]!.table}`)).toHaveLength(3);
    expect(draft).toEqual(before);
    expect(draft.sidecar.fields.map(({ fieldId }) => fieldId)).toEqual(identities);
  });

  it.each(['physical binding', 'connection', 'identity', 'digest'] as const)(
    'still rejects contradictory %s after admitting instances',
    (failure) => {
      const draft = identityFixture(kind);
      repeatFirstSource(draft);
      if (failure === 'physical binding') {
        const rel = readOccurrences(draft).at(-1)!;
        if (rel.relType.case !== 'read' || rel.relType.value.readType.case !== 'namedTable')
          throw new Error('Named read required');
        rel.relType.value.readType.value.names[1] = 'unrelated_table';
        refreshDigest(draft);
      }
      if (failure === 'connection') {
        const binding = draft.sidecar.relations.filter((rel) => rel.sourceRef != null).at(-1)!;
        binding.sourceRef!.connectionRef.connectionId = 'another-connection';
      }
      if (failure === 'identity')
        draft.sidecar.fields[1]!.fieldId = draft.sidecar.fields[0]!.fieldId;
      if (failure === 'digest') draft.sidecar.semanticPlanSha256 = 'f'.repeat(64);
      expect(inspect(draft).ok).toBe(false);
    }
  );
});
