import { PlanSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { clone } from '@bufbuild/protobuf';
import { expect, it } from 'vitest';

import { removeFunction } from '../src/relationalWrapperDraft.js';

import { functionFixture } from './substraitFunctionFixtures.js';

it('removes only the wrapper function anchor and retains a shared extension module', () => {
  const { plan } = functionFixture();
  const sibling = clone(PlanSchema, plan).extensions[0]!;
  if (sibling.mappingType.case !== 'extensionFunction') throw new Error('Expected function');
  sibling.mappingType.value.functionAnchor = 99;
  plan.extensions.push(sibling);
  removeFunction(plan, 12);
  expect(plan.extensions).toEqual([sibling]);
  expect(plan.extensionUrns).toHaveLength(1);
  removeFunction(plan, 99);
  expect(plan.extensions).toEqual([]);
  expect(plan.extensionUrns).toEqual([]);
});

it('does not mutate an ambiguous plan during wrapper reconstruction', () => {
  const { plan } = functionFixture();
  plan.extensions.push(clone(PlanSchema, plan).extensions[0]!);
  const before = clone(PlanSchema, plan);
  expect(() => removeFunction(plan, 12)).toThrow('ambiguous-function-anchor');
  expect(plan).toEqual(before);
});
