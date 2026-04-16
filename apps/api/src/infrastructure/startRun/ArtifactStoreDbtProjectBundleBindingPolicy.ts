import {
  ArtifactReadError,
  assertDbtProjectBundleBinding,
  type DbtProjectBundleArtifactStore,
} from '@dvt/artifacts';
import type { DbtProjectBundleRef } from '@dvt/contracts';
import {
  RunExecutionContextRejectedError,
  type IRunExecutionContextBindingPolicy,
} from '@dvt/engine';

export interface ArtifactStoreDbtProjectBundleBindingPolicyOptions {
  readonly bundleStore: DbtProjectBundleArtifactStore | undefined;
}

export class ArtifactStoreDbtProjectBundleBindingPolicy
  implements IRunExecutionContextBindingPolicy
{
  public constructor(
    private readonly options: ArtifactStoreDbtProjectBundleBindingPolicyOptions
  ) {}

  public assertDbtProjectBundleRefAllowed(
    projectBundleRef: DbtProjectBundleRef,
    expectedTenantId: string
  ): void {
    try {
      assertDbtProjectBundleBinding({
        projectBundleRef,
        expectedTenantId,
        bundleStore: this.options.bundleStore,
      });
    } catch (error) {
      if (error instanceof ArtifactReadError) {
        throw new RunExecutionContextRejectedError(error.message);
      }

      throw error;
    }
  }
}
