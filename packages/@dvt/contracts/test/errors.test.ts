import { describe, expect, it } from 'vitest';

import { AuthorizationError } from '../src/errors';

describe('contracts: AuthorizationError', () => {
  it('exports class with name and code', () => {
    const e = new AuthorizationError('no');
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe('AuthorizationError');
    // code exists and equals AUTHZ_DENIED
    // @ts-expect-error runtime property check
    expect((e as any).code).toBe('AUTHZ_DENIED');
  });
});
