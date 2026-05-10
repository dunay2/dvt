import { describe, expect, it } from 'vitest';

import { resolveDataSource } from './dataSource';

describe('resolveDataSource', () => {
  it('defaults to api when VITE_DATA_SOURCE is missing', () => {
    expect(resolveDataSource()).toBe('api');
  });

  it('defaults to api when VITE_DATA_SOURCE is invalid', () => {
    expect(resolveDataSource('unsupported-mode')).toBe('api');
  });

  it('hard-cuts non-api data source values to api', () => {
    expect(resolveDataSource('mock')).toBe('api');
    expect(resolveDataSource('api')).toBe('api');
  });
});
