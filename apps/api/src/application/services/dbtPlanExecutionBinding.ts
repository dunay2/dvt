/** Owned concern: resolve the project revision and server target authorized by a DBT plan. */
import {
  RUN_REJECTIONS,
  type RunExecutionRejection,
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
  | (Readonly<{ ok: false }> & RunExecutionRejection);

export function resolveDbtPlanExecutionBinding(input: {
  readonly plan: ExecutionPlan;
  readonly targetAdapter: StartRunCommand['targetAdapter'];
  readonly executionTarget: DbtExecutionTargetIdentity | null;
}): DbtPlanExecutionBinding {
  if (input.executionTarget === null) {
    return {
      ok: false,
      ...RUN_REJECTIONS.dbtTargetRequired,
    };
  }
  if (input.executionTarget.provider !== input.targetAdapter) {
    return {
      ok: false,
      ...RUN_REJECTIONS.dbtAdapterMismatch,
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
    return { ok: false, ...RUN_REJECTIONS.dbtProvenanceInvalid };
  }
  if (parsedProvenance.data.kind !== PLAN_PREVIEW_PROVENANCE_KIND.dbtProjectFiles) {
    return {
      ok: false,
      ...RUN_REJECTIONS.dbtProvenanceNotProject,
    };
  }
  if (!sameExecutionTarget(parsedProvenance.data.executionTarget, input.executionTarget)) {
    return {
      ok: false,
      ...RUN_REJECTIONS.dbtTargetChanged,
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
