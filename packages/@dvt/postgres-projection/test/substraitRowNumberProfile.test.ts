import {
  ExpressionSchema,
  Expression_WindowFunction_BoundSchema,
  Expression_WindowFunction_BoundsType,
  SortFieldSchema,
  SortField_SortDirection,
  type Expression_WindowFunction,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { PlanSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { clone, create } from '@bufbuild/protobuf';
import { expect, it } from 'vitest';

import { inspectFunctionProfile } from '../src/substrait-profile/functions.js';
import { readCalculatedExpression } from '../src/substraitCalculatedExpressionReader.js';

import { functionFixture } from './substraitFunctionFixtures.js';

const frames: readonly [string, (fn: Expression_WindowFunction) => void][] = [
  [
    'frame kind',
    (fn) => {
      fn.boundsType = Expression_WindowFunction_BoundsType.ROWS;
    },
  ],
  [
    'lower bound',
    (fn) => {
      fn.lowerBound = create(Expression_WindowFunction_BoundSchema);
    },
  ],
  [
    'upper bound',
    (fn) => {
      fn.upperBound = create(Expression_WindowFunction_BoundSchema);
    },
  ],
];

it.each(frames)('rejects an unsupported %s in ROW_NUMBER', (_, mutate) => {
  const { plan, rowNumber } = functionFixture('row_number');
  mutate(rowNumber);
  expect(inspectFunctionProfile(plan, rowNumber)).toEqual({
    ok: false,
    reason: 'unsupported-window-frame',
  });
});

it('shares invocation admission with calculated columns while keeping their ordering constraint', () => {
  const { plan, rowNumber } = functionFixture('row_number');
  rowNumber.sorts = [
    create(SortFieldSchema, {
      expr: {
        rexType: {
          case: 'selection',
          value: {
            rootType: { case: 'rootReference', value: {} },
            referenceType: {
              case: 'directReference',
              value: { referenceType: { case: 'structField', value: { field: 0 } } },
            },
          },
        },
      },
      sortKind: { case: 'direction', value: SortField_SortDirection.ASC_NULLS_LAST },
    }),
  ];
  const expression = create(ExpressionSchema, {
    rexType: { case: 'windowFunction', value: rowNumber },
  });
  const sibling = clone(PlanSchema, plan).extensions[0]!;
  if (sibling.mappingType.case !== 'extensionFunction') throw new Error('Expected function');
  sibling.mappingType.value.functionAnchor = 99;
  sibling.mappingType.value.name = 'add';
  plan.extensions.unshift(sibling);
  expect(readCalculatedExpression(plan, expression)).toEqual({
    calculation: { kind: 'row-number', orderSourceOrdinal: 0 },
    functionAnchors: [12],
  });
  if (expression.rexType.case !== 'windowFunction') throw new Error('Expected window');
  expression.rexType.value.sorts[0]!.sortKind = {
    case: 'direction',
    value: SortField_SortDirection.DESC_NULLS_LAST,
  };
  expect(readCalculatedExpression(plan, expression)).toBeNull();
  expression.rexType.value.sorts[0]!.sortKind = {
    case: 'direction',
    value: SortField_SortDirection.ASC_NULLS_LAST,
  };
  expression.rexType.value.phase = 0;
  expect(readCalculatedExpression(plan, expression)).toBeNull();
});
