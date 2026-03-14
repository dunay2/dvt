/**
 * Integration tests for Planner ↔ IStepTypeRegistry (G9).
 *
 * Covers the validateStepConfigs() path added in Planner.ts:
 *  - INVALID_STEP_CONFIG is thrown for known kinds with invalid config
 *  - Unknown kinds pass through (fail-open per ADR-0006)
 *  - Custom registry can be injected via PlannerOptions.stepTypeRegistry
 */
import { StepTypeRegistry, type IStepTypeRegistry } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { PlannerError, PlannerErrorCode } from '../../src/domain/errors.js';
import { Planner } from '../../src/domain/Planner.js';
import type { StepFactory } from '../../src/domain/stepFactory/StepFactory.js';

const SINGLE_NODE_PLAN = {
  nodes: [{ nodeId: 'a', resourceType: 'model', dependsOn: [] }],
  selection: { selectedNodeIds: ['a'] },
} as const;

const makeSingleStepFactory = (
  kind: string,
  stepTypeConfig?: Record<string, unknown>
): StepFactory => {
  return (node, _policies) => ({
    stepId: node.nodeId,
    kind,
    dependsOn: [...node.dependsOn],
    ...(stepTypeConfig === undefined ? {} : { stepTypeConfig }),
  });
};

const buildPlanWithSingleStep = (
  kind: string,
  stepTypeConfig?: Record<string, unknown>,
  stepTypeRegistry?: IStepTypeRegistry
): ReturnType<Planner['buildPlan']> => {
  const planner = new Planner({
    stepFactory: makeSingleStepFactory(kind, stepTypeConfig),
    ...(stepTypeRegistry === undefined ? {} : { stepTypeRegistry }),
  });
  return planner.buildPlan(SINGLE_NODE_PLAN);
};

const invalidStepConfigExpectation = (
  kind: string
): { code: PlannerErrorCode; message: ReturnType<typeof expect.stringContaining> } => ({
  code: PlannerErrorCode.INVALID_STEP_CONFIG,
  message: expect.stringContaining(kind),
});

// ── INVALID_STEP_CONFIG rejection ─────────────────────────────────────────────

describe('Planner → IStepTypeRegistry: known-kind rejection', () => {
  it('rejects DBT_MODEL step with unknown field in stepTypeConfig (strict schema)', async () => {
    // DbtStepTypeConfigSchema is .strict() — unrecognized fields are rejected
    const buildPlanPromise = buildPlanWithSingleStep('DBT_MODEL', { rogueField: true });

    await expect(buildPlanPromise).rejects.toBeInstanceOf(PlannerError);
    await expect(buildPlanPromise).rejects.toMatchObject(invalidStepConfigExpectation('DBT_MODEL'));
  });

  it('rejects DBT_TEST step with invalid compiledCodeRef.sha256', async () => {
    await expect(
      buildPlanWithSingleStep('DBT_TEST', {
        compiledCodeRef: { sha256: 'not-a-valid-hex', storageUri: 's3://x', sizeBytes: 1 },
      })
    ).rejects.toMatchObject(invalidStepConfigExpectation('DBT_TEST'));
  });

  it('error message includes kind name', async () => {
    await expect(buildPlanWithSingleStep('DBT_SNAPSHOT', { rogueField: 42 })).rejects.toMatchObject(
      invalidStepConfigExpectation('DBT_SNAPSHOT')
    );
  });
});

// ── Fail-open for unknown kinds ───────────────────────────────────────────────

describe('Planner → IStepTypeRegistry: unknown-kind fail-open', () => {
  it('accepts any stepTypeConfig for an unregistered kind', async () => {
    const { plan } = await buildPlanWithSingleStep('FUTURE_SPARK_JOB', {
      arbitraryField: 'anything',
      nested: { x: 1 },
    });

    expect(plan.steps[0]).toMatchObject({
      kind: 'FUTURE_SPARK_JOB',
      stepTypeConfig: { arbitraryField: 'anything' },
    });
  });

  it('accepts missing stepTypeConfig for an unregistered kind', async () => {
    await expect(buildPlanWithSingleStep('BARE_KIND')).resolves.toBeDefined();
  });
});

// ── Custom registry injection ─────────────────────────────────────────────────

describe('Planner → PlannerOptions.stepTypeRegistry injection', () => {
  const SparkJobSchema = z.object({ sparkVersion: z.string() }).strict();
  const customRegistry = new StepTypeRegistry(new Map([['SPARK_JOB', SparkJobSchema]]));

  it('accepts valid config for custom-registered kind', async () => {
    await expect(
      buildPlanWithSingleStep('SPARK_JOB', { sparkVersion: '3.5' }, customRegistry)
    ).resolves.toBeDefined();
  });

  it('rejects invalid config for custom-registered kind', async () => {
    await expect(
      buildPlanWithSingleStep('SPARK_JOB', { sparkVersion: 42 }, customRegistry)
    ).rejects.toMatchObject(invalidStepConfigExpectation('SPARK_JOB'));
  });

  it('fails-open for DBT_MODEL when custom registry does not register it', async () => {
    // customRegistry only knows SPARK_JOB, so DBT_MODEL is unknown → fail-open
    await expect(
      buildPlanWithSingleStep('DBT_MODEL', { rogueField: 'ignored by registry' }, customRegistry)
    ).resolves.toBeDefined();
  });
});
