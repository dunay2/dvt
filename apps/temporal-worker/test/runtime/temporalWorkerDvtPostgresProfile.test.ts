import { join } from 'node:path';

import { KNOWN_STEP_KINDS } from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import { loadEnv } from '../../src/plugins/env.js';
import {
  createTemporalWorkerDvtPostgresProfile,
  resolveDvtPostgresArtifactReadOptions,
} from '../../src/runtime/temporalWorkerDvtPostgresProfile.js';

const BASE_ENV = {
  DATABASE_URL: 'postgresql://dvt:dvt@localhost:5432/dvt',
  TEMPORAL_ADDRESS: 'temporal:7233',
  TEMPORAL_NAMESPACE: 'default',
  TEMPORAL_TASK_QUEUE: 'dvt-temporal',
};

describe('createTemporalWorkerDvtPostgresProfile', () => {
  it('does not register the plugin when disabled', () => {
    expect(
      createTemporalWorkerDvtPostgresProfile(loadEnv(BASE_ENV), { resolve: vi.fn() }).pluginProfile
    ).toBeUndefined();
  });

  it('registers the governed workload when enabled with valid bindings', () => {
    const profile = createTemporalWorkerDvtPostgresProfile(
      loadEnv({
        ...BASE_ENV,
        DVT_TEMPORAL_DVT_POSTGRES_ENABLED: 'true',
        DVT_POSTGRES_CREDENTIAL_BINDINGS:
          '{"postgres:warehouse-a":"postgresql://dvt:dvt@localhost:5432/dvt"}',
      }),
      { resolve: vi.fn() }
    );

    expect([...profile.pluginProfile!.stepActivitiesByKind.keys()]).toEqual([
      KNOWN_STEP_KINDS.DVT_POSTGRES_OPERATIONAL_WORKLOAD,
    ]);
  });

  it('fails startup on malformed credential bindings', () => {
    expect(() =>
      createTemporalWorkerDvtPostgresProfile(
        loadEnv({
          ...BASE_ENV,
          DVT_TEMPORAL_DVT_POSTGRES_ENABLED: 'true',
          DVT_POSTGRES_CREDENTIAL_BINDINGS: '{"wrong":"not-postgres"}',
        }),
        { resolve: vi.fn() }
      )
    ).toThrow(/postgres:<alias>/);
  });
});

describe('resolveDvtPostgresArtifactReadOptions', () => {
  it('reads compiled SQL from the CAS root instead of the run-context store', () => {
    expect(
      resolveDvtPostgresArtifactReadOptions({
        NODE_ENV: 'production',
        DVT_CAS_FILE_ROOT: undefined,
        DVT_WORKSPACE_FILES_ROOT: '/shared/workspaces',
      })
    ).toEqual({
      nodeEnv: 'production',
      fileReadRoot: join('/shared/workspaces', '.dvt', 'cas'),
    });

    expect(
      resolveDvtPostgresArtifactReadOptions({
        NODE_ENV: 'production',
        DVT_CAS_FILE_ROOT: '/shared/cas',
        DVT_WORKSPACE_FILES_ROOT: '/shared/workspaces',
      })
    ).toEqual({
      nodeEnv: 'production',
      fileReadRoot: '/shared/cas',
    });
  });
});
