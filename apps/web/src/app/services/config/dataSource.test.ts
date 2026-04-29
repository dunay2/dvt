import { describe, expect, it } from 'vitest';

import { resolveDataSource } from './dataSource';

describe('resolveDataSource', () => {
  it('defaults to api when VITE_DATA_SOURCE is missing', () => {
    expect(resolveDataSource()).toBe('api');
  });

  it('defaults to api when VITE_DATA_SOURCE is invalid', () => {
    expect(resolveDataSource('unsupported-mode')).toBe('api');
  });

  it('keeps explicit supported values', () => {
    expect(resolveDataSource('mock')).toBe('mock');
    expect(resolveDataSource('api')).toBe('api');
  });
});
