import { describe, expect, it } from 'vitest';

import { parseStartRunTargetAdapter } from '../../../src/entrypoints/http/startRunRouteTargetAdapterParser.js';

function registryWith(...supported: Array<'mock' | 'temporal'>): {
  isSupported(value: string): value is 'mock' | 'temporal';
  listSupported(): ReadonlyArray<'mock' | 'temporal'>;
} {
  return {
    isSupported(value: string): value is 'mock' | 'temporal' {
      return supported.includes(value as 'mock' | 'temporal');
    },
    listSupported() {
      return [...supported];
    },
  };
}

describe('parseStartRunTargetAdapter', () => {
  it('accepts mock adapter', () => {
    expect(parseStartRunTargetAdapter('mock')).toEqual({ ok: true, value: 'mock' });
  });

  it('accepts temporal adapter', () => {
    expect(parseStartRunTargetAdapter('temporal')).toEqual({ ok: true, value: 'temporal' });
  });

  it('rejects adapter values with surrounding whitespace', () => {
    expect(parseStartRunTargetAdapter('  mock  ')).toEqual({
      ok: false,
      issue: { type: 'bad_request', reason: 'invalid_target_adapter', target: 'targetAdapter' },
    });
  });

  it('rejects unsupported adapter value', () => {
    expect(parseStartRunTargetAdapter('conductor')).toEqual({
      ok: false,
      issue: { type: 'bad_request', reason: 'invalid_target_adapter', target: 'targetAdapter' },
    });
  });

  it('rejects non-string adapter value', () => {
    expect(parseStartRunTargetAdapter({ adapter: 'mock' })).toEqual({
      ok: false,
      issue: { type: 'bad_request', reason: 'invalid_target_adapter', target: 'targetAdapter' },
    });
  });

  it('rejects adapter not present in runtime registry', () => {
    expect(parseStartRunTargetAdapter('temporal', registryWith('mock'))).toEqual({
      ok: false,
      issue: { type: 'bad_request', reason: 'invalid_target_adapter', target: 'targetAdapter' },
    });
  });
});
