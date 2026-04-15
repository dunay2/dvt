import { type DbtProjectBundleRef } from '@dvt/contracts';

import { computeSha256 } from '../compiledCode/sha256.js';
import type {
  DbtProjectBundleReadOptions,
  IDbtProjectBundleReader,
} from '../ports/IDbtProjectBundleReader.js';

import { ArtifactReadError } from './ArtifactReadError.js';
import {
  assertDbtProjectBundleBinding,
  type DbtProjectBundleArtifactStore,
} from './assertDbtProjectBundleBinding.js';
import { readArtifactBytes, type ArtifactReadRuntimeOptions } from './readArtifactBytes.js';

const ARTIFACT_LABEL = 'dbt project bundle';

export interface ArtifactBackedDbtProjectBundleReaderOptions extends ArtifactReadRuntimeOptions {
  readonly bundleStore: DbtProjectBundleArtifactStore;
}

export class ArtifactBackedDbtProjectBundleReader implements IDbtProjectBundleReader {
  public constructor(private readonly options?: ArtifactBackedDbtProjectBundleReaderOptions) {}

  public async read(
    projectBundleRef: DbtProjectBundleRef,
    options: DbtProjectBundleReadOptions
  ): Promise<Uint8Array> {
    assertDbtProjectBundleBinding({
      projectBundleRef,
      expectedTenantId: options.expectedTenantId,
      bundleStore: this.options?.bundleStore,
    });
    const bytes = await readArtifactBytes(projectBundleRef.uri, {
      artifactLabel: ARTIFACT_LABEL,
      uriLabel: ARTIFACT_LABEL,
      ...this.options,
    });
    assertSha256(bytes, projectBundleRef.sha256);
    return bytes;
  }
}

function assertSha256(bytes: Uint8Array, expectedSha256: string): void {
  const actualSha256 = computeSha256(Buffer.from(bytes));
  if (actualSha256 !== expectedSha256) {
    throw new ArtifactReadError(
      'ARTIFACT_INTEGRITY_MISMATCH',
      'dbt project bundle artifact integrity mismatch'
    );
  }
}
