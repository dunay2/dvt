import { ACQUIRE_HTTP_JSON_ARTIFACT_STEP_KIND } from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import { loadEnv } from '../../src/plugins/env.js';
import { createTemporalWorkerHttpJsonProfile } from '../../src/runtime/temporalWorkerHttpJsonProfile.js';

vi.mock('@temporalio/activity', () => ({
  Context: { current: () => ({ cancellationSignal: undefined }) },
}));

const BASE = {
  DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
  TEMPORAL_ADDRESS: 'temporal:7233',
  TEMPORAL_NAMESPACE: 'default',
  TEMPORAL_TASK_QUEUE: 'dvt-temporal',
};

describe('createTemporalWorkerHttpJsonProfile', () => {
  it('omits all acquisition adapters while the independent profile is disabled', () => {
    const httpJsonClientFactory = vi.fn();
    const artifactStoreFactory = vi.fn();
    const profile = createTemporalWorkerHttpJsonProfile(loadEnv(BASE), {
      httpJsonClientFactory,
      contentAddressedArtifactStoreFactory: artifactStoreFactory,
    });

    expect(profile.pluginProfile).toBeUndefined();
    expect(httpJsonClientFactory).not.toHaveBeenCalled();
    expect(artifactStoreFactory).not.toHaveBeenCalled();
  });

  it('composes only the acquisition activity from opaque worker bindings', () => {
    const profile = createTemporalWorkerHttpJsonProfile(
      loadEnv({
        ...BASE,
        NODE_ENV: 'test',
        DVT_TEMPORAL_HTTP_JSON_ENABLED: 'true',
        DVT_HTTP_JSON_ENDPOINTS: JSON.stringify({
          'http-endpoint:orders': 'https://fixture.test/orders',
        }),
        DVT_HTTP_JSON_AUTH_TOKENS: JSON.stringify({ 'http-auth:orders': 'secret' }),
        DVT_HTTP_JSON_ARTIFACT_CREDENTIAL_REF: 'object-store:het2-artifacts',
        DVT_HTTP_JSON_ALLOW_LOOPBACK_FIXTURE: 'true',
      }),
      {
        httpJsonClientFactory: () => ({ acquire: vi.fn() }),
        contentAddressedArtifactStoreFactory: () => ({ publish: vi.fn() }),
      }
    );

    expect([...profile.pluginProfile!.stepActivitiesByKind.keys()]).toEqual([
      ACQUIRE_HTTP_JSON_ARTIFACT_STEP_KIND,
    ]);
  });
});
