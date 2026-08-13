/**
 * Owned concern: resolve stored executable plans from immutable plan refs.
 * This resolver validates integrity and metadata before returning a plan to
 * planner-backed runtime consumers.
 */
import { createHash } from 'node:crypto';

import type { IStoredPlanArtifactReader, StoredPlanArtifact } from '@dvt/artifacts';
import {
  type IStepTypeRegistry,
  type PlanRef,
  parsePlanRef,
  type RunExecutionPolicy,
  type ScopedPlanRef,
} from '@dvt/contracts';
import type { ExecutionPlan } from '@dvt/engine';

import { parseStoredExecutablePlan } from './storedExecutablePlan.js';

export const STORED_PLAN_MATERIALIZATION_MODE = {
  execution: 'execution',
  validation: 'validation',
} as const;

export type StoredPlanMaterializationMode =
  (typeof STORED_PLAN_MATERIALIZATION_MODE)[keyof typeof STORED_PLAN_MATERIALIZATION_MODE];

export type StoredPlanMaterializationFailureCode =
  'artifact_fetch' | 'integrity' | 'plan_parse' | 'plan_ref' | 'unsupported_scheme';

export type MaterializedStoredExecutablePlan = {
  readonly executionPolicy: RunExecutionPolicy;
  readonly plan: ExecutionPlan;
};

export class StoredPlanMaterializationError extends Error {
  public override readonly name = 'StoredPlanMaterializationError';

  public constructor(
    public readonly code: StoredPlanMaterializationFailureCode,
    message: string,
    cause?: unknown
  ) {
    super(message, cause === undefined ? undefined : { cause });
  }
}

export class StoredExecutablePlanResolver {
  public constructor(
    private readonly deps: {
      readonly fetcher: IStoredPlanArtifactReader;
      readonly stepTypeRegistry?: IStepTypeRegistry;
    }
  ) {}

  public async fetch(input: ScopedPlanRef): Promise<ExecutionPlan> {
    return (await this.materialize(input, STORED_PLAN_MATERIALIZATION_MODE.execution)).plan;
  }

  public async materialize(
    input: ScopedPlanRef,
    mode: StoredPlanMaterializationMode
  ): Promise<MaterializedStoredExecutablePlan> {
    const planRef = parseMaterializationPlanRef(input.planRef);
    assertSupportedPlanRefScheme(planRef);
    const artifact = await this.fetchArtifact(input, mode);
    validateStoredPlanIntegrity(artifact.bytes, planRef);
    const plan = parseMaterializedExecutablePlan(
      artifact.bytes,
      this.deps.stepTypeRegistry === undefined
        ? {}
        : {
            stepTypeRegistry: this.deps.stepTypeRegistry,
          }
    );
    validateStoredPlanMetadata(plan, planRef);
    return {
      executionPolicy: artifact.executionPolicy,
      plan,
    };
  }

  private async fetchArtifact(
    input: ScopedPlanRef,
    mode: StoredPlanMaterializationMode
  ): Promise<StoredPlanArtifact> {
    try {
      return mode === STORED_PLAN_MATERIALIZATION_MODE.validation
        ? await this.deps.fetcher.fetchStoredPlanArtifactForValidation(input)
        : await this.deps.fetcher.fetchStoredPlanArtifact(input);
    } catch (error) {
      throw new StoredPlanMaterializationError('artifact_fetch', toErrorMessage(error), error);
    }
  }
}

function parseMaterializationPlanRef(planRef: PlanRef): PlanRef {
  try {
    return parsePlanRef(planRef);
  } catch (error) {
    throw new StoredPlanMaterializationError('plan_ref', toErrorMessage(error), error);
  }
}

function assertSupportedPlanRefScheme(planRef: PlanRef): void {
  if (!planRef.uri.startsWith('dvt-plan://')) {
    throw new StoredPlanMaterializationError(
      'unsupported_scheme',
      `UNSUPPORTED_PLAN_REF_SCHEME: ${readUriScheme(planRef.uri)}`
    );
  }
}

function readUriScheme(uri: string): string {
  const separatorIndex = uri.indexOf(':');
  return separatorIndex < 0 ? 'unknown' : uri.slice(0, separatorIndex + 1);
}

function parseMaterializedExecutablePlan(
  bytes: Uint8Array,
  options: {
    readonly stepTypeRegistry?: IStepTypeRegistry;
  }
): ExecutionPlan {
  try {
    return parseStoredExecutablePlan(bytes, options);
  } catch (error) {
    throw new StoredPlanMaterializationError('plan_parse', toErrorMessage(error), error);
  }
}

function validateStoredPlanIntegrity(bytes: Uint8Array, planRef: PlanRef): void {
  const actualSha256 = createHash('sha256').update(bytes).digest('hex');
  if (actualSha256 !== planRef.sha256) {
    throw new StoredPlanMaterializationError(
      'integrity',
      `PLAN_INTEGRITY_VALIDATION_FAILED: expected=${planRef.sha256} actual=${actualSha256}`
    );
  }
}

function validateStoredPlanMetadata(plan: ExecutionPlan, planRef: PlanRef): void {
  if (plan.metadata.planId !== planRef.planId) {
    throw new StoredPlanMaterializationError('plan_ref', 'PLAN_REF_MISMATCH: planId');
  }
  if (plan.metadata.planVersion !== planRef.planVersion) {
    throw new StoredPlanMaterializationError('plan_ref', 'PLAN_REF_MISMATCH: planVersion');
  }
  if (plan.metadata.schemaVersion !== planRef.schemaVersion) {
    throw new StoredPlanMaterializationError('plan_ref', 'PLAN_REF_MISMATCH: schemaVersion');
  }
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return typeof error === 'string' ? error : 'Unknown stored plan materialization error';
}
