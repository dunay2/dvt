import { describe, expect, it, expectTypeOf } from 'vitest';

import {
  DVT_REJECTIONS,
  RUN_REJECTIONS,
  type OperationalRejection,
  type MessageDescriptor,
} from '../src/index.js';

describe('operational rejection definitions', () => {
  it('shares frozen, uniquely identified definitions instead of free-text failures', () => {
    const definitions = [...Object.values(DVT_REJECTIONS), ...Object.values(RUN_REJECTIONS)];
    expect(new Set(definitions.map(({ cause }) => cause)).size).toBe(definitions.length);
    for (const definition of definitions) {
      expect(definition.code).toBe('REJECTED');
      expect(definition.messageKey).toBe(definition.cause);
      expect(definition.reason).not.toBe(definition.messageKey);
      expect(definition.messageParams).toEqual({});
      expect(Object.isFrozen(definition)).toBe(true);
      expect(Object.isFrozen(definition.messageParams)).toBe(true);
    }
    expect(Object.isFrozen(DVT_REJECTIONS)).toBe(true);
    expect(Object.isFrozen(RUN_REJECTIONS)).toBe(true);
    expect(RUN_REJECTIONS.callerContextProvided.messageParams).toBe(
      DVT_REJECTIONS.runIntentRequired.messageParams
    );
  });

  it('keeps message metadata structural and rejects untyped rejection values', () => {
    expectTypeOf(RUN_REJECTIONS.callerContextProvided).toExtend<OperationalRejection>();
    expectTypeOf<string>().not.toExtend<OperationalRejection>();
    expectTypeOf<{ messageKey: 'example'; messageParams: { count: number } }>().toExtend<
      MessageDescriptor<'example', { count: number }>
    >();
    expectTypeOf<{ messageKey: 'example'; messageParams: { count: string } }>().not.toExtend<
      MessageDescriptor<'example', { count: number }>
    >();
  });
});
