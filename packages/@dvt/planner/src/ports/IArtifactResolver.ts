import type { DbtManifestRef, GenericGraphSourceV1 } from '@dvt/contracts';

/**
 * Port for resolving immutable manifest artifacts from external storage.
 *
 * The planner uses this port to resolve a typed graph source from an opaque
 * storage location identified by a DbtManifestRef. Callers that already hold
 * a normalized graph in memory should pass it directly via
 * PlannerInputEnvelopeV1.graphSource rather than going through this port.
 *
 * Implementations are responsible for:
 * - Fetching the payload at ref.uri
 * - Verifying sha256 of the fetched payload against ref.sha256
 * - Returning a normalized graph source or throwing on fetch / integrity failure
 *
 * @see DbtManifestRef — the immutable reference type (sha256 required)
 * @see G-01.2 — artifact resolver port gap in Stage 1.1 gap register
 */
export interface IArtifactResolver {
  resolveGraphSource(ref: DbtManifestRef): Promise<GenericGraphSourceV1>;
}
