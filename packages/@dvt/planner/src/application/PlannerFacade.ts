/**
 * Application-boundary service that implements the full IPlanner contract.
 *
 * ## Responsibilities
 *
 * The domain `Planner` is a pure, synchronous-style domain service that
 * accepts only pre-resolved graph inputs (manifest or nodes). This facade
 * handles concerns that live outside the pure domain:
 *
 * - `manifestRef` resolution: fetches and integrity-verifies the manifest
 *   payload via `IArtifactResolver` before handing off to the domain planner.
 * - `environment` context: accepted and stripped at this boundary (the domain
 *   planner does not model environment-dependent behaviour).
 * - Three-way one-active-source rule: rejects envelopes where more than one
 *   of `manifestRef`, `manifest`, or `nodes` is provided.
 *
 * ## Invariants
 *
 * - If `manifestRef` is present and no `IArtifactResolver` is configured,
 *   the call fails fast with `INVALID_INPUT` before any network I/O.
 * - Resolution errors (fetch failure, sha256 mismatch) propagate as thrown
 *   errors from the resolver — this facade does not wrap them.
 * - The inner domain `Planner` sees exactly one resolved graph source
 *   (`manifest` or `nodes`) with no application-boundary fields.
 *
 * @implements IPlanner
 * @see IArtifactResolver — the port used to resolve manifestRef payloads
 * @see Planner — the pure domain planner this facade delegates to
 */
import type {
  IPlanner,
  PlannerBuildResultV2,
  PlannerInputEnvelopeV2 as ContractEnvelope,
} from '@dvt/contracts';

import { PlannerError, PlannerErrorCode } from '../domain/errors.js';
import { Planner, type PlannerOptions } from '../domain/Planner.js';
import type { PlannerInputEnvelopeV2 as DomainEnvelope } from '../domain/types.js';
import type { IArtifactResolver } from '../ports/IArtifactResolver.js';

// ── Options ─────────────────────────────────────────────────────────────────

export interface PlannerFacadeOptions extends PlannerOptions {
  /**
   * Port used to resolve `manifestRef` graph sources.
   * Required when callers provide `input.manifestRef`; ignored otherwise.
   */
  resolver?: IArtifactResolver;
}

// ── PlannerFacade ────────────────────────────────────────────────────────────

export class PlannerFacade implements IPlanner {
  private readonly planner: Planner;
  private readonly resolver: IArtifactResolver | undefined;

  constructor(options?: PlannerFacadeOptions) {
    const { resolver, ...plannerOptions } = options ?? {};
    this.planner = new Planner(plannerOptions);
    this.resolver = resolver;
  }

  buildPlan(input: ContractEnvelope): Promise<PlannerBuildResultV2> {
    return this.toDomainInput(input).then((domainInput) => this.planner.buildPlan(domainInput));
  }

  private async toDomainInput(input: ContractEnvelope): Promise<DomainEnvelope> {
    const activeSources = [input.manifestRef, input.manifest, input.nodes].filter(
      (v) => v !== undefined
    ).length;

    if (activeSources > 1) {
      throw new PlannerError(
        PlannerErrorCode.INVALID_INPUT,
        'One-active-source rule violation: at most one of manifestRef, manifest, or nodes may be provided.'
      );
    }

    // Strip application-boundary fields before domain hand-off.
    // `environment` is accepted at this layer but not modelled by the domain planner.
    const { manifestRef, environment: _env, ...domainRest } = input;

    if (manifestRef !== undefined) {
      if (this.resolver === undefined) {
        throw new PlannerError(
          PlannerErrorCode.INVALID_INPUT,
          'manifestRef provided but no IArtifactResolver is configured.'
        );
      }
      const manifest = await this.resolver.resolveManifest(manifestRef);
      return { ...domainRest, manifest };
    }

    return domainRest;
  }
}
