import type {
  DbtManifestRef,
  ExecutionPlan,
  GenericGraphSourceV1,
  PlannerEnvironmentContext,
  PlannerPolicyClassSet,
  RunExecutionContextRef,
} from '@dvt/contracts';

export const START_RUN_TARGET_ADAPTER = {
  temporal: 'temporal',
  mock: 'mock',
} as const;

export type StartRunTargetAdapter =
  (typeof START_RUN_TARGET_ADAPTER)[keyof typeof START_RUN_TARGET_ADAPTER];

export const SUPPORTED_START_RUN_TARGET_ADAPTERS: readonly StartRunTargetAdapter[] = [
  START_RUN_TARGET_ADAPTER.temporal,
  START_RUN_TARGET_ADAPTER.mock,
] as const;

export function isStartRunTargetAdapter(value: unknown): value is StartRunTargetAdapter {
  return (
    typeof value === 'string' &&
    (SUPPORTED_START_RUN_TARGET_ADAPTERS as readonly string[]).includes(value)
  );
}

export interface StartRunPlanRef {
  readonly uri: string;
  readonly sha256: string;
  readonly schemaVersion: string;
  readonly planId: string;
  readonly planVersion: string;
  readonly pluginCompatibilityFingerprint?: string | undefined;
}

export interface StartRunCommand {
  readonly planRef?: StartRunPlanRef;
  readonly runExecutionContextRef?: RunExecutionContextRef;
  readonly graphSource?: GenericGraphSourceV1;
  readonly manifestRef?: DbtManifestRef;
  readonly policies?: PlannerPolicyClassSet;
  readonly environment?: PlannerEnvironmentContext;
  readonly observability?: ExecutionPlan['observability'];
  readonly runId: string;
  readonly targetAdapter: StartRunTargetAdapter;
  readonly selection: ReadonlyArray<string>;
}
