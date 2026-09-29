import {
  AggregationPhase,
  AggregateFunction_AggregationInvocation,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { Type_Nullability } from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { describe, it, expect } from 'vitest';

import { projectSubstraitToPostgresSql } from '../src/index.js';

import { sumFixture } from './sumFixture.js';

describe('bounded SUM lowering', () => {
  it.each(['i64', 'fp64'] as const)('preserves %s output and immutable identity', async (kind) => {
    const { document } = sumFixture(kind);
    const before = globalThis.structuredClone(document);
    const result = await projectSubstraitToPostgresSql(document);
    expect(result.sql).toContain('sum(');
    expect(result.projection.outputs[0]).toMatchObject({ dataType: kind, nullable: true });
    expect(document).toEqual(before);
  });
  it.each(['options', 'distinct', 'phase', 'required', 'operand', 'filter'])(
    'rejects unsupported %s',
    async (failure) => {
      const { document, aggregate, refresh } = sumFixture('i64');
      const fn = aggregate.measures[0]!.measure!;
      if (failure === 'options') fn.options[0]!.preference = ['SILENT'];
      if (failure === 'distinct') fn.invocation = AggregateFunction_AggregationInvocation.DISTINCT;
      if (failure === 'phase') fn.phase = AggregationPhase.INITIAL_TO_INTERMEDIATE;
      if (failure === 'required' && fn.outputType?.kind.case === 'i64')
        fn.outputType.kind.value.nullability = Type_Nullability.REQUIRED;
      if (failure === 'operand') fn.arguments = [];
      if (failure === 'filter' && fn.arguments[0]?.argType.case === 'value')
        aggregate.measures[0]!.filter = fn.arguments[0].argType.value;
      refresh();
      await expect(projectSubstraitToPostgresSql(document)).rejects.toThrow();
    }
  );
});
