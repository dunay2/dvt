import { PlanSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { create } from '@bufbuild/protobuf';
import { expect, it } from 'vitest';

import { RelationAnalysisSession } from '../src/relationAnalysisSession.js';

import { relationsFixture } from './relationsFixture.js';

it('owns function declarations in the same revision as a local command', async () => {
  const fixture = relationsFixture();
  const document = fixture.document(fixture.read());
  const session = new RelationAnalysisSession({ document, scope: 'model' });
  const before = await session.query('r1');
  const declarations = create(PlanSchema, {
    extensionUrns: [{ extensionUrnAnchor: 1, urn: 'extension:io.substrait:functions_comparison' }],
    extensions: [
      {
        mappingType: {
          case: 'extensionFunction',
          value: {
            extensionUrnReference: 1,
            functionAnchor: 1,
            name: 'equal',
          },
        },
      },
    ],
  });
  session.apply({ expectedRevision: 0, upserts: [], removed: [], extensions: declarations });
  const after = await session.query('r1');
  expect(after.fields).toEqual(before.fields);
  expect(after.fingerprint).not.toBe(before.fingerprint);
  expect(session.document().plan.extensions).toEqual(declarations.extensions);
  declarations.extensionUrns[0]!.urn = 'mutated';
  expect(session.document().plan.extensionUrns[0]!.urn).not.toBe('mutated');
  const work = session.work;
  const same = session.document().plan;
  session.apply({ expectedRevision: 1, upserts: [], removed: [], extensions: same });
  expect((await session.query('r1')).fingerprint).toBe(after.fingerprint);
  expect(session.work.analyzed).toBe(work.analyzed);
});
