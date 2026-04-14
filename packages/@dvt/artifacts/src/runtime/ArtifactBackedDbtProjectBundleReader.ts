import type { IDbtProjectBundleReader } from '../ports/IDbtProjectBundleReader.js';

import { readArtifactBytes, type ArtifactReadRuntimeOptions } from './readArtifactBytes.js';

const ARTIFACT_LABEL = 'dbt project bundle';

export type ArtifactBackedDbtProjectBundleReaderOptions = ArtifactReadRuntimeOptions;

export class ArtifactBackedDbtProjectBundleReader implements IDbtProjectBundleReader {
  public constructor(private readonly options?: ArtifactBackedDbtProjectBundleReaderOptions) {}

  public async read(projectBundleRef: string): Promise<Uint8Array> {
    return readArtifactBytes(projectBundleRef, {
      artifactLabel: ARTIFACT_LABEL,
      uriLabel: ARTIFACT_LABEL,
      ...this.options,
    });
  }
}
