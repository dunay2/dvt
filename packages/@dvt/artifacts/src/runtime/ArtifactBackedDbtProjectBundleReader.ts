import { type DbtProjectBundleRef } from '@dvt/contracts';

import type {
  DbtProjectBundleReadOptions,
  IDbtProjectBundleReader,
} from '../ports/IDbtProjectBundleReader.js';

import {
  assertDbtProjectBundleBinding,
  type DbtProjectBundleArtifactStore,
} from './assertDbtProjectBundleBinding.js';
import { type ArtifactReadRuntimeOptions } from './readArtifactBytes.js';
import { readVerifiedArtifactBytes } from './readVerifiedArtifactBytes.js';

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
    return readVerifiedArtifactBytes(
      {
        storageUri: projectBundleRef.uri,
        sha256: projectBundleRef.sha256,
        ...(projectBundleRef.sizeBytes === undefined
          ? {}
          : { sizeBytes: projectBundleRef.sizeBytes }),
      },
      {
        artifactLabel: ARTIFACT_LABEL,
        uriLabel: ARTIFACT_LABEL,
        ...this.options,
      }
    );
  }
}
