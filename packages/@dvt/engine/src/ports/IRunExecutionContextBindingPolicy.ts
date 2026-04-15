import type { DbtProjectBundleRef } from '@dvt/contracts';

/**
 * Optional admission-time binding policy for execution-context-owned artifacts.
 *
 * This lets product ingress reject runs whose plugin-owned artifact locators do
 * not align with the configured artifact store before the run is queued.
 */
export interface IRunExecutionContextBindingPolicy {
  assertDbtProjectBundleRefAllowed(
    projectBundleRef: DbtProjectBundleRef,
    expectedTenantId: string
  ): Promise<void> | void;
}
