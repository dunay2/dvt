import { readArtifact } from '@dvt/artifacts';
import { describe, expect, it, vi } from 'vitest';

import { loadEnv } from '../../src/plugins/env.js';
import { createTemporalWorkerObjectFileReader } from '../../src/runtime/temporalWorkerObjectFileReader.js';

vi.mock('@dvt/artifacts', () => ({
  readArtifact: vi.fn(async () => ({ bytes: new Uint8Array() })),
}));

describe('createTemporalWorkerObjectFileReader', () => {
  it('uses the configured S3-compatible endpoint without exposing credentials to the plan', async () => {
    const reader = createTemporalWorkerObjectFileReader(
      loadEnv({
        NODE_ENV: 'test',
        DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
        TEMPORAL_ADDRESS: 'temporal:7233',
        TEMPORAL_NAMESPACE: 'default',
        TEMPORAL_TASK_QUEUE: 'dvt-temporal',
        DVT_OBJECT_FILE_S3_ENDPOINT: 'http://127.0.0.1:9000',
        DVT_OBJECT_FILE_S3_REGION: 'us-east-1',
        DVT_OBJECT_FILE_S3_FORCE_PATH_STYLE: 'true',
      })
    );

    await reader.read({ uri: 's3://objects/tenants/tenant-1/digest' });

    expect(readArtifact).toHaveBeenCalledWith(
      's3://objects/tenants/tenant-1/digest',
      expect.objectContaining({
        nodeEnv: 'test',
        s3Client: expect.objectContaining({}),
      })
    );
  });
});
