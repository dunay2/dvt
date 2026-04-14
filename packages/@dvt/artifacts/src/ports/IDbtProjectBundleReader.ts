/**
 * Read-side bundle port owned by the Artifacts bounded context.
 *
 * DBT runtime hosts use this port to materialize immutable project bundles
 * referenced from runExecutionContext plugin payloads.
 */
export interface IDbtProjectBundleReader {
  read(projectBundleRef: string): Promise<Uint8Array>;
}
