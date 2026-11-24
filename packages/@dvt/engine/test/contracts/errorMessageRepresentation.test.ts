/** Owned concern: prove current Engine diagnostic representation for real thrown values. */
import { describe, expect, it } from 'vitest';

import { toErrorMessage } from '../../src/utils/errorUtils.js';

describe('Engine diagnostic error representation', () => {
  it.each([
    [new Error('provider unavailable'), 'provider unavailable'],
    ['failure', 'failure'],
    [42, '42'],
    [false, 'false'],
    [true, 'true'],
    [42n, '42'],
    [null, 'null'],
    [undefined, 'undefined'],
    [Symbol('failure-code'), 'failure-code'],
    [Symbol(), 'Symbol()'],
    [{ code: 'FAIL', retryable: false }, '{"code":"FAIL","retryable":false}'],
    [[1, 'error'], '[1,"error"]'],
  ])('represents the thrown value %s', (value, expected) => {
    expect(toErrorMessage(value)).toBe(expected);
  });

  it('keeps the standard object label when a circular diagnostic cannot be serialized', () => {
    const diagnostic: { code: string; cause?: unknown } = { code: 'circular' };
    diagnostic.cause = diagnostic;
    expect(toErrorMessage(diagnostic)).toBe('[object Object]');
  });

  it('keeps a diagnostic label when an actual object rejects JSON serialization', () => {
    const diagnostic = {
      toJSON(): never {
        throw new Error('cannot serialize diagnostic');
      },
    };
    expect(toErrorMessage(diagnostic)).toBe('[object Object]');
  });

  it('labels named and anonymous thrown functions without invoking them', () => {
    function namedDiagnostic(): never {
      throw new Error('must not execute');
    }
    expect(toErrorMessage(namedDiagnostic)).toBe('[function namedDiagnostic]');
    expect(
      toErrorMessage(() => {
        throw new Error('must not execute');
      })
    ).toBe('[function anonymous]');
  });
});
