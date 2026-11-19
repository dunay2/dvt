/**
 * Owned concern: bind the exact public dbt variables admitted by Preview to the stored plan.
 * The planner hashes only opaque digests. Run verifies the artifact against the same scope,
 * revision, selection and destination before reusing the native compiler's arguments.
 */
import {
  DbtVariablesJsonSchema,
  mergeRunParameterDefinitions,
  projectDbtRunVariables,
  resolveRunParameters,
  type DbtProjectFilesProvenance,
  type DbtProjectGraphProjection,
  type ExecutionPlan,
  type GenericGraphSourceV1,
  type PlanOwnership,
  type RunParameterOverride,
} from '@dvt/contracts';
import { jcsCanonicalize, sha256HexUtf8 } from '@dvt/crypto';

function invocationDigests(
  scope: PlanOwnership,
  provenance: DbtProjectFilesProvenance,
  dbtVariablesJson: string
): { parameterSetSha256: string; dbtInvocationSha256: string } {
  const parameterSetSha256 = sha256HexUtf8(dbtVariablesJson);
  return {
    parameterSetSha256,
    dbtInvocationSha256: sha256HexUtf8(jcsCanonicalize({ scope, provenance, parameterSetSha256 })),
  };
}

export function resolveDbtCompileVariables(
  resources: readonly DbtProjectGraphProjection['nodes'][number][],
  overrides: readonly RunParameterOverride[],
  environmentId: string
): string | undefined {
  const definitions = mergeRunParameterDefinitions(
    resources.map((node) => node.runParameters ?? [])
  );
  const resolved = resolveRunParameters(definitions, overrides, environmentId);
  return definitions.length === 0
    ? undefined
    : DbtVariablesJsonSchema.parse(jcsCanonicalize(projectDbtRunVariables(resolved)));
}

export function bindDbtInvocationGraph(
  graph: GenericGraphSourceV1,
  scope: PlanOwnership,
  provenance: DbtProjectFilesProvenance,
  dbtVariablesJson: string
): GenericGraphSourceV1 {
  const digests = invocationDigests(scope, provenance, dbtVariablesJson);
  return {
    ...graph,
    nodes: graph.nodes.map((node) => ({
      ...node,
      stepTypeConfig: { ...node.stepTypeConfig, ...digests },
    })),
  };
}

export function bindDbtInvocationPlan(
  plan: ExecutionPlan,
  provenance: DbtProjectFilesProvenance,
  dbtVariablesJson: string
): ExecutionPlan {
  return {
    ...plan,
    observability: {
      ...plan.observability,
      extra: {
        ...plan.observability?.extra,
        planPreviewProvenance: { ...provenance, dbtVariablesJson },
      },
    },
  };
}

function hasInvocationDigests(config: Record<string, unknown> | undefined): boolean {
  return (
    config !== undefined && ('parameterSetSha256' in config || 'dbtInvocationSha256' in config)
  );
}

export function hasSubmittedDbtInvocation(input: {
  graphSource?: GenericGraphSourceV1;
  observability?: ExecutionPlan['observability'];
}): boolean {
  const provenance = input.observability?.extra?.['planPreviewProvenance'];
  return (
    (provenance != null && typeof provenance === 'object' && 'dbtVariablesJson' in provenance) ||
    input.graphSource?.nodes.some((node) => hasInvocationDigests(node.stepTypeConfig)) === true
  );
}

export function readDbtInvocationVariables(
  plan: ExecutionPlan,
  provenance?: DbtProjectFilesProvenance,
  dbtVariablesJson?: string
): { ok: true; dbtVariablesJson?: string } | { ok: false } {
  if (
    dbtVariablesJson === undefined &&
    !plan.steps.some((step) => hasInvocationDigests(step.stepTypeConfig))
  ) {
    return { ok: true };
  }
  const scope = plan.metadata.ownership;
  if (dbtVariablesJson === undefined || !scope || !provenance || plan.steps.length === 0)
    return { ok: false };
  const { parameterSetSha256, dbtInvocationSha256 } = invocationDigests(
    scope,
    provenance,
    dbtVariablesJson
  );
  if (
    !plan.steps.every(
      ({ stepTypeConfig }) =>
        stepTypeConfig?.parameterSetSha256 === parameterSetSha256 &&
        stepTypeConfig.dbtInvocationSha256 === dbtInvocationSha256
    )
  )
    return { ok: false };
  return { ok: true, dbtVariablesJson };
}
