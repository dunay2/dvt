import { PlanSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { clone } from '@bufbuild/protobuf';
import { describe, expect, it } from 'vitest';

import { resolveFunctionReference } from '../src/substrait-profile/functionReference.js';

import { functionFixture } from './substraitFunctionFixtures.js';

describe('canonical function reference integrity', () => {
  it('resolves the referenced identity without changing the plan', () => {
    const { plan } = functionFixture();
    const before = clone(PlanSchema, plan);
    expect(resolveFunctionReference(plan, 12)).toEqual({
      ok: true,
      value: {
        urnAnchor: 7,
        urn: 'extension:io.substrait:functions_aggregate_generic',
        name: 'count',
      },
    });
    expect(plan).toEqual(before);
  });

  it('rejects an ambiguous function anchor instead of choosing the first declaration', () => {
    const { plan } = functionFixture();
    plan.extensions.push(clone(PlanSchema, plan).extensions[0]!);
    expect(resolveFunctionReference(plan, 12)).toEqual({
      ok: false,
      reason: 'ambiguous-function-anchor',
    });
  });

  it('rejects an ambiguous URN anchor instead of choosing the first declaration', () => {
    const { plan } = functionFixture();
    plan.extensionUrns.push({ ...plan.extensionUrns[0]!, urn: 'extension:other' });
    expect(resolveFunctionReference(plan, 12)).toEqual({
      ok: false,
      reason: 'ambiguous-urn-anchor',
    });
  });

  it('distinguishes a missing function from a missing extension reference', () => {
    const { plan } = functionFixture();
    expect(resolveFunctionReference(plan, 99)).toEqual({
      ok: false,
      reason: 'missing-function-anchor',
    });
    plan.extensionUrns = [];
    expect(resolveFunctionReference(plan, 12)).toEqual({ ok: false, reason: 'missing-urn-anchor' });
  });

  it('uses referenced anchors, not declaration order or function names', () => {
    const { plan } = functionFixture();
    const sibling = clone(PlanSchema, plan).extensions[0]!;
    if (sibling.mappingType.case !== 'extensionFunction') throw new Error('Expected function');
    sibling.mappingType.value.functionAnchor = 99;
    sibling.mappingType.value.name = 'sum';
    plan.extensions.unshift(sibling);
    plan.extensionUrns.unshift({ ...plan.extensionUrns[0]!, extensionUrnAnchor: 33 });
    expect(resolveFunctionReference(plan, 12)).toMatchObject({
      ok: true,
      value: { urnAnchor: 7, name: 'count' },
    });
    expect(resolveFunctionReference(plan, 99)).toMatchObject({
      ok: true,
      value: { urnAnchor: 7, name: 'sum' },
    });
    plan.extensions.reverse();
    plan.extensionUrns.reverse();
    expect(resolveFunctionReference(plan, 12)).toMatchObject({
      ok: true,
      value: { urnAnchor: 7, name: 'count' },
    });
  });
});
