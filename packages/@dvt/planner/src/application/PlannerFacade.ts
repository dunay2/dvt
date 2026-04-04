/**
 * Application-boundary service that implements the full IPlanner contract.
 *
 * ## Responsibilities
 *
 * The domain `Planner` is a pure, synchronous-style domain service that
 * accepts only pre-resolved graph inputs (graphSource). This facade
 * handles concerns that live outside the pure domain:
 *
 * - `manifestRef` resolution: fetches and integrity-verifies the graph-source
 *   payload via `IArtifactResolver` before handing off to the domain planner.
 * - `environment` context: accepted and stripped at this boundary (the domain
 *   planner does not model environment-dependent behaviour).
 * - One-active-source rule: rejects envelopes where graph source inputs are ambiguous.
 *
 * ## Invariants
 *
 * - If `manifestRef` is present and no `IArtifactResolver` is configured,
 *   the call fails fast with `INVALID_INPUT` before any network I/O.
 * - Resolution errors (fetch failure, sha256 mismatch) propagate as thrown
 *   errors from the resolver — this facade does not wrap them.
 * - The inner domain `Planner` sees exactly one resolved graph source
 *   (`graphSource`) with no application-boundary fields.
 *
 * @implements IPlanner
 * @see IArtifactResolver — the port used to resolve manifestRef payloads
 * @see Planner — the pure domain planner this facade delegates to
 */
import {
  ContractValidationError,
  parseGenericGraphSourceV1,
  parsePlannerInputEnvelopeV1,
} from '@dvt/contracts';

import { PlannerError, PlannerErrorCode } from '../domain/errors.js';
import { Planner, type PlannerOptions } from '../domain/Planner.js';
import type { PlannerInputEnvelopeV1 as DomainEnvelope } from '../domain/types.js';
import type { IArtifactResolver } from '../ports/IArtifactResolver.js';

import { ManifestRefGraphSourceCache } from './ManifestRefGraphSourceCache.js';
import { PlannerEnvelopeMapper } from './PlannerEnvelopeMapper.js';
import type { StepKindResourceTypeMapper } from './StepKindResourceTypeMapper.js';

type IPlanner = import('@dvt/contracts').IPlanner;
type PlannerBuildResultV1 = import('@dvt/contracts').PlannerBuildResultV1;
type GenericGraphSourceV1 = import('@dvt/contracts').GenericGraphSourceV1SchemaT;
type ContractEnvelope = import('@dvt/contracts').PlannerInputEnvelopeV1;
type PlannerInputEnvelopeV1SchemaT = import('@dvt/contracts').PlannerInputEnvelopeV1SchemaT;

// ── Options ─────────────────────────────────────────────────────────────────

export interface PlannerFacadeOptions extends PlannerOptions {
  /**
   * Port used to resolve `manifestRef` graph sources.
   * Required when callers provide `input.manifestRef`; ignored otherwise.
   */
  resolver?: IArtifactResolver;
  /** Maximum number of resolved manifestRef graph sources cached in-memory. */
  manifestRefCacheSize?: number;
  /** Application-boundary mapper from external StepKind to internal resourceType. */
  stepKindToResourceType?: StepKindResourceTypeMapper;
}

// ── PlannerFacade ────────────────────────────────────────────────────────────

export class PlannerFacade implements IPlanner {
  private readonly planner: Planner;
  private readonly resolver: IArtifactResolver | undefined;
  private readonly envelopeMapper: PlannerEnvelopeMapper;
  private readonly manifestRefCache: ManifestRefGraphSourceCache | undefined;

  constructor(options?: PlannerFacadeOptions) {
    const { resolver, manifestRefCacheSize, stepKindToResourceType, ...plannerOptions } =
      options ?? {};
    this.planner = new Planner(plannerOptions);
    this.resolver = resolver;
    const normalizedManifestRefCacheSize = this.normalizeManifestRefCacheSize(manifestRefCacheSize);
    this.envelopeMapper = new PlannerEnvelopeMapper(stepKindToResourceType);
    if (resolver !== undefined) {
      this.manifestRefCache = new ManifestRefGraphSourceCache(
        resolver,
        normalizedManifestRefCacheSize,
        (graphSource) => this.validateGraphSource(graphSource)
      );
    }
  }

  async buildPlan(input: ContractEnvelope): Promise<PlannerBuildResultV1> {
    const domainInput = await this.toDomainInput(this.validateEnvelope(input));
    return this.planner.buildPlan(domainInput);
  }

  private async toDomainInput(input: PlannerInputEnvelopeV1SchemaT): Promise<DomainEnvelope> {
    const domainRest = this.envelopeMapper.toDomainBaseInput(input);
    const manifestRef = input.manifestRef;
    const graphSource = input.graphSource;

    if (manifestRef !== undefined) {
      if (this.resolver === undefined) {
        throw new PlannerError(
          PlannerErrorCode.INVALID_INPUT,
          'manifestRef provided but no IArtifactResolver is configured.'
        );
      }
      const resolvedGraphSource = await this.manifestRefCache!.resolve(
        this.envelopeMapper.toManifestRef(manifestRef)
      );
      return {
        ...domainRest,
        graphSource: this.envelopeMapper.toInternalGraphSource(resolvedGraphSource),
      };
    }

    if (graphSource !== undefined) {
      return {
        ...domainRest,
        graphSource: this.envelopeMapper.toInternalGraphSource(
          this.validateGraphSource(graphSource)
        ),
      };
    }

    throw new PlannerError(
      PlannerErrorCode.INVALID_INPUT,
      'No graph source provided after input normalization.'
    );
  }

  private validateEnvelope(input: ContractEnvelope): PlannerInputEnvelopeV1SchemaT {
    try {
      return parsePlannerInputEnvelopeV1(input);
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

  private validateGraphSource(graphSource: unknown): GenericGraphSourceV1 {
    try {
      return parseGenericGraphSourceV1(graphSource);
    } catch (error) {
      throw new PlannerError(
        PlannerErrorCode.INVALID_INPUT,
        'graphSource failed contract validation.',
        error
      );
    }
  }

  private normalizeManifestRefCacheSize(input: number | undefined): number {
    if (input === undefined) return 64;
    if (!Number.isInteger(input) || input < 0) {
      throw new Error('manifestRefCacheSize must be a non-negative integer.');
    }
    return input;
  }
}
