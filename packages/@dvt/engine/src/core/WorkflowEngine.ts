/**
 * @file packages/@dvt/engine/src/core/WorkflowEngine.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @baseline ADR-0014: Run-Driven Adapter Model
 * @baseline ADR-0030: Pre-Dispatch Intent Log for startRun Crash Consistency
 * @decision WorkflowEngine is an application-facing facade that delegates
 *   startRun, recoverRun, canonical status reads, and control operations
 *   to explicit use-case services.
 * @consequence Runtime orchestration responsibilities are hosted outside the facade.
 */
import { parsePlanRef, parseRecoverRunCommand, parseRunContext } from '@dvt/contracts';
import type {
  CanonicalRunStatus,
  EngineRunRef,
  PlanRef,
  RunContext,
  SignalRequest,
} from '@dvt/contracts';

import type { IProviderAdapter } from '../adapters/IProviderAdapter.js';
import type {
  IWorkflowCancelRunUseCase,
  IWorkflowRecoverRunUseCase,
  IWorkflowRunStatusUseCase,
  IWorkflowSignalRunUseCase,
  IWorkflowStartRunUseCase,
} from '../application/WorkflowEngineUseCases.js';
import { AdapterNotRegisteredError } from '../contracts/errors.js';
import type { IWorkflowEngine } from '../ports/IWorkflowEngine.js';

export interface WorkflowEngineDeps {
  adapters: Map<EngineRunRef['provider'], IProviderAdapter>;
  requiredProviders?: EngineRunRef['provider'][];
  startRunUseCase: IWorkflowStartRunUseCase;
  recoverRunUseCase: IWorkflowRecoverRunUseCase;
  cancelRunUseCase: IWorkflowCancelRunUseCase;
  runStatusUseCase: IWorkflowRunStatusUseCase;
  signalRunUseCase: IWorkflowSignalRunUseCase;
}

export class WorkflowEngine implements IWorkflowEngine {
  private readonly startRunUseCase: IWorkflowStartRunUseCase;
  private readonly recoverRunUseCase: IWorkflowRecoverRunUseCase;
  private readonly cancelRunUseCase: IWorkflowCancelRunUseCase;
  private readonly runStatusUseCase: IWorkflowRunStatusUseCase;
  private readonly signalRunUseCase: IWorkflowSignalRunUseCase;

  constructor(private readonly deps: WorkflowEngineDeps) {
    this.validateDependencies();
    this.startRunUseCase = deps.startRunUseCase;
    this.recoverRunUseCase = deps.recoverRunUseCase;
    this.cancelRunUseCase = deps.cancelRunUseCase;
    this.runStatusUseCase = deps.runStatusUseCase;
    this.signalRunUseCase = deps.signalRunUseCase;
  }

  async startRun(planRef: PlanRef, context: RunContext): Promise<EngineRunRef> {
    const validatedPlanRef = normalizePlanRef(parsePlanRef(planRef));
    const validatedContext = normalizeRunContext(parseRunContext(context));
    return this.startRunUseCase.startRun(validatedPlanRef, validatedContext);
  }

  async recoverRun(
    sourceRunId: string,
    planRef: PlanRef,
    context: RunContext
  ): Promise<EngineRunRef> {
    const validated = parseRecoverRunCommand({
      sourceRunId,
      planRef,
      context,
    });
    const validatedPlanRef = normalizePlanRef(validated.planRef);
    const validatedContext = normalizeRunContext(validated.context);
    return this.recoverRunUseCase.recoverRun(
      validated.sourceRunId,
      validatedPlanRef,
      validatedContext
    );
  }

  async cancelRun(engineRunRef: EngineRunRef): Promise<void> {
    await this.cancelRunUseCase.cancelRun(engineRunRef);
  }

  async getRunStatus(engineRunRef: EngineRunRef): Promise<CanonicalRunStatus> {
    return this.runStatusUseCase.getRunStatus(engineRunRef);
  }

  async signal(engineRunRef: EngineRunRef, request: SignalRequest): Promise<void> {
    await this.signalRunUseCase.signal(engineRunRef, request);
  }

  private validateDependencies(): void {
    const requiredDeps: Array<[name: string, value: unknown]> = [
      ['adapters', this.deps.adapters],
      ['startRunUseCase', this.deps.startRunUseCase],
      ['recoverRunUseCase', this.deps.recoverRunUseCase],
      ['cancelRunUseCase', this.deps.cancelRunUseCase],
      ['runStatusUseCase', this.deps.runStatusUseCase],
      ['signalRunUseCase', this.deps.signalRunUseCase],
    ];

    for (const [name, value] of requiredDeps) {
      if (!value) throw new Error(`${name} is required`);
    }
    this.assertRequiredProvidersRegistered(this.deps.requiredProviders ?? []);
  }

  private assertRequiredProvidersRegistered(requiredProviders: EngineRunRef['provider'][]): void {
    for (const provider of requiredProviders) {
      if (this.deps.adapters.has(provider) === false) throw new AdapterNotRegisteredError(provider);
    }
  }
}

function normalizePlanRef(input: ReturnType<typeof parsePlanRef>): PlanRef {
  const planRef: PlanRef = {
    uri: input.uri,
    sha256: input.sha256,
    schemaVersion: input.schemaVersion,
    planId: input.planId,
    planVersion: input.planVersion,
  };
  if (input.sizeBytes !== undefined) planRef.sizeBytes = input.sizeBytes;
  if (input.expiresAt !== undefined) planRef.expiresAt = input.expiresAt;
  return planRef;
}

function normalizeRunContext(input: ReturnType<typeof parseRunContext>): RunContext {
  const out: RunContext = {
    tenantId: input.tenantId,
    projectId: input.projectId,
    environmentId: input.environmentId,
    runId: input.runId,
    targetAdapter: input.targetAdapter,
  };
  if (input.runExecutionContextRef !== undefined) {
    out.runExecutionContextRef = input.runExecutionContextRef;
  }
  return out;
}
