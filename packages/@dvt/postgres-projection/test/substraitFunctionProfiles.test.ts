import {
  FunctionArgumentSchema,
  FunctionOptionSchema,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { PlanSchema, type Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { clone, create } from '@bufbuild/protobuf';
import { describe, expect, it } from 'vitest';

import { countProfile } from '../src/substrait-profile/count.js';
import { inspectFunctionProfile } from '../src/substrait-profile/functions.js';
import type { ProfileFunction } from '../src/substrait-profile/invocation.js';
import { rowNumberProfile } from '../src/substrait-profile/rowNumber.js';

import { functionFixture } from './substraitFunctionFixtures.js';

it('recognizes COUNT when another function is declared in the same extension module', () => {
  const { plan, count } = functionFixture();
  const sibling = clone(PlanSchema, plan).extensions[0]!;
  if (sibling.mappingType.case !== 'extensionFunction') throw new Error('Expected function');
  sibling.mappingType.value.functionAnchor = 99;
  sibling.mappingType.value.name = 'sum';
  plan.extensions.unshift(sibling);
  expect(inspectFunctionProfile(plan, count)).toEqual({ ok: true, value: countProfile });
});

describe.each(['count', 'row_number'] as const)('%s bounded invocation', (name) => {
  function fixture(): { plan: Plan; fn: ProfileFunction } {
    const source = functionFixture(name);
    return { plan: source.plan, fn: name === 'count' ? source.count : source.rowNumber };
  }

  it('admits the canonical invocation without modifying its protobuf', () => {
    const { plan, fn } = fixture();
    const before = globalThis.structuredClone({ plan, fn });
    expect(inspectFunctionProfile(plan, fn)).toEqual({
      ok: true,
      value: name === 'count' ? countProfile : rowNumberProfile,
    });
    expect({ plan, fn }).toEqual(before);
  });

  const mutations: readonly [string, (fn: ProfileFunction) => void][] = [
    [
      'unsupported-function-arguments',
      (fn) => {
        fn.arguments.push(create(FunctionArgumentSchema));
      },
    ],
    [
      'unsupported-function-options',
      (fn) => {
        fn.options.push(create(FunctionOptionSchema));
      },
    ],
    [
      'unsupported-aggregation-phase',
      (fn) => {
        fn.phase = 0;
      },
    ],
    [
      'unsupported-aggregation-invocation',
      (fn) => {
        fn.invocation = 0;
      },
    ],
    [
      'unsupported-function-result',
      (fn) => {
        fn.outputType = undefined;
      },
    ],
    [
      'unsupported-function-result',
      (fn) => {
        if (fn.outputType?.kind.case === 'i64') fn.outputType.kind.value.typeVariationReference = 1;
      },
    ],
    [
      'unsupported-function-result',
      (fn) => {
        if (fn.outputType?.kind.case === 'i64') fn.outputType.kind.value.nullability = 0;
      },
    ],
  ];
  it.each(mutations)('rejects %s independently of SQL', (reason, mutate) => {
    const { plan, fn } = fixture();
    mutate(fn);
    expect(inspectFunctionProfile(plan, fn)).toEqual({ ok: false, reason });
  });

  it('does not confuse a different function or function kind with the admitted capability', () => {
    const { plan, count, rowNumber } = functionFixture(name);
    expect(inspectFunctionProfile(plan, name === 'count' ? rowNumber : count)).toEqual({
      ok: false,
      reason: 'unsupported-function-identity',
    });
    const declaration = plan.extensions[0]!.mappingType;
    if (declaration.case !== 'extensionFunction') throw new Error('Expected function');
    declaration.value.name = 'sum';
    expect(inspectFunctionProfile(plan, name === 'count' ? count : rowNumber)).toEqual({
      ok: false,
      reason: 'unsupported-function-identity',
    });
  });
});
