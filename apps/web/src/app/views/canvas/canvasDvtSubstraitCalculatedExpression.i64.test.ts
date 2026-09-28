import { create } from '@bufbuild/protobuf';
import { PlanSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { describe, expect, it } from 'vitest';

import {
  buildDvtSubstraitCalculatedExpression,
  inspectDvtSubstraitCalculatedExpression,
} from './canvasDvtSubstraitCalculatedExpression';

describe('calculated i64 literals', () => {
  it.each([-9_223_372_036_854_775_808n, -1n, 0n, 1n, 9_223_372_036_854_775_807n])(
    'round-trips signed i64 value %s',
    (value) => {
      const plan = create(PlanSchema);
      const expression = buildDvtSubstraitCalculatedExpression(plan, {
        kind: 'i64-literal',
        value,
      });
      expect(inspectDvtSubstraitCalculatedExpression(plan, expression)).toEqual({
        calculation: { kind: 'i64-literal', value },
        functionAnchors: [],
      });
    }
  );

  it.each([-9_223_372_036_854_775_809n, 9_223_372_036_854_775_808n])(
    'rejects out-of-range signed i64 value %s',
    (value) => {
      expect(() =>
        buildDvtSubstraitCalculatedExpression(create(PlanSchema), {
          kind: 'i64-literal',
          value,
        })
      ).toThrow('signed 64-bit range');
    }
  );
});
