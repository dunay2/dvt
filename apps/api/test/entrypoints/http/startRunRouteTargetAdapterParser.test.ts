import { describe, expect, it } from 'vitest';

import { parseStartRunTargetAdapter } from '../../../src/entrypoints/http/startRunRouteTargetAdapterParser.js';

describe('parseStartRunTargetAdapter', () => {
  it('accepts mock adapter', () => {
    expect(parseStartRunTargetAdapter('mock')).toEqual({ ok: true, value: 'mock' });
  });

  it('accepts temporal adapter', () => {
    expect(parseStartRunTargetAdapter('temporal')).toEqual({ ok: true, value: 'temporal' });
  });

  it('accepts valid trimmed adapter value', () => {
    expect(parseStartRunTargetAdapter('  mock  ')).toEqual({ ok: true, value: 'mock' });
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
});
