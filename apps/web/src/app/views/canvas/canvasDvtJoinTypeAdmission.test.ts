import { describe, expect, it } from 'vitest';

import {
  resolveCanvasDvtJoinDataType,
  resolveCanvasDvtJoinFieldPair,
} from './canvasDvtJoinTypeAdmission';

describe('Canvas DVT JOIN type admission', () => {
  it('prefers a later same-name compatible pair over the first compatible fields', () => {
    const left = [
      { name: 'client_id', joinDataType: 'string' as const },
      { name: 'order_id', joinDataType: 'i64' as const },
    ];
    const right = [
      { name: 'description', joinDataType: 'string' as const },
      { name: 'order_id', joinDataType: 'i64' as const },
    ];
    expect(resolveCanvasDvtJoinFieldPair(left, right)).toEqual({ left: left[1], right: right[1] });
  });

  it('falls back to a compatible pair across all fields, never to an incompatible name match', () => {
    const left = [
      { name: 'id', joinDataType: 'string' as const },
      { name: 'order_id', joinDataType: 'i64' as const },
    ];
    const right = [{ name: 'id', joinDataType: 'i64' as const }];
    expect(resolveCanvasDvtJoinFieldPair(left, right)).toEqual({ left: left[1], right: right[0] });
  });

  it('uses exact names and stable input order when several matches are available', () => {
    const left = [
      { name: 'ORDER_ID', joinDataType: 'string' as const },
      { name: 'order_id', joinDataType: 'string' as const, input: 'first' },
      { name: 'order_id', joinDataType: 'string' as const, input: 'second' },
    ];
    const right = [{ name: 'order_id', joinDataType: 'string' as const }];
    expect(resolveCanvasDvtJoinFieldPair(left, right)).toEqual({ left: left[1], right: right[0] });
  });

  it('returns no pair for missing, unknown or incompatible types', () => {
    const left = [{ name: 'id', joinDataType: 'i64' as const }];
    expect(resolveCanvasDvtJoinFieldPair(left, [])).toBeNull();
    expect(resolveCanvasDvtJoinFieldPair([], left)).toBeNull();
    expect(
      resolveCanvasDvtJoinFieldPair(left, [{ name: 'id', joinDataType: 'string' }])
    ).toBeNull();
    expect(
      resolveCanvasDvtJoinFieldPair(
        [{ name: 'id', joinDataType: null }],
        [{ name: 'id', joinDataType: null }]
      )
    ).toBeNull();
  });

  it.each([
    ['text', 'string'],
    ['character varying', 'string'],
    ['boolean', 'bool'],
    ['int8', 'i64'],
    ['double precision', 'fp64'],
    ['timestamp with time zone', 'precisionTimestampTz'],
  ] as const)('maps %s to the existing canonical %s type', (physical, canonical) => {
    expect(resolveCanvasDvtJoinDataType(physical)).toBe(canonical);
  });

  it.each(['integer', 'numeric', 'date', 'jsonb', 'unknown'])(
    'fails closed for the unbound %s type',
    (physical) => {
      expect(resolveCanvasDvtJoinDataType(physical)).toBeNull();
    }
  );
});
