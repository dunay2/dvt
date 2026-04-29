import type { PlanRef, RunContext, RunExecutionPolicy } from '@dvt/contracts';

import type { IProviderAdapter } from '../../adapters/IProviderAdapter.js';
import {
  CapabilitiesNotSupportedError,
  InvalidRunIdError,
  RunAlreadyExistsError,
} from '../../contracts/errors.js';
import { assertSupportedPlanCompatibility } from '../../contracts/PlanCompatibilityPolicy.js';
import { assertSupportedPlanVersion } from '../../contracts/PlanVersionPolicy.js';
import type { IRunStateStoreRead } from '../../ports/IRunStateStore.js';
import type { IRunAccessPolicy } from '../../security/RunAccessPolicy.js';

export interface StartRunValidationPolicyDeps {
  policy: IRunAccessPolicy;
  stateStoreRead: IRunStateStoreRead;
}

export class StartRunValidationPolicy {
  constructor(private readonly deps: StartRunValidationPolicyDeps) {}

  async validateStartRunPreconditions(planRef: PlanRef, context: RunContext): Promise<void> {
    await this.deps.policy.assertTenantAccess(context.tenantId);
    this.deps.policy.validatePlanRef(planRef);
    assertSupportedPlanVersion(planRef.planVersion);
    assertSupportedPlanCompatibility({
      planVersion: planRef.planVersion,
      schemaVersion: planRef.schemaVersion,
    });
    validateRunIdOrThrow(context.runId);
    await this.ensureRunDoesNotExist(context.tenantId, context.runId);
  }

  validateCapabilitiesOrThrow(
    executionPolicy: RunExecutionPolicy,
    adapter: IProviderAdapter
  ): void {
    const required = executionPolicy.requiresCapabilities ?? [];
    if (required.length === 0) return;

    const adapterCaps = adapter.capabilities?.();
    if (adapterCaps === undefined) {
      throw new CapabilitiesNotSupportedError({
        capabilities: [...required],
        provider: adapter.provider,
      });
    }

    const supported = new Set(adapterCaps);
    const unsupported = required.filter((capability: string) => !supported.has(capability));
    if (unsupported.length > 0) {
      throw new CapabilitiesNotSupportedError({
        capabilities: unsupported,
        provider: adapter.provider,
      });
    }
  }

  private async ensureRunDoesNotExist(tenantId: string, runId: string): Promise<void> {
    const existing = await this.deps.stateStoreRead.getRunMetadataByRunId(tenantId, runId);
    if (existing) throw new RunAlreadyExistsError(runId);
  }
}

function validateRunIdOrThrow(runId: string): void {
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(runId)) throw new InvalidRunIdError(runId);
}
