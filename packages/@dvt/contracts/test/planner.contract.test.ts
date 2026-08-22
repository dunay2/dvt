import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';

import { jcsCanonicalize } from '@dvt/crypto';
import { describe, expect, it } from 'vitest';

import type { ExecutionPlan as EngineVisibleExecutionPlan } from '../src/contracts/engine/RunStateVocabulary.v1.js';
import {
  type ExecutionPlan,
  GENERIC_GRAPH_SOURCE_KIND,
  type PlannerBuildResultV1,
  type PlannerInputEnvelopeV1,
} from '../src/contracts/planner/ExecutionPlan.v1.js';
import { type IPlanner } from '../src/contracts/planner/IExecutionPlanner.v1.js';
import { CURRENT_EXECUTION_PLAN_VERSION } from '../src/index.js';
import {
  ExecutionPlanSchema,
  PlannerBuildResultV1Schema,
  PlannerInputEnvelopeV1Schema,
  type PlannerInputEnvelopeV1SchemaT,
} from '../src/schemas.js';
import { ContractValidationError, parsePlannerBuildResultV1 } from '../src/validation.js';

import {
  INVALID_NO_GRAPH_SOURCE_PLANNER_INPUT_FIXTURE,
  INVALID_PLANNER_INPUT_FIXTURE,
  NO_SOURCE_PLANNER_INPUT_FIXTURE,
  VALID_EXECUTION_PLAN_V1_FIXTURE,
  VALID_PLANNER_BUILD_RESULT_V1_FIXTURE,
  VALID_PLANNER_INPUT_FIXTURE,
} from './fixtures/planner-contract.fixtures';

