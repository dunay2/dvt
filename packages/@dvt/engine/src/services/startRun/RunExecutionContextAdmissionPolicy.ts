import type {
  PlanRef,
  ResolvedRunContext,
  RunExecutionContextRef,
  RunExecutionPolicy,
} from '@dvt/contracts';

import { RunExecutionContextRejectedError } from '../../contracts/errors.js';
import type { IRunExecutionContextResolver } from '../../ports/IRunExecutionContextResolver.js';

export class RunExecutionContextAdmissionPolicy {
  constructor(private readonly resolver?: IRunExecutionContextResolver) {}

  async assertAllowed(
    planRef: PlanRef,
    executionPolicy: RunExecutionPolicy,
    context: ResolvedRunContext
  ): Promise<void> {
    const ref = context.runExecutionContextRef;
    if (ref === undefined) return;

    if (this.resolver === undefined) {
      throw new RunExecutionContextRejectedError(
        'runExecutionContextRef provided but no runExecutionContextResolver is configured'
      );
    }

    this.assertRefAlignment(ref, planRef);
    const resolved = await this.resolver.resolve(ref);

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

    this.assertPluginCompatibilityFingerprint(
      executionPolicy,
      ref,
      resolved.pluginCompatibilityFingerprint
    );
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
