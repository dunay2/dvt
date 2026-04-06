import type { DbtManifestRef, GenericGraphSourceV1 } from '@dvt/contracts';

/**
 * Canonical ref-resolution port for planner graph sources.
 *
 * Ref payloads may originate from dbt manifest artifacts or other source
 * adapters, but the resolved boundary is always GenericGraphSourceV1.
 */
export interface IGraphSourceResolver {
  resolveGraphSource(ref: DbtManifestRef): Promise<GenericGraphSourceV1>;
}
