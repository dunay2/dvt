import { describe, expect, it } from 'vitest';

import { extractBearerToken } from '../../../src/entrypoints/http/extractBearerToken.js';

describe('extractBearerToken', () => {
  it('extracts bearer tokens without regex backtracking exposure', () => {
    expect(extractBearerToken('Bearer    token-value  ')).toBe('token-value');
    expect(extractBearerToken('bearer\ttoken-value')).toBe('token-value');
  });

  it('rejects missing or malformed bearer credentials', () => {
    expect(extractBearerToken(undefined)).toBeUndefined();
    expect(extractBearerToken('Basic token-value')).toBeUndefined();
    expect(extractBearerToken('Bearer    ')).toBeUndefined();
  });
});
