import {
  KNOWN_STEP_KINDS,
  parseDbtPluginContext,
  type DbtPluginContext,
  type ExecutionPlan,
  type PlanRef,
  type ResolvedRunContext,
  type RunExecutionContext,
  type RunExecutionContextRef,
  type RunExecutionPolicy,
} from '@dvt/contracts';

import { RunExecutionContextRejectedError } from '../../contracts/errors.js';
import type { IRunExecutionContextBindingPolicy } from '../../ports/IRunExecutionContextBindingPolicy.js';
import type { IRunExecutionContextResolver } from '../../ports/IRunExecutionContextResolver.js';
import { toErrorMessage } from '../../utils/errorUtils.js';

export class RunExecutionContextAdmissionPolicy {
  constructor(
    private readonly deps: {
      resolver?: IRunExecutionContextResolver;
      bindingPolicy?: IRunExecutionContextBindingPolicy;
    } = {}
  ) {}

  async assertAllowed(
    plan: ExecutionPlan,
    planRef: PlanRef,
    executionPolicy: RunExecutionPolicy,
    context: ResolvedRunContext
  ): Promise<void> {
    const requiresDbtPluginContext = plan.steps.some((step) => DBT_STEP_KINDS.has(step.kind));
    const ref = context.runExecutionContextRef;
    if (ref === undefined) {
      if (requiresDbtPluginContext) {
        throw new RunExecutionContextRejectedError(
          'runExecutionContextRef required for DBT-bearing plan'
        );
      }
      return;
    }

    if (this.deps.resolver === undefined) {
      throw new RunExecutionContextRejectedError(
        'runExecutionContextRef provided but no runExecutionContextResolver is configured'
      );
    }

    this.assertRefAlignment(ref, planRef);
    const resolved = await this.deps.resolver.resolve(ref);

    if (resolved.tenantId !== context.tenantId) {
      throw new RunExecutionContextRejectedError(
        `tenantId mismatch: context=${context.tenantId} runExecutionContext=${resolved.tenantId}`
      );
    }
    if (resolved.projectId !== context.projectId) {
      throw new RunExecutionContextRejectedError(
        `projectId mismatch: context=${context.projectId} runExecutionContext=${resolved.projectId}`
      );
    }
    if (resolved.environmentId !== context.environmentId) {
      throw new RunExecutionContextRejectedError(
        `environmentId mismatch: context=${context.environmentId} runExecutionContext=${resolved.environmentId}`
      );
    }
    if (resolved.planId !== planRef.planId) {
      throw new RunExecutionContextRejectedError(
        `runExecutionContext.planId mismatch: expected=${planRef.planId} actual=${resolved.planId}`
      );
    }
    if (resolved.planVersion !== planRef.planVersion) {
      throw new RunExecutionContextRejectedError(
        `runExecutionContext.planVersion mismatch: expected=${planRef.planVersion} actual=${resolved.planVersion}`
      );
    }
    if (resolved.planSha256 !== planRef.sha256) {
      throw new RunExecutionContextRejectedError(
        `runExecutionContext.planSha256 mismatch: expected=${planRef.sha256} actual=${resolved.planSha256}`
      );
    }
    if (resolved.targetAdapter !== context.targetAdapter) {
      throw new RunExecutionContextRejectedError(
        `targetAdapter mismatch: context=${context.targetAdapter} runExecutionContext=${resolved.targetAdapter}`
      );
    }
    if (requiresDbtPluginContext) {
      const pluginContext = assertDbtPluginContext(resolved, context.tenantId);
      await this.assertDbtProjectBundleBindingAllowed(pluginContext, context.tenantId);
    }

    this.assertPluginCompatibilityFingerprint(
      executionPolicy,
      ref,
      resolved.pluginCompatibilityFingerprint
    );
  }

  private async assertDbtProjectBundleBindingAllowed(
    pluginContext: DbtPluginContext,
    expectedTenantId: string
  ): Promise<void> {
    if (this.deps.bindingPolicy === undefined) {
      throw new RunExecutionContextRejectedError(
        'runExecutionContext DBT bundle binding policy is not configured'
      );
    }

    try {
      await this.deps.bindingPolicy.assertDbtProjectBundleRefAllowed(
        pluginContext.projectBundleRef,
        expectedTenantId
      );
    } catch (error) {
      if (error instanceof RunExecutionContextRejectedError) {
        throw error;
      }

      throw new RunExecutionContextRejectedError(toErrorMessage(error));
    }
  }

  private assertRefAlignment(ref: RunExecutionContextRef, planRef: PlanRef): void {
    if (ref.planId !== planRef.planId) {
      throw new RunExecutionContextRejectedError(
        `planId mismatch: contextRef=${ref.planId} planRef=${planRef.planId}`
      );
    }
    if (ref.planVersion !== planRef.planVersion) {
      throw new RunExecutionContextRejectedError(
        `planVersion mismatch: contextRef=${ref.planVersion} planRef=${planRef.planVersion}`
      );
    }
  }

  private assertPluginCompatibilityFingerprint(
    executionPolicy: RunExecutionPolicy,
    ref: RunExecutionContextRef,
    resolvedFingerprint: string | undefined
  ): void {
    const expected = executionPolicy.pluginCompatibilityFingerprint;
    if (expected === undefined) {
      return;
    }

    if (
      ref.pluginCompatibilityFingerprint !== undefined &&
      ref.pluginCompatibilityFingerprint !== expected
    ) {
      throw new RunExecutionContextRejectedError(
        `runExecutionContextRef.pluginCompatibilityFingerprint mismatch: expected=${expected} actual=${ref.pluginCompatibilityFingerprint}`
      );
    }

    if (resolvedFingerprint === undefined) {
      throw new RunExecutionContextRejectedError(
        'runExecutionContext.pluginCompatibilityFingerprint missing for compatibility-checked plan'
      );
    }

    if (resolvedFingerprint !== expected) {
      throw new RunExecutionContextRejectedError(
        `runExecutionContext.pluginCompatibilityFingerprint mismatch: expected=${expected} actual=${resolvedFingerprint}`
      );
    }
  }
}

function assertDbtPluginContext(
  resolved: RunExecutionContext,
  expectedTenantId: string
): DbtPluginContext {
  const pluginContextInput = resolved.pluginContexts['dbt'];
  if (pluginContextInput === undefined) {
    throw new RunExecutionContextRejectedError(
      'runExecutionContext.pluginContexts.dbt required for DBT-bearing plan'
    );
  }

  let pluginContext: ReturnType<typeof parseDbtPluginContext>;
  try {
    pluginContext = parseDbtPluginContext(pluginContextInput);
  } catch {
    throw new RunExecutionContextRejectedError(
      'runExecutionContext.pluginContexts.dbt invalid for DBT-bearing plan'
    );
  }

  const bundleTenantId = pluginContext.projectBundleRef.tenantId;
  if (bundleTenantId !== expectedTenantId) {
    throw new RunExecutionContextRejectedError(
      `runExecutionContext.pluginContexts.dbt.projectBundleRef.tenantId mismatch: expected=${expectedTenantId} actual=${bundleTenantId}`
    );
  }

  return pluginContext;
}

const DBT_STEP_KINDS = new Set<string>([
  KNOWN_STEP_KINDS.DBT_MODEL,
  KNOWN_STEP_KINDS.DBT_TEST,
  KNOWN_STEP_KINDS.DBT_SNAPSHOT,
]);
