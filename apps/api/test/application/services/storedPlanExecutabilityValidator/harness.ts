import type {
  IStepTypeRegistry,
  PlanRefSchemaT,
  RunExecutionPolicy,
  StepKindExecutionProfile,
} from '@dvt/contracts';
import {
  CURRENT_SIGNAL_SEMANTICS_VERSION,
  asNonBlankString,
} from '@dvt/contracts';
import type { IProviderAdapter } from '@dvt/engine';

/**
 * Shared test harness for `StoredPlanExecutabilityValidator`.
 * These helpers keep fixture mechanics in one place so each case file can focus
 * on one validation concern.
 */
export const PLAN_REF: PlanRefSchemaT = {
  uri: asNonBlankString(
    'dvt-plan://postgres/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
  ),
  sha256: asNonBlankString('abc123'),
  schemaVersion: asNonBlankString('v1.2'),
  planId: asNonBlankString('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'),
  planVersion: asNonBlankString('1.0'),
};

export function storedPlanArtifact(
  overrides?: Partial<{
    planId: string;
    planVersion: string;
    schemaVersion: string;
    stepKind: string;
    stepTypeConfig: Record<string, unknown>;
    executionPolicy: RunExecutionPolicy;
  }>
): { bytes: Uint8Array; executionPolicy: RunExecutionPolicy } {
  return {
    bytes: Buffer.from(
      JSON.stringify({
        metadata: {
          planId:
            overrides?.planId ?? 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
          planVersion: overrides?.planVersion ?? '1.0',
          schemaVersion: overrides?.schemaVersion ?? 'v1.2',
          contractVersion: '1.0.0',
          inputHashSha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          createdAtIso: '2026-03-01T00:00:00.000Z',
        },
        steps: [
          {
            stepId: 'step-1',
            kind: overrides?.stepKind ?? 'DBT_MODEL',
            dependsOn: [],
            ...(overrides?.stepTypeConfig === undefined
              ? {}
              : { stepTypeConfig: overrides.stepTypeConfig }),
          },
        ],
      }),
      'utf8'
    ),
    executionPolicy: overrides?.executionPolicy ?? {},
  };
}

export function makeAdapter(
  capabilities: ReadonlyArray<string>,
  provider: IProviderAdapter['provider'] = 'temporal'
): IProviderAdapter {
  return {
    provider,
    async startRun() {
      throw new Error('not used');
    },
    async cancelRun() {
      throw new Error('not used');
    },
    async getProviderStatusView() {
      throw new Error('not used');
    },
    async signal() {
      throw new Error('not used');
    },
    signalSemanticsVersions() {
      return [CURRENT_SIGNAL_SEMANTICS_VERSION] as const;
    },
    capabilities() {
      return capabilities.map((value) => asNonBlankString(value));
    },
  };
}

export function makeRegistryForKind(
  kind: string,
  profile?: StepKindExecutionProfile
): IStepTypeRegistry {
  return {
    isKnown(candidate: string): boolean {
      return candidate === kind;
    },
    validate(candidate: string): { success: true; data: Record<string, unknown> } {
      if (candidate !== kind) {
        throw new Error(`unexpected kind validation request: ${candidate}`);
      }
      return { success: true, data: {} };
    },
    getKinds(): readonly string[] {
      return [kind];
    },
    getExecutionProfile(candidate: string) {
      return candidate === kind ? profile : undefined;
    },
  };
}
