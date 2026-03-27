import type { EngineRunRef, PlanRef, ResolvedRunContext } from '@dvt/contracts';

import type { IProviderAdapter } from '../adapters/IProviderAdapter.js';
import { AdapterNotRegisteredError } from '../contracts/errors.js';
import type { IRunStateStoreRead } from '../ports/IRunStateStore.js';
import type { IRunAccessPolicy } from '../security/RunAccessPolicy.js';
import { StartRunValidationPolicy } from '../services/startRun/StartRunValidationPolicy.js';

export interface StartRunAdmissionGuardDeps {
  policy: IRunAccessPolicy;
  stateStoreRead: IRunStateStoreRead;
  adapters: Map<EngineRunRef['provider'], IProviderAdapter>;
}

export class StartRunAdmissionGuard {
  private readonly validationPolicy: StartRunValidationPolicy;

  constructor(private readonly deps: StartRunAdmissionGuardDeps) {
    this.validationPolicy = new StartRunValidationPolicy({
      policy: deps.policy,
      stateStoreRead: deps.stateStoreRead,
    });
  }

  async assertStartRunAllowed(planRef: PlanRef, context: ResolvedRunContext): Promise<void> {
    await this.validationPolicy.validateStartRunPreconditions(planRef, context);
    this.deps.policy.checkRateLimit(context.tenantId);
  }

  resolveAdapter(planRef: PlanRef, context: ResolvedRunContext): IProviderAdapter {
    const adapter = this.deps.adapters.get(context.targetAdapter);
    if (adapter === undefined) throw new AdapterNotRegisteredError(context.targetAdapter);
    this.validationPolicy.validateCapabilitiesOrThrow(planRef, adapter);
    return adapter;
  }
}
