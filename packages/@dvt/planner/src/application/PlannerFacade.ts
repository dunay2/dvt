/**
 * Application-boundary service that implements the full IPlanner contract.
 *
 * ## Responsibilities
 *
 * The domain `Planner` is a pure, synchronous-style domain service that
 * accepts only pre-resolved graph inputs (graphSource or nodes). This facade
 * handles concerns that live outside the pure domain:
 *
 * - `manifestRef` resolution: fetches and integrity-verifies the graph-source
 *   payload via `IArtifactResolver` before handing off to the domain planner.
 * - `manifest` compatibility path: derives a typed graph source from the raw
 *   DBT payload before handing off to the domain planner.
 * - `environment` context: accepted and stripped at this boundary (the domain
 *   planner does not model environment-dependent behaviour).
 * - Four-way one-active-source rule: rejects envelopes where more than one
 *   of `manifestRef`, `graphSource`, `manifest`, or `nodes` is provided.
 *
 * ## Invariants
 *
 * - If `manifestRef` is present and no `IArtifactResolver` is configured,
 *   the call fails fast with `INVALID_INPUT` before any network I/O.
 * - Resolution errors (fetch failure, sha256 mismatch) propagate as thrown
 *   errors from the resolver — this facade does not wrap them.
 * - The inner domain `Planner` sees exactly one resolved graph source
 *   (`graphSource` or `nodes`) with no application-boundary fields.
 *
 * @implements IPlanner
 * @see IArtifactResolver — the port used to resolve manifestRef payloads
 * @see Planner — the pure domain planner this facade delegates to
 */
import {
  ContractValidationError,
  parsePlannerGraphSourceV1,
  parsePlannerInputEnvelopeV2,
} from '@dvt/contracts';

import { PlannerError, PlannerErrorCode } from '../domain/errors.js';
import { Planner, type PlannerOptions } from '../domain/Planner.js';
import type { PlannerInputEnvelopeV2 as DomainEnvelope } from '../domain/types.js';
import type { IArtifactResolver } from '../ports/IArtifactResolver.js';

import { derivePlannerGraphSourceFromManifest } from './derivePlannerGraphSourceFromManifest.js';
type DbtManifestRef = import('@dvt/contracts').DbtManifestRef;
type ExecutionPlanV2 = import('@dvt/contracts').ExecutionPlanV2;
type IPlanner = import('@dvt/contracts').IPlanner;
type PlannerBuildResultV2 = import('@dvt/contracts').PlannerBuildResultV2;
type PlannerGraphSourceV1 = import('@dvt/contracts').PlannerGraphSourceV1;
type ContractEnvelope = import('@dvt/contracts').PlannerInputEnvelopeV2;
type PlannerInputEnvelopeV2SchemaT = import('@dvt/contracts').PlannerInputEnvelopeV2SchemaT;
type PlannerSelection = import('@dvt/contracts').PlannerSelection;

// ── Options ─────────────────────────────────────────────────────────────────

export interface PlannerFacadeOptions extends PlannerOptions {
  /**
   * Port used to resolve `manifestRef` graph sources.
   * Required when callers provide `input.manifestRef`; ignored otherwise.
   */
  resolver?: IArtifactResolver;
  /** Maximum number of resolved manifestRef graph sources cached in-memory. */
  manifestRefCacheSize?: number;
}

// ── PlannerFacade ────────────────────────────────────────────────────────────

export class PlannerFacade implements IPlanner {
  private readonly planner: Planner;
  private readonly resolver: IArtifactResolver | undefined;
  private readonly manifestRefCacheSize: number;
  private readonly manifestRefCache = new Map<string, PlannerGraphSourceV1>();

  constructor(options?: PlannerFacadeOptions) {
    const { resolver, manifestRefCacheSize, ...plannerOptions } = options ?? {};
    this.planner = new Planner(plannerOptions);
    this.resolver = resolver;
    this.manifestRefCacheSize = this.normalizeManifestRefCacheSize(manifestRefCacheSize);
  }

  async buildPlan(input: ContractEnvelope): Promise<PlannerBuildResultV2> {
    const domainInput = await this.toDomainInput(this.validateEnvelope(input));
    return this.planner.buildPlan(domainInput);
  }

  private async toDomainInput(input: PlannerInputEnvelopeV2SchemaT): Promise<DomainEnvelope> {
    const domainRest = this.toDomainBaseInput(input);
    const manifestRef = input.manifestRef;
    const graphSource = input.graphSource;
    const manifest = input.manifest;

    if (manifestRef !== undefined) {
      if (this.resolver === undefined) {
        throw new PlannerError(
          PlannerErrorCode.INVALID_INPUT,
          'manifestRef provided but no IArtifactResolver is configured.'
        );
      }
      const resolvedGraphSource = await this.resolveManifestRefWithCache(
        this.toManifestRef(manifestRef)
      );
      return { ...domainRest, graphSource: resolvedGraphSource };
    }

    if (graphSource !== undefined) {
      return { ...domainRest, graphSource: this.validateGraphSource(graphSource) };
    }

    if (manifest !== undefined) {
      return { ...domainRest, graphSource: this.graphSourceFromManifest(manifest) };
    }

    return domainRest;
  }

