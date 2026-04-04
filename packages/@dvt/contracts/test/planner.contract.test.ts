import { readFileSync } from 'node:fs';
import { URL } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  type ExecutionPlan,
  PLANNER_GRAPH_SOURCE_KIND,
  type PlannerBuildResultV1,
  type PlannerInputEnvelopeV1,
} from '../src/contracts/planner/ExecutionPlan.v1.js';
import { type IPlanner } from '../src/contracts/planner/IExecutionPlanner.v1.js';
import type { ExecutionPlan as EngineVisibleExecutionPlan } from '../src/engine/IRunStateStore.v1.js';
import { CURRENT_EXECUTION_PLAN_VERSION } from '../src/index.js';
import {
  ExecutionPlanSchema,
  PlannerBuildResultV1Schema,
  PlannerInputEnvelopeV1Schema,
  type PlannerInputEnvelopeV1SchemaT,
} from '../src/schemas.js';

import {
  INVALID_PLANNER_INPUT_FIXTURE,
  MULTI_SOURCE_PLANNER_INPUT_FIXTURE,
  NO_SOURCE_PLANNER_INPUT_FIXTURE,
  VALID_EXECUTION_PLAN_V2_FIXTURE,
  VALID_PLANNER_BUILD_RESULT_V2_FIXTURE,
  VALID_PLANNER_INPUT_FIXTURE,
} from './fixtures/planner-contract.fixtures';

describe('contracts: planner normative contract (GAP-P0-02)', () => {
  it('retira el alias público ExecutionPlan del barrel raíz', () => {
    const rootIndex = readFileSync(new URL('../src/index.ts', import.meta.url), 'utf8');
    expect(rootIndex).toMatch(/\bExecutionPlan,\s*/);
    expect(rootIndex).not.toMatch(/\bExecutionPlanV2\b/);
  });

  it('expone el contrato normativo IPlanner como forma canónica', async () => {
    const planner: IPlanner = {
      async buildPlan(input) {
        return PlannerBuildResultV1Schema.parse({
          ...VALID_PLANNER_BUILD_RESULT_V2_FIXTURE,
          plan: {
            ...VALID_PLANNER_BUILD_RESULT_V2_FIXTURE.plan,
            observability: input.observability,
          },
        }) as PlannerBuildResultV1;
      },
    };

    const result = await planner.buildPlan(
      VALID_PLANNER_INPUT_FIXTURE as unknown as PlannerInputEnvelopeV1
    );

    expect(result.plan.metadata.planVersion).toBe(CURRENT_EXECUTION_PLAN_VERSION);
    expect(result.plan.steps.length).toBeGreaterThan(0);
  });

  it('valida schema de PlannerInputEnvelopeV1 con fixture mínimo válido', () => {
    const input = PlannerInputEnvelopeV1Schema.parse(VALID_PLANNER_INPUT_FIXTURE);
    const typed: PlannerInputEnvelopeV1SchemaT = input;

    expect(typed.graphSource?.kind).toBe(PLANNER_GRAPH_SOURCE_KIND);
    expect(typed.selection.selectedNodeIds).toContain('model.analytics.orders');
  });

  it('rechaza input inválido cuando no hay ninguna fuente activa', () => {
    const result = PlannerInputEnvelopeV1Schema.safeParse(NO_SOURCE_PLANNER_INPUT_FIXTURE);
    expect(result.success).toBe(false);
  });

  it('rechaza input inválido cuando hay más de una fuente activa', () => {
    const result = PlannerInputEnvelopeV1Schema.safeParse(MULTI_SOURCE_PLANNER_INPUT_FIXTURE);
    expect(result.success).toBe(false);
  });

  it('rechaza input inválido cuando manifestRef.sha256 no es hash hex de 64 chars', () => {
    const result = PlannerInputEnvelopeV1Schema.safeParse(INVALID_PLANNER_INPUT_FIXTURE);
    expect(result.success).toBe(false);
  });

  it('valida schema del ExecutionPlan canónico versionado', () => {
    const plan = ExecutionPlanSchema.parse(VALID_EXECUTION_PLAN_V2_FIXTURE);
    expect(plan.metadata.planVersion).toBe(CURRENT_EXECUTION_PLAN_VERSION);
    expect(plan.metadata.schemaVersion).toBe('v1.2');
    expect(plan.metadata.contractVersion).toBe('1.0.0');
    expect(plan.metadata.planId).toMatch(/^[a-f0-9]{64}$/);
    expect(plan.steps.map((s) => s.stepId)).toEqual([
      'model.analytics.customers',
      'model.analytics.orders',
    ]);
  });

  it('mantiene una sola identidad pública entre planner y engine', () => {
    const plannerPlan = VALID_EXECUTION_PLAN_V2_FIXTURE satisfies ExecutionPlan;
    const engineVisible: EngineVisibleExecutionPlan = plannerPlan;

    expect(engineVisible.metadata.planId).toBe(VALID_EXECUTION_PLAN_V2_FIXTURE.metadata.planId);
    expect(engineVisible.metadata.createdAtIso).toBe(
      VALID_EXECUTION_PLAN_V2_FIXTURE.metadata.createdAtIso
    );
  });

  it('valida schema de PlannerBuildResultV1 con canonicalPlanJson', () => {
    const result = PlannerBuildResultV1Schema.parse(VALID_PLANNER_BUILD_RESULT_V2_FIXTURE);
    expect(result.canonicalPlanJson).toContain(`"planVersion":"${CURRENT_EXECUTION_PLAN_VERSION}"`);
  });
});
