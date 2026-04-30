/**
 * @ownedConcern Enforce generic run-execution-context admission without owning executor plugin semantics.
 */
import {
  type ExecutionPlan,
  type PlanRef,
  type ResolvedRunContext,
  type RunExecutionContext,
  type RunExecutionContextRef,
  type RunExecutionPolicy,
} from '@dvt/contracts';

import { RunExecutionContextRejectedError } from '../../contracts/errors.js';
import type {
  IRunExecutionContextBindingPolicy,
  RunExecutionContextPluginRequirement,
} from '../../ports/IRunExecutionContextBindingPolicy.js';
import type { IRunExecutionContextResolver } from '../../ports/IRunExecutionContextResolver.js';
import { toErrorMessage } from '../../utils/errorUtils.js';

export type RunExecutionContextAdmissionRequest = Readonly<{
  plan: ExecutionPlan;
  planRef: PlanRef;
  executionPolicy: RunExecutionPolicy;
  context: ResolvedRunContext;
}>;

export class RunExecutionContextAdmissionPolicy {
  constructor(
    private readonly deps: {
      resolver?: IRunExecutionContextResolver;
      bindingPolicy?: IRunExecutionContextBindingPolicy;
    } = {}
  ) {}

  async assertAllowed({
    plan,
    planRef,
    executionPolicy,
    context,
  }: RunExecutionContextAdmissionRequest): Promise<void> {
    const pluginRequirements = this.resolvePluginRequirements(plan);
    const ref = context.runExecutionContextRef;
    if (ref === undefined) {
      if (pluginRequirements.length > 0) {
        throw new RunExecutionContextRejectedError(
          `runExecutionContextRef required for plugin-bearing plan: ${pluginRequirements.map((requirement) => requirement.pluginId).join(',')}`
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
    await this.assertPluginContextsAllowed(pluginRequirements, resolved, context);

    this.assertPluginCompatibilityFingerprint(
      executionPolicy,
      ref,
      resolved.pluginCompatibilityFingerprint
    );
  }

  private resolvePluginRequirements(
    plan: ExecutionPlan
  ): readonly RunExecutionContextPluginRequirement[] {
    const stepKinds = new Set(plan.steps.map((step) => step.kind));
    const requirements = this.deps.bindingPolicy?.pluginRequirements ?? [];
    const selected = new Map<string, RunExecutionContextPluginRequirement>();

    for (const requirement of requirements) {
      if (requirement.stepKinds.some((kind) => stepKinds.has(kind))) {
        selected.set(
          `${requirement.pluginId}:${requirement.contextKey ?? requirement.pluginId}`,
          requirement
        );
      }
    }

    return [...selected.values()];
  }

  private async assertPluginContextsAllowed(
    requirements: readonly RunExecutionContextPluginRequirement[],
    runExecutionContext: RunExecutionContext,
    context: ResolvedRunContext
  ): Promise<void> {
    for (const requirement of requirements) {
      await this.assertPluginContextAllowed(requirement, runExecutionContext, context);
    }
  }

  private async assertPluginContextAllowed(
    requirement: RunExecutionContextPluginRequirement,
    runExecutionContext: RunExecutionContext,
    context: ResolvedRunContext
  ): Promise<void> {
    const contextKey = requirement.contextKey ?? requirement.pluginId;
    const pluginContext = runExecutionContext.pluginContexts[contextKey];
    if (pluginContext === undefined) {
      throw new RunExecutionContextRejectedError(
        `runExecutionContext.pluginContexts.${contextKey} required for plugin-bearing plan`
      );
    }

    try {
      await requirement.assertPluginContextAllowed({
        pluginContext,
        runExecutionContext,
        context,
      });
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
