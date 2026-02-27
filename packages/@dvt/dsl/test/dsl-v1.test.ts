import { describe, expect, it } from 'vitest';

import { evaluateDslV1, parseDslV1 } from '../src/index.js';

describe('parseDslV1', () => {
  it('parses equality with string literal', () => {
    const ast = parseDslV1("status = 'success'");
    expect(ast.left).toBe('status');
    expect(ast.right).toBe('success');
  });

  it('parses equality with number and boolean literals', () => {
    expect(parseDslV1('retries = 2').right).toBe(2);
    expect(parseDslV1('ok = true').right).toBe(true);
  });

  it('rejects unsupported logical operators', () => {
    expect(() => parseDslV1('a = 1 AND b = 2')).toThrow();
    expect(() => parseDslV1('a = 1 OR b = 2')).toThrow();
  });
});

describe('evaluateDslV1', () => {
  it('evaluates deterministically with strict type equality', () => {
    expect(evaluateDslV1(parseDslV1('retries = 0'), { retries: 0 })).toBe(true);
    expect(evaluateDslV1(parseDslV1('retries = 0'), { retries: '0' })).toBe(false);
    expect(evaluateDslV1(parseDslV1("status = 'ok'"), { status: 'ok' })).toBe(true);
  });
});
