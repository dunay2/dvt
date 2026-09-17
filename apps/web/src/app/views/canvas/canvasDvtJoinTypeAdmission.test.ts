import { describe, expect, it } from 'vitest';

import { resolveCanvasDvtJoinDataType } from './canvasDvtJoinTypeAdmission';

describe('Canvas DVT JOIN type admission', () => {
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