describe('contracts: planner normative contract (GAP-P0-02)', () => {
  it('retira el alias público ExecutionPlan del barrel raíz', () => {
    const rootIndex = readFileSync(new URL('../src/index.ts', import.meta.url), 'utf8');
    expect(rootIndex).toMatch(/\bExecutionPlan,\s*/);
    expect(rootIndex).not.toMatch(/\bExecutionPlanV2\b/);
    expect(rootIndex).not.toMatch(/\bGraphNode,\s*/);
    expect(rootIndex).not.toMatch(/\bDbtManifestLike,\s*/);
  });

  it('expone el contrato normativo IPlanner como forma canónica', async () => {
    const planner: IPlanner = {
      async buildPlan(input) {
        return PlannerBuildResultV1Schema.parse({
          ...VALID_PLANNER_BUILD_RESULT_V1_FIXTURE,
          plan: {
            ...VALID_PLANNER_BUILD_RESULT_V1_FIXTURE.plan,
            metadata: {
              ...VALID_PLANNER_BUILD_RESULT_V1_FIXTURE.plan.metadata,
              ownership: input.ownership,
            },
            observability: input.observability,
          },
        }) as PlannerBuildResultV1;
      },
      deriveExecutableSubgraph() {
        throw new Error('not used in this contract test');
      },
    };

    const result = await planner.buildPlan(
      VALID_PLANNER_INPUT_FIXTURE as unknown as PlannerInputEnvelopeV1
    );

    expect(result.plan.metadata.planVersion).toBe(CURRENT_EXECUTION_PLAN_VERSION);
    expect(result.plan.metadata.ownership).toEqual(VALID_PLANNER_INPUT_FIXTURE.ownership);
    expect(result.executionPolicy.requiresCapabilities).toEqual(['basic-execution']);
    expect(result.plan.steps.length).toBeGreaterThan(0);
  });

  it('valida schema de PlannerInputEnvelopeV1 con fixture mínimo válido', () => {
    const input = PlannerInputEnvelopeV1Schema.parse(VALID_PLANNER_INPUT_FIXTURE);
    const typed: PlannerInputEnvelopeV1SchemaT = input;

    expect(typed.graphSource.kind).toBe(GENERIC_GRAPH_SOURCE_KIND);
    expect(typed.selection.selectedNodeIds).toContain('model.analytics.orders');
  });

  it('rechaza input inválido cuando no hay ninguna fuente activa', () => {
    const result = PlannerInputEnvelopeV1Schema.safeParse(NO_SOURCE_PLANNER_INPUT_FIXTURE);
    expect(result.success).toBe(false);
  });

  it('rechaza input inválido cuando falta graphSource en el contrato canónico', () => {
    const result = PlannerInputEnvelopeV1Schema.safeParse(
      INVALID_NO_GRAPH_SOURCE_PLANNER_INPUT_FIXTURE
    );
    expect(result.success).toBe(false);
  });

  it('rechaza input inválido cuando graphSource viola invariantes canónicos', () => {
    const result = PlannerInputEnvelopeV1Schema.safeParse(INVALID_PLANNER_INPUT_FIXTURE);
    expect(result.success).toBe(false);
  });

  it('rechaza graphSource con nodeId duplicado', () => {
    const result = PlannerInputEnvelopeV1Schema.safeParse({
      graphSource: {
        kind: GENERIC_GRAPH_SOURCE_KIND,
        sourceFamily: 'integration-suite',
        sourceVersion: '1.0',
        nodes: [
          { nodeId: 'model.analytics.orders', stepKind: 'DBT_MODEL', dependsOn: [] },
          { nodeId: 'model.analytics.orders', stepKind: 'DBT_MODEL', dependsOn: [] },
        ],
      },
      selection: { selectedNodeIds: ['model.analytics.orders'] },
    });
    expect(result.success).toBe(false);
  });

  it('rechaza graphSource con dependencia faltante', () => {
    const result = PlannerInputEnvelopeV1Schema.safeParse({
      graphSource: {
        kind: GENERIC_GRAPH_SOURCE_KIND,
        sourceFamily: 'integration-suite',
        sourceVersion: '1.0',
        nodes: [
          {
            nodeId: 'model.analytics.orders',
            stepKind: 'DBT_MODEL',
            dependsOn: ['model.analytics.customers'],
          },
        ],
      },
      selection: { selectedNodeIds: ['model.analytics.orders'] },
    });
    expect(result.success).toBe(false);
  });

  it('acepta un alcance de decisiones autorizado más amplio que el subgrafo ejecutable', () => {
    const result = PlannerInputEnvelopeV1Schema.safeParse({
      ...VALID_PLANNER_INPUT_FIXTURE,
      decisionScope: {
        nodeIds: [
          ...VALID_PLANNER_INPUT_FIXTURE.graphSource.nodes.map((node) => node.nodeId),
          'model.analytics.excluded',
        ],
        requestedRootNodeIds: [VALID_PLANNER_INPUT_FIXTURE.graphSource.nodes[1]?.nodeId],
      },
    });

    expect(result.success).toBe(true);
  });

  it('rechaza identificadores duplicados en el alcance de decisiones', () => {
    const nodeId = VALID_PLANNER_INPUT_FIXTURE.graphSource.nodes[0]?.nodeId;
    const result = PlannerInputEnvelopeV1Schema.safeParse({
      ...VALID_PLANNER_INPUT_FIXTURE,
      decisionScope: { nodeIds: [nodeId, nodeId] },
    });

    expect(result.success).toBe(false);
  });

  it('rechaza un alcance de decisiones que omite nodos del subgrafo ejecutable', () => {
    const result = PlannerInputEnvelopeV1Schema.safeParse({
      ...VALID_PLANNER_INPUT_FIXTURE,
      decisionScope: {
        nodeIds: [VALID_PLANNER_INPUT_FIXTURE.graphSource.nodes[0]?.nodeId],
      },
    });

    expect(result.success).toBe(false);
  });

  it('rechaza una raiz solicitada fuera del subgrafo ejecutable', () => {
    const result = PlannerInputEnvelopeV1Schema.safeParse({
      ...VALID_PLANNER_INPUT_FIXTURE,
      decisionScope: {
        nodeIds: [
          ...VALID_PLANNER_INPUT_FIXTURE.graphSource.nodes.map((node) => node.nodeId),
          'model.analytics.excluded',
        ],
        requestedRootNodeIds: ['model.analytics.excluded'],
      },
    });

    expect(result.success).toBe(false);
  });

  it('valida schema del ExecutionPlan canónico versionado', () => {
    const plan = ExecutionPlanSchema.parse(VALID_EXECUTION_PLAN_V1_FIXTURE);
    expect(plan.metadata.planVersion).toBe(CURRENT_EXECUTION_PLAN_VERSION);
    expect(plan.metadata.schemaVersion).toBe('1.0');
    expect(plan.metadata.contractVersion).toBe('1.0.0');
    expect(plan.metadata.planId).toMatch(/^[a-f0-9]{64}$/);
    expect(plan.metadata.ownership).toEqual(VALID_PLANNER_INPUT_FIXTURE.ownership);
    expect(plan.steps[0]?.retryPolicy).toEqual({
      maxAttempts: 3,
      initialInterval: '1s',
      maximumInterval: '60s',
      backoffCoefficient: 2,
    });
    expect(plan.steps.map((s) => s.stepId)).toEqual([
      'model.analytics.customers',
      'model.analytics.orders',
    ]);
  });

  it('mantiene una sola identidad pública entre planner y engine', () => {
    const plannerPlan = VALID_EXECUTION_PLAN_V1_FIXTURE satisfies ExecutionPlan;
    const engineVisible: EngineVisibleExecutionPlan = plannerPlan;

    expect(engineVisible.metadata.planId).toBe(VALID_EXECUTION_PLAN_V1_FIXTURE.metadata.planId);
    expect(engineVisible.metadata.createdAtIso).toBe(
      VALID_EXECUTION_PLAN_V1_FIXTURE.metadata.createdAtIso
    );
  });

  it('valida schema de PlannerBuildResultV1 con canonicalPlanCoreJson', () => {
    const result = PlannerBuildResultV1Schema.parse(VALID_PLANNER_BUILD_RESULT_V1_FIXTURE);
    expect(result.executionPolicy.requiresCapabilities).toEqual(['basic-execution']);
    expect(result.canonicalPlanCoreJson).toContain(
      `"planVersion":"${CURRENT_EXECUTION_PLAN_VERSION}"`
    );
  });

  it('rechaza PlannerBuildResultV1 cuando canonicalPlanCoreJson no coincide con plan', () => {
    const result = PlannerBuildResultV1Schema.safeParse({
      ...VALID_PLANNER_BUILD_RESULT_V1_FIXTURE,
      canonicalPlanCoreJson: JSON.stringify({
        metadata: {
          planVersion: CURRENT_EXECUTION_PLAN_VERSION,
          inputHashSha256: 'c'.repeat(64),
        },
        steps: VALID_EXECUTION_PLAN_V1_FIXTURE.steps,
      }),
    });

    expect(result.success).toBe(false);
  });

  it('rechaza parsePlannerBuildResultV1 cuando planId no coincide con sha256(canonicalPlanCoreJson)', async () => {
    await expect(
      parsePlannerBuildResultV1({
        ...VALID_PLANNER_BUILD_RESULT_V1_FIXTURE,
        plan: {
          ...VALID_PLANNER_BUILD_RESULT_V1_FIXTURE.plan,
          metadata: {
            ...VALID_PLANNER_BUILD_RESULT_V1_FIXTURE.plan.metadata,
            planId: 'f'.repeat(64),
          },
        },
      })
    ).rejects.toMatchObject<Partial<ContractValidationError>>({
      details: [
        {
          path: 'plan.metadata.planId',
          message: 'plan.metadata.planId must match sha256(canonicalPlanCoreJson)',
        },
      ],
    });
  });

  it('acepta parsePlannerBuildResultV1 con canonicalPlanCoreJson canónico aunque el orden original de claves difiera', async () => {
    const canonicalPlanCoreJson = jcsCanonicalize({
      metadata: {
        planVersion: '1.0',
        inputHashSha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      },
      steps: [
        {
          stepId: 's1',
          kind: 'CUSTOM',
          dependsOn: [],
          stepTypeConfig: { a: 2, b: 1 },
        },
      ],
    });
    const planId = createHash('sha256').update(canonicalPlanCoreJson, 'utf8').digest('hex');

    await expect(
      parsePlannerBuildResultV1({
        plan: {
          metadata: {
            planVersion: '1.0',
            schemaVersion: '1.0',
            contractVersion: '1.0.0',
            inputHashSha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            planId,
            createdAtIso: '2026-04-07T00:00:00.000Z',
          },
          steps: [
            {
              stepId: 's1',
              kind: 'CUSTOM',
              dependsOn: [],
              stepTypeConfig: { b: 1, a: 2 },
            },
          ],
        },
        executionPolicy: {},
        canonicalPlanCoreJson,
      })
    ).resolves.toMatchObject({
      plan: {
        metadata: {
          planId,
        },
      },
    });
  });
});
