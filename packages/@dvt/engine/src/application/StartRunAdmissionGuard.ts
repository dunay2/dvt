/**
 * @ownedConcern Coordinate start-run admission orchestration across access,
 * adapter, capability, and run-execution-context policies.
 */
import type {
  EngineRunRef,
  ExecutionPlan,
  PlanRef,
  ResolvedRunContext,
  RunExecutionPolicy,
} from '@dvt/contracts';

import type { IProviderAdapter } from '../adapters/IProviderAdapter.js';
import { AdapterNotRegisteredError } from '../contracts/errors.js';
import type { IRunExecutionContextBindingPolicy } from '../ports/IRunExecutionContextBindingPolicy.js';
import type { IRunExecutionContextResolver } from '../ports/IRunExecutionContextResolver.js';
import type { IRunStateStoreRead } from '../ports/IRunStateStore.js';
import type { IRunAccessPolicy } from '../security/RunAccessPolicy.js';
import { RunExecutionContextAdmissionPolicy } from '../services/startRun/RunExecutionContextAdmissionPolicy.js';
import { StartRunValidationPolicy } from '../services/startRun/StartRunValidationPolicy.js';

export interface StartRunAdmissionGuardDeps {
  policy: IRunAccessPolicy;
  stateStoreRead: IRunStateStoreRead;
  adapters: Map<EngineRunRef['provider'], IProviderAdapter>;
  runExecutionContextResolver?: IRunExecutionContextResolver;
  runExecutionContextBindingPolicy?: IRunExecutionContextBindingPolicy;
}

export interface StartRunExecutionPolicyAdmission {
  plan: ExecutionPlan;
  planRef: PlanRef;
  executionPolicy: RunExecutionPolicy;
  context: ResolvedRunContext;
  adapter: IProviderAdapter;
}

export class StartRunAdmissionGuard {
  private readonly validationPolicy: StartRunValidationPolicy;
  private readonly runExecutionContextPolicy: RunExecutionContextAdmissionPolicy;

  constructor(private readonly deps: StartRunAdmissionGuardDeps) {
    this.validationPolicy = new StartRunValidationPolicy({
      policy: deps.policy,
      stateStoreRead: deps.stateStoreRead,
    });
    this.runExecutionContextPolicy = new RunExecutionContextAdmissionPolicy({
      ...(deps.runExecutionContextResolver === undefined
        ? {}
        : { resolver: deps.runExecutionContextResolver }),
      ...(deps.runExecutionContextBindingPolicy === undefined
        ? {}
        : { bindingPolicy: deps.runExecutionContextBindingPolicy }),
    });
  }

  async assertStartRunAllowed(planRef: PlanRef, context: ResolvedRunContext): Promise<void> {
    await this.validationPolicy.validateStartRunPreconditions(planRef, context);
    this.deps.policy.checkRateLimit(context.tenantId);
  }

  async assertExecutionPolicyAllowed(admission: StartRunExecutionPolicyAdmission): Promise<void> {
    const { plan, planRef, executionPolicy, context, adapter } = admission;

    this.validationPolicy.validateCapabilitiesOrThrow(executionPolicy, adapter);
    await this.runExecutionContextPolicy.assertAllowed({
      plan,
      planRef,
      executionPolicy,
      context,
    });
  }

  resolveAdapter(context: ResolvedRunContext): IProviderAdapter {
    const adapter = this.deps.adapters.get(context.targetAdapter);
    if (adapter === undefined) throw new AdapterNotRegisteredError(context.targetAdapter);
    return adapter;
  }
}
