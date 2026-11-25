import type {
  ReadRel,
  ReadRelSchema,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { PlanSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { Type_Nullability } from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { create, type MessageInitShape } from '@bufbuild/protobuf';
import { expect, it } from 'vitest';

import {
  decodeDvtSubstraitPlanV1,
  encodeDvtSubstraitPlanV1,
  isSourceFreeDvtSubstraitDocumentV1,
  type DvtSubstraitSemanticDocumentV1,
} from '../src/substrait.js';

import { buildDvtSubstraitSemanticDocumentFixture } from './fixtures/dvtSubstraitSemanticDocument.js';

function literalDocument(): DvtSubstraitSemanticDocumentV1 {
  const fixture = buildDvtSubstraitSemanticDocumentFixture();
  const names = ['comprobacion_editor_sql'];
  const required = { nullability: Type_Nullability.REQUIRED };
  const read = {
    common: { relAnchor: 1 },
    baseSchema: {
      names,
      struct: { ...required, types: [{ kind: { case: 'i32', value: required } }] },
    },
    readType: {
      case: 'virtualTable',
      value: {
        expressions: [
          {
            fields: [
              { rexType: { case: 'literal', value: { literalType: { case: 'i32', value: 1 } } } },
            ],
          },
        ],
      },
    },
  } satisfies MessageInitShape<typeof ReadRelSchema>;
  const plan = create(PlanSchema, {
    version: decodeDvtSubstraitPlanV1(fixture).version,
    relations: [
      {
        relType: {
          case: 'root',
          value: {
            names,
            input: { relType: { case: 'read', value: read } },
          },
        },
      },
    ],
  });
  const semanticPlan = encodeDvtSubstraitPlanV1(plan);
  return {
    ...fixture,
    semanticPlan,
    sidecar: {
      ...fixture.sidecar,
      semanticPlanSha256: semanticPlan.sha256,
      relations: [{ relationId: 'row', relAnchor: 1 }],
      fields: [{ relationId: 'row', fieldId: 'output', outputOrdinal: 0, displayName: names[0]! }],
    },
  };
}

it('recognizes one typed row without a source or producer', () => {
  expect(isSourceFreeDvtSubstraitDocumentV1(literalDocument())).toBe(true);
  expect(isSourceFreeDvtSubstraitDocumentV1(buildDvtSubstraitSemanticDocumentFixture())).toBe(
    false
  );
});

it('rejects inconsistent identity, provenance and stale bytes', () => {
  const document = literalDocument();
  const field = document.sidecar.fields[0]!;
  for (const replacement of [
    { ...field, displayName: 'other' },
    { ...field, sourceFieldId: 'fake' },
  ]) {
    expect(
      isSourceFreeDvtSubstraitDocumentV1({
        ...document,
        sidecar: { ...document.sidecar, fields: [replacement] },
      })
    ).toBe(false);
  }
  expect(
    isSourceFreeDvtSubstraitDocumentV1({
      ...document,
      semanticPlan: { ...document.semanticPlan, bytesBase64: 'AA==' },
    })
  ).toBe(false);
});

function withChangedRead(change: (read: ReadRel) => void): DvtSubstraitSemanticDocumentV1 {
  const document = literalDocument();
  const plan = decodeDvtSubstraitPlanV1(document);
  const root = plan.relations[0]!.relType;
  if (root.case !== 'root' || root.value.input?.relType.case !== 'read')
    throw new Error('Expected literal fixture');
  change(root.value.input.relType.value);
  const semanticPlan = encodeDvtSubstraitPlanV1(plan);
  return {
    ...document,
    semanticPlan,
    sidecar: { ...document.sidecar, semanticPlanSha256: semanticPlan.sha256 },
  };
}

it('requires exactly one row of values matching the declared schema', () => {
  const multiple = withChangedRead((read) => {
    if (read.readType.case !== 'virtualTable') throw new Error('Expected virtual table');
    read.readType.value.expressions.push(read.readType.value.expressions[0]!);
  });
  const mismatched = withChangedRead((read) => {
    const type = read.baseSchema!.struct!.types[0]!.kind;
    if (type.case !== 'i32') throw new Error('Expected integer');
    type.value.nullability = Type_Nullability.NULLABLE;
  });
  expect(isSourceFreeDvtSubstraitDocumentV1(multiple)).toBe(false);
  expect(isSourceFreeDvtSubstraitDocumentV1(mismatched)).toBe(false);
});
