import path from 'node:path';

import { locateFileContentAddressedArtifact } from '@dvt/artifacts';
import { describe, expect, it } from 'vitest';

import { resolveContentAddressedArtifactRuntime } from '../../src/modules/protectedRuntime/buildProtectedRuntimeStorage.js';
import { loadEnv } from '../../src/plugins/env.js';

describe('resolveContentAddressedArtifactRuntime', () => {
  it('uses a local CAS under the workspace root by default outside production', () => {
    const runtime = resolveContentAddressedArtifactRuntime(
      loadEnv({ NODE_ENV: 'development' }),
      path.resolve('workspace-root')
    );

    expect(runtime?.locateArtifact({ tenantId: 'tenant /a', sha256: 'a'.repeat(64) })).toBe(
      locateFileContentAddressedArtifact({
        rootPath: path.resolve('workspace-root', '.dvt', 'cas'),
        tenantId: 'tenant /a',
        sha256: 'a'.repeat(64),
      })
    );
  });

  it('uses the configured S3 CAS without mixing dbt bundle settings', () => {
    const runtime = resolveContentAddressedArtifactRuntime(
      loadEnv({
        DVT_CAS_BACKEND: 's3',
        DVT_CAS_S3_BUCKET: 'dvt-cas',
        DVT_DBT_BUNDLE_STORE_BACKEND: 'file',
        DVT_DBT_BUNDLE_FILE_ROOT: 'dbt-only',
      }),
      path.resolve('workspace-root')
    );

    expect(runtime?.locateArtifact({ tenantId: 'tenant /a', sha256: 'b'.repeat(64) })).toBe(
      `s3://dvt-cas/tenants/tenant%20%2Fa/${'b'.repeat(64)}`
    );
  });

  it('keeps production unavailable until a CAS backend is configured', () => {
    expect(
      resolveContentAddressedArtifactRuntime(
        loadEnv({ NODE_ENV: 'production' }),
        path.resolve('workspace-root')
      )
    ).toBeUndefined();
  });

  it('rejects an S3 backend without its bucket', () => {
    expect(() =>
      resolveContentAddressedArtifactRuntime(
        loadEnv({ DVT_CAS_BACKEND: 's3' }),
        path.resolve('workspace-root')
      )
    ).toThrow('DVT_CAS_S3_BUCKET');
  });
});
