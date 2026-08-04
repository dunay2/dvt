import { describe, expect, it } from 'vitest';

import {
  OBJECT_FILE_POSTGRES_DBT_BRIDGE_CUSTOM_KEY,
  OBJECT_FILE_POSTGRES_DBT_STAGING_SCHEMA_ENV,
  resolveObjectFilePostgresDbtBridge,
} from '../src/index.js';

describe('object-file PostgreSQL DBT bridge contract', () => {
  it('resolves the bounded v1 bridge from DBT custom step config', () => {
    expect(
      resolveObjectFilePostgresDbtBridge({
        custom: {
          [OBJECT_FILE_POSTGRES_DBT_BRIDGE_CUSTOM_KEY]: { version: 'v1' },
        },
      })
    ).toEqual({ status: 'valid', bridge: { version: 'v1' } });
    expect(OBJECT_FILE_POSTGRES_DBT_STAGING_SCHEMA_ENV).toBe(
      'DVT_OBJECT_FILE_POSTGRES_STAGING_SCHEMA'
    );
  });

  it('distinguishes absent bridge metadata from malformed bridge metadata', () => {
    expect(resolveObjectFilePostgresDbtBridge({ custom: {} })).toEqual({ status: 'absent' });
    expect(
      resolveObjectFilePostgresDbtBridge({
        custom: {
          [OBJECT_FILE_POSTGRES_DBT_BRIDGE_CUSTOM_KEY]: { version: 'v2' },
        },
      })
    ).toEqual({ status: 'invalid' });
  });
});