  private toDomainBaseInput(
    input: PlannerInputEnvelopeV2SchemaT
  ): Omit<DomainEnvelope, 'graphSource'> {
    const domainInput: Omit<DomainEnvelope, 'graphSource'> = {
      selection: this.toPlannerSelection(input.selection),
    };

    if (input.nodes !== undefined) domainInput.nodes = input.nodes;
    if (input.policies !== undefined) domainInput.policies = input.policies;
    if (input.observability !== undefined) {
      domainInput.observability = this.toObservability(input.observability);
    }
    if (input.requestedBy !== undefined) domainInput.requestedBy = input.requestedBy;
    if (input.requestId !== undefined) domainInput.requestId = input.requestId;
    if (input.requestedAtIso !== undefined) domainInput.requestedAtIso = input.requestedAtIso;

    return domainInput;
  }

  private toManifestRef(
    manifestRef: NonNullable<PlannerInputEnvelopeV2SchemaT['manifestRef']>
  ): DbtManifestRef {
    const normalizedManifestRef: DbtManifestRef = {
      uri: manifestRef.uri,
      sha256: manifestRef.sha256,
    };

    if (manifestRef.artifactId !== undefined) {
      normalizedManifestRef.artifactId = manifestRef.artifactId;
    }

    return normalizedManifestRef;
  }

  private toPlannerSelection(
    selection: PlannerInputEnvelopeV2SchemaT['selection']
  ): PlannerSelection {
    const normalizedSelection: PlannerSelection = {
      selectedNodeIds: selection.selectedNodeIds,
    };

    if (selection.includeUpstream !== undefined) {
      normalizedSelection.includeUpstream = selection.includeUpstream;
    }
    if (selection.includeDownstream !== undefined) {
      normalizedSelection.includeDownstream = selection.includeDownstream;
    }

    return normalizedSelection;
  }

  private toObservability(
    observability: NonNullable<PlannerInputEnvelopeV2SchemaT['observability']>
  ): NonNullable<ExecutionPlanV2['observability']> {
    const normalizedObservability: NonNullable<ExecutionPlanV2['observability']> = {};

    for (const [key, value] of Object.entries(observability)) {
      if (key === 'tags' || key === 'extra' || value === undefined) continue;
      normalizedObservability[key] = value;
    }

    if (observability.tags !== undefined) normalizedObservability.tags = observability.tags;
    if (observability.extra !== undefined) normalizedObservability.extra = observability.extra;

    return normalizedObservability;
  }

  private validateEnvelope(input: ContractEnvelope): PlannerInputEnvelopeV2SchemaT {
    try {
      return parsePlannerInputEnvelopeV2(input);
    } catch (error) {
      const message =
        error instanceof ContractValidationError &&
        error.details.length > 0 &&
        error.details.every(
          (detail) => detail.path === 'graphSource' || detail.path.startsWith('graphSource.')
        )
          ? 'graphSource failed contract validation.'
          : 'Planner input failed contract validation.';

      throw new PlannerError(PlannerErrorCode.INVALID_INPUT, message, error);
    }
  }

  private validateGraphSource(graphSource: unknown): PlannerGraphSourceV1 {
    try {
      return parsePlannerGraphSourceV1(graphSource);
    } catch (error) {
      throw new PlannerError(
        PlannerErrorCode.INVALID_INPUT,
        'graphSource failed contract validation.',
        error
      );
    }
  }

  private graphSourceFromManifest(manifest: Record<string, unknown>): PlannerGraphSourceV1 {
    return derivePlannerGraphSourceFromManifest(manifest);
  }

  private normalizeManifestRefCacheSize(input: number | undefined): number {
    if (input === undefined) return 64;
    if (!Number.isInteger(input) || input < 0) {
      throw new Error('manifestRefCacheSize must be a non-negative integer.');
    }
    return input;
  }

  private async resolveManifestRefWithCache(ref: DbtManifestRef): Promise<PlannerGraphSourceV1> {
    if (this.manifestRefCacheSize === 0) {
      return this.validateGraphSource(await this.resolver!.resolveGraphSource(ref));
    }

    const cacheKey = `${ref.sha256}:${ref.uri}`;
    const cached = this.manifestRefCache.get(cacheKey);
    if (cached !== undefined) {
      this.manifestRefCache.delete(cacheKey);
      this.manifestRefCache.set(cacheKey, cached);
      return cached;
    }

    const resolved = this.validateGraphSource(await this.resolver!.resolveGraphSource(ref));
    if (this.manifestRefCache.size >= this.manifestRefCacheSize) {
      const oldestKey = this.manifestRefCache.keys().next().value;
      if (typeof oldestKey === 'string') this.manifestRefCache.delete(oldestKey);
    }
    this.manifestRefCache.set(cacheKey, resolved);
    return resolved;
  }
}
