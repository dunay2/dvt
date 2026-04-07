import {
  CURRENT_EXECUTION_PLAN_CONTRACT_VERSION,
  CURRENT_EXECUTION_PLAN_SCHEMA_VERSION,
  CURRENT_EXECUTION_PLAN_VERSION,
  type ExecutionPlan,
  type IStepTypeRegistry,
} from '@dvt/contracts';
import { describe, it, expect } from 'vitest';

import { sha256Hex, utf8Encode } from '../src/crypto.js';
import { PlanVerifierError } from '../src/errors.js';
import {
  parseAndVerifyStepTypeConfigsOrThrow,
  verifyStepTypeConfigsOrThrow,
} from '../src/stepTypeConfig.js';
import { verifyPlanIdOrThrow, verifyPlanOrThrow } from '../src/verify.js';

function makeExecutionPlan(stepOverrides: Partial<ExecutionPlan['steps'][number]>): ExecutionPlan {
  return {
    metadata: {
      planVersion: CURRENT_EXECUTION_PLAN_VERSION,
      schemaVersion: CURRENT_EXECUTION_PLAN_SCHEMA_VERSION,
      contractVersion: CURRENT_EXECUTION_PLAN_CONTRACT_VERSION,
      inputHashSha256: 'a'.repeat(64),
      planId: 'b'.repeat(64),
      createdAtIso: '2026-04-04T00:00:00.000Z',
    },
    steps: [
      {
        stepId: 'step-1',
        kind: 'DBT_MODEL',
        dependsOn: [],
        stepTypeConfig: {},
        ...stepOverrides,
      },
    ],
  };
}

describe('@dvt/plan-verifier', () => {
  it('verifies planId for canonicalPlanCoreJson (happy path)', async () => {
    const canonical = '{"a":1,"b":[true,false,null],"c":"x"}';
    const planId = await sha256Hex(utf8Encode(canonical));
    await expect(
      verifyPlanIdOrThrow({ canonicalPlanCoreJson: canonical, planId })
    ).resolves.toBeUndefined();
  });

  it('fails when planId mismatches', async () => {
    const canonical = '{"a":1}';
    await expect(
      verifyPlanIdOrThrow({ canonicalPlanCoreJson: canonical, planId: 'deadbeef' })
    ).rejects.toThrow();
  });

  it('fails on unsupported major planVersion', async () => {
    const canonical = '{"a":1}';
    const planId = await sha256Hex(utf8Encode(canonical));
    await expect(
      verifyPlanOrThrow({
        canonicalPlanCoreJson: canonical,
        planId,
        planVersion: '3.0',
        supportedMajor: 1,
      })
    ).rejects.toThrow(/Unsupported planVersion/);
  });

  it('passes on supported major planVersion', async () => {
    const canonical = '{"a":1}';
    const planId = await sha256Hex(utf8Encode(canonical));
    await expect(
      verifyPlanOrThrow({
        canonicalPlanCoreJson: canonical,
        planId,
        planVersion: '1.0',
        supportedMajor: 1,
      })
    ).resolves.toBeUndefined();
  });

  it('fails when strictSameMinor=true but supportedMinor missing', async () => {
    const canonical = '{"a":1}';
    const planId = await sha256Hex(utf8Encode(canonical));
    await expect(
      verifyPlanOrThrow({
        canonicalPlanCoreJson: canonical,
        planId,
        planVersion: '1.0',
        supportedMajor: 1,
        strictSameMinor: true,
      })
    ).rejects.toThrow(/requires supportedMinor/);
  });

  it('fails when strictSameMinor=true and minor mismatches', async () => {
    const canonical = '{"a":1}';
    const planId = await sha256Hex(utf8Encode(canonical));
    await expect(
      verifyPlanOrThrow({
        canonicalPlanCoreJson: canonical,
        planId,
        planVersion: '1.0',
        supportedMajor: 1,
        strictSameMinor: true,
        supportedMinor: 1,
      })
    ).rejects.toThrow(/Supported 1\.1\.x only/);
  });

  it('passes when strictSameMinor=true and minor matches', async () => {
    const canonical = '{"a":1}';
    const planId = await sha256Hex(utf8Encode(canonical));
    await expect(
      verifyPlanOrThrow({
        canonicalPlanCoreJson: canonical,
        planId,
        planVersion: '1.0',
        supportedMajor: 1,
        strictSameMinor: true,
        supportedMinor: 0,
      })
    ).resolves.toBeUndefined();
  });
});

describe('@dvt/plan-verifier stepTypeConfig admission', () => {
  it('accepts a known step kind with valid config', () => {
    const plan = makeExecutionPlan({
      kind: 'DBT_MODEL',
      stepTypeConfig: {
        stepTimeoutMs: 30_000,
        retries: { maxAttempts: 2, backoffMs: 500 },
      },
    });
    expect(() => verifyStepTypeConfigsOrThrow({ plan })).not.toThrow();
  });

  it('rejects unregistered step kinds by default', () => {
    const plan = makeExecutionPlan({
      kind: 'CUSTOM_KIND',
      stepTypeConfig: { anything: true },
    });
    expect(() => verifyStepTypeConfigsOrThrow({ plan })).toThrow(
      /INVALID_STEP_KIND|Unregistered step kind/
    );
  });

  it('rejects invalid config for a registered step kind', () => {
    const plan = makeExecutionPlan({
      kind: 'DBT_MODEL',
      stepTypeConfig: { unknownField: true },
    });
    expect(() => verifyStepTypeConfigsOrThrow({ plan })).toThrow(
      /INVALID_STEP_TYPE_CONFIG|Invalid stepTypeConfig/
    );
  });

  it('accepts injected registry kinds', () => {
    const customRegistry: IStepTypeRegistry = {
      isKnown(kind: string): boolean {
        return kind === 'CUSTOM_KIND';
      },
      validate(kind: string, config: unknown) {
        if (kind !== 'CUSTOM_KIND') {
          return { success: false as const, error: 'unsupported kind in injected registry' };
        }
        if (
          config !== null &&
          typeof config === 'object' &&
          !Array.isArray(config) &&
          'image' in config &&
          typeof (config as Record<string, unknown>).image === 'string'
        ) {
          return { success: true as const, data: config as Record<string, unknown> };
        }
        return { success: false as const, error: 'image:string is required' };
      },
      getKinds() {
        return ['CUSTOM_KIND'];
      },
    };

    const plan = makeExecutionPlan({
      kind: 'CUSTOM_KIND',
      stepTypeConfig: { image: 'python:3.12' },
    });
    expect(() =>
      verifyStepTypeConfigsOrThrow({
        plan,
        stepTypeRegistry: customRegistry,
      })
    ).not.toThrow();
  });

  it('parse+verify helper parses and rejects unknown kinds by default', () => {
    const parsedInput = makeExecutionPlan({
      kind: 'UNKNOWN_KIND',
      stepTypeConfig: {},
    });
    expect(() =>
      parseAndVerifyStepTypeConfigsOrThrow({
        input: parsedInput,
      })
    ).toThrow(/INVALID_STEP_KIND|Unregistered step kind/);
  });

  it('parse+verify helper normalizes parse errors to PlanVerifierError', () => {
    try {
      parseAndVerifyStepTypeConfigsOrThrow({ input: { not: 'an execution plan' } });
      throw new Error('expected parseAndVerifyStepTypeConfigsOrThrow to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(PlanVerifierError);
      expect((error as PlanVerifierError).code).toBe('INVALID_STEP_TYPE_CONFIG');
      expect((error as PlanVerifierError).message).toMatch(/Invalid ExecutionPlan payload/);
    }
  });
});
