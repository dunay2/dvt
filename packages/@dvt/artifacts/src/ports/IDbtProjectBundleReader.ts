import type { DbtProjectBundleRef } from '@dvt/contracts';

/**
 * Read-side bundle port owned by the Artifacts bounded context.
 *
 * DBT runtime hosts use this port to materialize immutable project bundles
 * referenced from runExecutionContext plugin payloads.
 */
export interface IDbtProjectBundleReader {
  read(projectBundleRef: DbtProjectBundleRef): Promise<Uint8Array>;
}
