/**
 * Integration tests for Planner ↔ IStepTypeRegistry (G9).
 *
 * Covers the validateStepConfigs() path added in Planner.ts:
 *  - INVALID_STEP_CONFIG is thrown for known kinds with invalid config
 *  - Unknown kinds pass through (fail-open per ADR-0006)
 *  - Custom registry can be injected via PlannerOptions.stepTypeRegistry
 */
import { StepTypeRegistry } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { PlannerError, PlannerErrorCode } from '../../src/domain/errors.js';
import { Planner } from '../../src/domain/Planner.js';
import type { StepFactory } from '../../src/domain/stepFactory/StepFactory.js';

const SINGLE_NODE_PLAN = {
  nodes: [{ nodeId: 'a', resourceType: 'model', dependsOn: [] }],
  selection: { selectedNodeIds: ['a'] },
} as const;

// ── INVALID_STEP_CONFIG rejection ─────────────────────────────────────────────

describe('Planner → IStepTypeRegistry: known-kind rejection', () => {
  it('rejects DBT_MODEL step with unknown field in stepTypeConfig (strict schema)', async () => {
    // DbtStepTypeConfigSchema is .strict() — unrecognized fields are rejected
    const badFactory: StepFactory = (node, _policies) => ({
      stepId: node.nodeId,
      kind: 'DBT_MODEL',
      dependsOn: [...node.dependsOn],
      stepTypeConfig: { rogueField: true },
    });

    const planner = new Planner({ stepFactory: badFactory });

    await expect(planner.buildPlan(SINGLE_NODE_PLAN)).rejects.toBeInstanceOf(PlannerError);
    await expect(planner.buildPlan(SINGLE_NODE_PLAN)).rejects.toMatchObject({
      code: PlannerErrorCode.INVALID_STEP_CONFIG,
    });
  });

  it('rejects DBT_TEST step with invalid compiledCodeRef.sha256', async () => {
    const badFactory: StepFactory = (node, _policies) => ({
      stepId: node.nodeId,
      kind: 'DBT_TEST',
      dependsOn: [...node.dependsOn],
      stepTypeConfig: {
        compiledCodeRef: { sha256: 'not-a-valid-hex', storageUri: 's3://x', sizeBytes: 1 },
      },
    });

    const planner = new Planner({ stepFactory: badFactory });

    await expect(planner.buildPlan(SINGLE_NODE_PLAN)).rejects.toMatchObject({
      code: PlannerErrorCode.INVALID_STEP_CONFIG,
    });
  });

  it('error message includes kind name', async () => {
    const badFactory: StepFactory = (node, _policies) => ({
      stepId: node.nodeId,
      kind: 'DBT_SNAPSHOT',
      dependsOn: [...node.dependsOn],
      stepTypeConfig: { rogueField: 42 },
    });

    const planner = new Planner({ stepFactory: badFactory });

    await expect(planner.buildPlan(SINGLE_NODE_PLAN)).rejects.toMatchObject({
      code: PlannerErrorCode.INVALID_STEP_CONFIG,
      message: expect.stringContaining('DBT_SNAPSHOT'),
    });
  });
});

// ── Fail-open for unknown kinds ───────────────────────────────────────────────

describe('Planner → IStepTypeRegistry: unknown-kind fail-open', () => {
  it('accepts any stepTypeConfig for an unregistered kind', async () => {
    const customFactory: StepFactory = (node, _policies) => ({
      stepId: node.nodeId,
      kind: 'FUTURE_SPARK_JOB',
      dependsOn: [...node.dependsOn],
      stepTypeConfig: { arbitraryField: 'anything', nested: { x: 1 } },
    });

    const planner = new Planner({ stepFactory: customFactory });
    const { plan } = await planner.buildPlan(SINGLE_NODE_PLAN);

    expect(plan.steps[0]).toMatchObject({
      kind: 'FUTURE_SPARK_JOB',
      stepTypeConfig: { arbitraryField: 'anything' },
    });
  });

  it('accepts missing stepTypeConfig for an unregistered kind', async () => {
    const customFactory: StepFactory = (node, _policies) => ({
      stepId: node.nodeId,
      kind: 'BARE_KIND',
      dependsOn: [...node.dependsOn],
    });

    const planner = new Planner({ stepFactory: customFactory });
    await expect(planner.buildPlan(SINGLE_NODE_PLAN)).resolves.toBeDefined();
  });
});

// ── Custom registry injection ─────────────────────────────────────────────────

describe('Planner → PlannerOptions.stepTypeRegistry injection', () => {
  const SparkJobSchema = z.object({ sparkVersion: z.string() }).strict();
  const customRegistry = new StepTypeRegistry(new Map([['SPARK_JOB', SparkJobSchema]]));

  it('accepts valid config for custom-registered kind', async () => {
    const validFactory: StepFactory = (node, _policies) => ({
      stepId: node.nodeId,
      kind: 'SPARK_JOB',
      dependsOn: [...node.dependsOn],
      stepTypeConfig: { sparkVersion: '3.5' },
    });

    const planner = new Planner({ stepFactory: validFactory, stepTypeRegistry: customRegistry });
    await expect(planner.buildPlan(SINGLE_NODE_PLAN)).resolves.toBeDefined();
  });

  it('rejects invalid config for custom-registered kind', async () => {
    const badFactory: StepFactory = (node, _policies) => ({
      stepId: node.nodeId,
      kind: 'SPARK_JOB',
      dependsOn: [...node.dependsOn],
      stepTypeConfig: { sparkVersion: 42 }, // should be string
    });

    const planner = new Planner({ stepFactory: badFactory, stepTypeRegistry: customRegistry });

    await expect(planner.buildPlan(SINGLE_NODE_PLAN)).rejects.toMatchObject({
      code: PlannerErrorCode.INVALID_STEP_CONFIG,
      message: expect.stringContaining('SPARK_JOB'),
    });
  });

  it('fails-open for DBT_MODEL when custom registry does not register it', async () => {
    // customRegistry only knows SPARK_JOB, so DBT_MODEL is unknown → fail-open
    const dbtFactory: StepFactory = (node, _policies) => ({
      stepId: node.nodeId,
      kind: 'DBT_MODEL',
      dependsOn: [...node.dependsOn],
      stepTypeConfig: { rogueField: 'ignored by registry' },
    });

    const planner = new Planner({ stepFactory: dbtFactory, stepTypeRegistry: customRegistry });
    await expect(planner.buildPlan(SINGLE_NODE_PLAN)).resolves.toBeDefined();
  });
});
