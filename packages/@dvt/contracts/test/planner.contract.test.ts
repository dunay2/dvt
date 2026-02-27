import { describe, expect, it } from 'vitest';

import {
  type PlannerBuildResultV2,
  type PlannerInputEnvelopeV2,
} from '../src/contracts/planner/ExecutionPlan.v2.ts';
import { type IPlanner } from '../src/contracts/planner/IExecutionPlanner.v2.ts';
import {
  ExecutionPlanV2Schema,
  PlannerBuildResultV2Schema,
  PlannerInputEnvelopeV2Schema,
  type PlannerInputEnvelopeV2SchemaT,
} from '../src/schemas.ts';

import {
  INVALID_PLANNER_INPUT_FIXTURE,
  VALID_EXECUTION_PLAN_V2_FIXTURE,
  VALID_PLANNER_BUILD_RESULT_V2_FIXTURE,
  VALID_PLANNER_INPUT_FIXTURE,
} from './fixtures/planner-contract.fixtures';

describe('contracts: planner normative contract (GAP-P0-02)', () => {
  it('expone el contrato normativo IPlanner como forma canónica', async () => {
    const planner: IPlanner = {
      async buildPlan(input) {
        return PlannerBuildResultV2Schema.parse({
          ...VALID_PLANNER_BUILD_RESULT_V2_FIXTURE,
          plan: {
            ...VALID_PLANNER_BUILD_RESULT_V2_FIXTURE.plan,
            observability: input.observability,
          },
        }) as PlannerBuildResultV2;
      },
    };

    const result = await planner.buildPlan(
      VALID_PLANNER_INPUT_FIXTURE as unknown as PlannerInputEnvelopeV2
    );

    expect(result.plan.metadata.planVersion).toBe('2.3');
    expect(result.plan.steps.length).toBeGreaterThan(0);
  });

  it('valida schema de PlannerInputEnvelopeV2 con fixture mínimo válido', () => {
    const input = PlannerInputEnvelopeV2Schema.parse(VALID_PLANNER_INPUT_FIXTURE);
    const typed: PlannerInputEnvelopeV2SchemaT = input;

    expect(typed.selection.selectedNodeIds).toContain('model.analytics.orders');
    expect(typed.manifestRef?.uri).toBe('s3://acme-dbt-artifacts/prod/manifest.json');
  });

  it('rechaza input inválido cuando manifestRef.sha256 no es hash hex de 64 chars', () => {
    const result = PlannerInputEnvelopeV2Schema.safeParse(INVALID_PLANNER_INPUT_FIXTURE);
    expect(result.success).toBe(false);
  });

  it('valida schema de ExecutionPlanV2 versionado (2.3)', () => {
    const plan = ExecutionPlanV2Schema.parse(VALID_EXECUTION_PLAN_V2_FIXTURE);
    expect(plan.metadata.planVersion).toBe('2.3');
    expect(plan.metadata.planId).toMatch(/^[a-f0-9]{64}$/);
    expect(plan.steps.map((s) => s.stepId)).toEqual([
      'model.analytics.customers',
      'model.analytics.orders',
    ]);
  });

  it('valida schema de PlannerBuildResultV2 con canonicalPlanJson', () => {
    const result = PlannerBuildResultV2Schema.parse(VALID_PLANNER_BUILD_RESULT_V2_FIXTURE);
    expect(result.canonicalPlanJson).toContain('"planVersion":"2.3"');
  });
});
