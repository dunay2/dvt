import { Buffer } from 'node:buffer';

import {
  ExpressionSchema,
  Expression_LiteralSchema,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { PlanSchema, type Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { create, toBinary } from '@bufbuild/protobuf';
import { sha256Hex } from '@dvt/crypto';
import { describe, expect, it } from 'vitest';

import {
  DvtSubstraitSemanticDocumentV1Schema,
  decodeDvtSubstraitPlanV1,
  type DvtSubstraitSemanticDocumentV1,
} from '../src/substrait.js';

import { buildDvtSubstraitSemanticDocumentFixture } from './fixtures/dvtSubstraitSemanticDocument.js';

function withPlan(
  document: DvtSubstraitSemanticDocumentV1,
  plan: Plan
): DvtSubstraitSemanticDocumentV1 {
  const bytes = toBinary(PlanSchema, plan);
  const sha256 = sha256Hex(bytes);
  return {
    ...document,
    semanticPlan: {
      ...document.semanticPlan,
      bytesBase64: Buffer.from(bytes).toString('base64'),
      sha256,
    },
    sidecar: { ...document.sidecar, semanticPlanSha256: sha256 },
  };
}

function setFirstRootName(plan: Plan, name: string): void {
  const root = plan.relations[0]?.relType;
  if (root?.case !== 'root') throw new Error('Expected fixture RootRel.');
  root.value.names[0] = name;
}

function appendStringLiteral(plan: Plan, value: string): void {
  const root = plan.relations[0]?.relType;
  const input = root?.case === 'root' ? root.value.input?.relType : undefined;
  if (input?.case !== 'project') throw new Error('Expected fixture ProjectRel.');
  input.value.expressions.push(
    create(ExpressionSchema, {
      rexType: {
        case: 'literal',
        value: create(Expression_LiteralSchema, {
          literalType: { case: 'string', value },
        }),
      },
    })
  );
}

describe('DVT Substrait editable field policy', () => {
  it('preserves semantic names independently of the PostgreSQL byte budget', () => {
    const document = buildDvtSubstraitSemanticDocumentFixture();
    const acceptedPlan = decodeDvtSubstraitPlanV1(document);
    setFirstRootName(acceptedPlan, '😀'.repeat(256));
    expect(
      DvtSubstraitSemanticDocumentV1Schema.safeParse(withPlan(document, acceptedPlan)).success
    ).toBe(true);

    const rejectedPlan = decodeDvtSubstraitPlanV1(document);
    setFirstRootName(rejectedPlan, '😀'.repeat(257));
    expect(
      DvtSubstraitSemanticDocumentV1Schema.safeParse(withPlan(document, rejectedPlan)).success
    ).toBe(false);
  });

  it.each(['', ' name', 'name ', 'bad\u0000name'])(
    'rejects invalid names without rewriting the document',
    (name) => {
      const document = buildDvtSubstraitSemanticDocumentFixture();
      const plan = decodeDvtSubstraitPlanV1(document);
      setFirstRootName(plan, name);
      const changed = withPlan(document, plan);
      const before = globalThis.structuredClone(changed);
      expect(DvtSubstraitSemanticDocumentV1Schema.safeParse(changed).success).toBe(false);
      expect(changed).toEqual(before);
    }
  );

  it('enforces string literals at the UTF-8 byte boundary', () => {
    const document = buildDvtSubstraitSemanticDocumentFixture();
    const acceptedPlan = decodeDvtSubstraitPlanV1(document);
    appendStringLiteral(acceptedPlan, 'a'.repeat(4092) + '😀');
    expect(
      DvtSubstraitSemanticDocumentV1Schema.safeParse(withPlan(document, acceptedPlan)).success
    ).toBe(true);

    const rejectedPlan = decodeDvtSubstraitPlanV1(document);
    appendStringLiteral(rejectedPlan, 'a'.repeat(4093) + '😀');
    expect(
      DvtSubstraitSemanticDocumentV1Schema.safeParse(withPlan(document, rejectedPlan)).success
    ).toBe(false);
  });
});
