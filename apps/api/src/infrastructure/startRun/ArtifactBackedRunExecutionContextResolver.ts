import {
  ArtifactBackedRunExecutionContextReader,
  ArtifactReadError,
  type ArtifactBackedRunExecutionContextReaderOptions,
} from '@dvt/artifacts';
import {
  ArtifactStoreError,
  type RunExecutionContext,
  type RunExecutionContextRef,
} from '@dvt/contracts';
import { RunExecutionContextRejectedError, type IRunExecutionContextResolver } from '@dvt/engine';

export type ArtifactBackedRunExecutionContextResolverOptions =
  ArtifactBackedRunExecutionContextReaderOptions;

export class ArtifactBackedRunExecutionContextResolver implements IRunExecutionContextResolver {
  private readonly reader: ArtifactBackedRunExecutionContextReader;

  public constructor(options?: ArtifactBackedRunExecutionContextResolverOptions) {
    this.reader = new ArtifactBackedRunExecutionContextReader(options);
  }

  public async resolve(ref: RunExecutionContextRef): Promise<RunExecutionContext> {
    try {
      return await this.reader.resolve(ref);
    } catch (error) {
      if (error instanceof ArtifactReadError) {
        throw new RunExecutionContextRejectedError(error.message);
      }

      if (error instanceof ArtifactStoreError && error.code === 'ARTIFACT_INTEGRITY_ERROR') {
        throw new RunExecutionContextRejectedError(
          'runExecutionContext artifact integrity mismatch'
        );
      }

      throw error;
    }
  }
}
