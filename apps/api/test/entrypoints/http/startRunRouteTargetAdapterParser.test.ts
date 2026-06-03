import { describe, expect, it } from 'vitest';

import { parseStartRunTargetAdapter } from '../../../src/entrypoints/http/startRunRouteTargetAdapterParser.js';

function registryWith(...supported: Array<'temporal'>): {
  isSupported(value: string): value is 'temporal';
  listSupported(): ReadonlyArray<'temporal'>;
} {
  return {
    isSupported(value: string): value is 'temporal' {
      return supported.includes(value as 'temporal');
    },
    listSupported() {
      return [...supported];
    },
  };
}

describe('parseStartRunTargetAdapter', () => {
  it('rejects mock adapter', () => {
    expect(parseStartRunTargetAdapter('mock', registryWith('temporal'))).toEqual({
      ok: false,
      issue: { type: 'bad_request', reason: 'invalid_target_adapter', target: 'targetAdapter' },
    });
  });

  it('accepts temporal adapter', () => {
    expect(parseStartRunTargetAdapter('temporal', registryWith('temporal'))).toEqual({
      ok: true,
      value: 'temporal',
    });
  });

  it('rejects adapter values with surrounding whitespace', () => {
    expect(parseStartRunTargetAdapter('  mock  ', registryWith('temporal'))).toEqual({
      ok: false,
      issue: { type: 'bad_request', reason: 'invalid_target_adapter', target: 'targetAdapter' },
    });
  });

  it('rejects unsupported adapter value', () => {
    expect(parseStartRunTargetAdapter('conductor', registryWith('temporal'))).toEqual({
      ok: false,
      issue: { type: 'bad_request', reason: 'invalid_target_adapter', target: 'targetAdapter' },
    });
  });

  it('rejects non-string adapter value', () => {
    expect(parseStartRunTargetAdapter({ adapter: 'mock' }, registryWith('temporal'))).toEqual({
      ok: false,
      issue: { type: 'bad_request', reason: 'invalid_target_adapter', target: 'targetAdapter' },
    });
  });

  it('rejects adapter not present in runtime registry', () => {
    expect(parseStartRunTargetAdapter('temporal', registryWith())).toEqual({
      ok: false,
      issue: { type: 'bad_request', reason: 'invalid_target_adapter', target: 'targetAdapter' },
    });
  });
});
