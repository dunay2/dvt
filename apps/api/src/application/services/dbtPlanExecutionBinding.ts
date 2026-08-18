/** Owned concern: resolve the project revision and server target authorized by a DBT plan. */
import {
  PLAN_PREVIEW_PROVENANCE_KIND,
  PlanPreviewProvenanceSchema,
  type DbtExecutionTargetIdentity,
  type ExecutionPlan,
  type StartRunCommand,
} from '@dvt/contracts';

export type DbtPlanExecutionBinding =
  | Readonly<{
      ok: true;
      projectRoot: string;
      expectedContentSetSha256?: string;
      targetProfile: string;
      connectionRef: DbtExecutionTargetIdentity['connectionRef'];
      credentialRef: string;
    }>
  | Readonly<{ ok: false; reason: string }>;

export function resolveDbtPlanExecutionBinding(input: {
  readonly plan: ExecutionPlan;
  readonly targetAdapter: StartRunCommand['targetAdapter'];
  readonly executionTarget: DbtExecutionTargetIdentity | null;
}): DbtPlanExecutionBinding {
  if (input.executionTarget === null) {
    return {
      ok: false,
      reason: 'A server-owned DBT execution target is required before Run.',
    };
  }
  if (input.executionTarget.provider !== input.targetAdapter) {
    return {
      ok: false,
      reason: 'The selected runtime adapter does not match the server-owned DBT execution target.',
    };
  }

  const rawProvenance = input.plan.observability?.extra?.['planPreviewProvenance'];
  if (rawProvenance === undefined) {
    return {
      ok: true,
      projectRoot: '.',
      targetProfile: input.executionTarget.targetName,
      connectionRef: input.executionTarget.connectionRef,
      credentialRef: input.executionTarget.credentialRef,
    };
  }

  const parsedProvenance = PlanPreviewProvenanceSchema.safeParse(rawProvenance);
  if (!parsedProvenance.success) {
    return { ok: false, reason: 'The persisted plan provenance is invalid.' };
  }
  if (parsedProvenance.data.kind !== PLAN_PREVIEW_PROVENANCE_KIND.dbtProjectFiles) {
    return {
      ok: false,
      reason: 'The persisted plan provenance does not describe a DBT project.',
    };
  }
  if (!sameExecutionTarget(parsedProvenance.data.executionTarget, input.executionTarget)) {
    return {
      ok: false,
      reason: 'The configured DBT execution target changed after Preview. Run Preview again.',
    };
  }

  return {
    ok: true,
    projectRoot: parsedProvenance.data.projectRoot,
    expectedContentSetSha256: parsedProvenance.data.contentSetSha256,
    targetProfile: input.executionTarget.targetName,
    connectionRef: input.executionTarget.connectionRef,
    credentialRef: input.executionTarget.credentialRef,
  };
}

function sameExecutionTarget(
  left: DbtExecutionTargetIdentity,
  right: DbtExecutionTargetIdentity
): boolean {
  return (
    left.provider === right.provider &&
    left.adapter === right.adapter &&
    left.targetName === right.targetName &&
    left.connectionRef.schemaVersion === right.connectionRef.schemaVersion &&
    left.connectionRef.connectionId === right.connectionRef.connectionId &&
    left.connectionRef.provider === right.connectionRef.provider &&
    left.resolutionSource === right.resolutionSource &&
    left.credentialRef === right.credentialRef
  );
}
