import type { DbtManifestLike, DbtManifestRef } from '@dvt/contracts';

/**
 * Port for resolving immutable manifest artifacts from external storage.
 *
 * The planner uses this port to fetch a manifest payload from an opaque
 * storage location identified by a DbtManifestRef. Callers that already
 * hold the manifest payload in memory should pass it directly via
 * PlannerInputEnvelopeV2.manifest rather than going through this port.
 *
 * Implementations are responsible for:
 * - Fetching the payload at ref.uri
 * - Verifying sha256 of the fetched payload against ref.sha256
 * - Returning the parsed manifest or throwing on fetch / integrity failure
 *
 * @see DbtManifestRef — the immutable reference type (sha256 required)
 * @see G-01.2 — artifact resolver port gap in Stage 1.1 gap register
 */
export interface IArtifactResolver {
  resolveManifest(ref: DbtManifestRef): Promise<DbtManifestLike>;
}
