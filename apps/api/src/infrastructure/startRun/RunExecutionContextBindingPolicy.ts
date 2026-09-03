/**
 * @ownedConcern Register artifact-backed DBT and PostgreSQL run-context admission requirements.
 */
import {
  ArtifactReadError,
  assertDbtProjectBundleBinding,
  type DbtProjectBundleArtifactStore,
} from '@dvt/artifacts';
import { parseDbtPluginContext, type DbtProjectBundleRef } from '@dvt/contracts';
import {
  RunExecutionContextRejectedError,
  type IRunExecutionContextBindingPolicy,
  type RunExecutionContextPluginRequirement,
} from '@dvt/engine';
import { DBT_PLUGIN_ID, TEMPORAL_DBT_PLUGIN_EXECUTABLE_STEP_KINDS } from '@dvt/temporal-dbt-plugin';

export interface RunExecutionContextBindingPolicyOptions {
  readonly bundleStore: DbtProjectBundleArtifactStore | undefined;
}

export class RunExecutionContextBindingPolicy implements IRunExecutionContextBindingPolicy {
  public readonly pluginRequirements: readonly RunExecutionContextPluginRequirement[];

  public constructor(private readonly options: RunExecutionContextBindingPolicyOptions) {
    this.pluginRequirements = [
      {
        pluginId: DBT_PLUGIN_ID,
        stepKinds: TEMPORAL_DBT_PLUGIN_EXECUTABLE_STEP_KINDS,
        assertPluginContextAllowed: ({ pluginContext, context }) => {
          const parsed = parseDbtPluginContext(pluginContext);
          const bundleTenantId = parsed.projectBundleRef.tenantId;
          if (bundleTenantId !== context.tenantId) {
            throw new RunExecutionContextRejectedError(
              `runExecutionContext.pluginContexts.dbt.projectBundleRef.tenantId mismatch: expected=${context.tenantId} actual=${bundleTenantId}`
            );
          }

          this.assertDbtProjectBundleBindingAllowed(parsed.projectBundleRef, context.tenantId);
        },
      },
    ];
  }

  private assertDbtProjectBundleBindingAllowed(
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
