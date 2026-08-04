import { resolvePostgresObjectFileScopeSchema } from '@dvt/adapter-postgres';
import { OBJECT_FILE_POSTGRES_DBT_BRIDGE_CUSTOM_KEY } from '@dvt/contracts';
import type { DbtPluginExecutionInput } from '@dvt/temporal-dbt-plugin';
import { describe, expect, it } from 'vitest';

import { resolveObjectFilePostgresDbtCommandEnvironment } from '../../src/runtime/objectFilePostgresDbtCommandEnvironment.js';

const INPUT = {
  step: {
    stepId: 'model.orders',
    kind: 'DBT_MODEL',
    dependsOn: ['load-orders'],
  },
  runExecutionContext: {
    tenantId: 'tenant-a',
    projectId: 'project-a',
    environmentId: 'dev',
  },
} as unknown as DbtPluginExecutionInput;

describe('object-file PostgreSQL DBT command environment', () => {
  it('resolves the physical staging schema from authorized run ownership', () => {
    const input = {
      ...INPUT,
      step: {
        ...INPUT.step,
        stepTypeConfig: {
          custom: {
            [OBJECT_FILE_POSTGRES_DBT_BRIDGE_CUSTOM_KEY]: { version: 'v1' },
          },
        },
      },
    };

    expect(resolveObjectFilePostgresDbtCommandEnvironment(input)).toEqual({
      DVT_OBJECT_FILE_POSTGRES_STAGING_SCHEMA: resolvePostgresObjectFileScopeSchema('staging', {
        tenantId: 'tenant-a',
        projectId: 'project-a',
        environmentId: 'dev',
      }),
    });
  });

  it('keeps ordinary DBT steps unchanged and rejects a malformed bridge marker', () => {
    expect(resolveObjectFilePostgresDbtCommandEnvironment(INPUT)).toEqual({});
    expect(() =>
      resolveObjectFilePostgresDbtCommandEnvironment({
        ...INPUT,
        step: {
          ...INPUT.step,
          stepTypeConfig: {
            custom: {
              [OBJECT_FILE_POSTGRES_DBT_BRIDGE_CUSTOM_KEY]: { version: 'v2' },
            },
          },
        },
      })
    ).toThrow('DBT_OBJECT_FILE_POSTGRES_BRIDGE_INVALID');
  });
});
