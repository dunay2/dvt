import type { DbtProjectBundleRef } from '@dvt/contracts';

/**
 * Read-side bundle port owned by the Artifacts bounded context.
 *
 * DBT runtime hosts use this port to materialize immutable project bundles
 * referenced from runExecutionContext plugin payloads.
 */
export interface DbtProjectBundleReadOptions {
  readonly expectedTenantId: string;
}

export interface IDbtProjectBundleReader {
  read(
    projectBundleRef: DbtProjectBundleRef,
    options: DbtProjectBundleReadOptions
  ): Promise<Uint8Array>;
}
