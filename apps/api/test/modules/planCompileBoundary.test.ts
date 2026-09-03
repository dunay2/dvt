import {
  LOAD_OBJECT_FILE_TO_POSTGRES_EXECUTION_PROFILE,
  LOAD_OBJECT_FILE_TO_POSTGRES_STEP_KIND,
  SUPPORTED_START_RUN_TARGET_ADAPTERS,
} from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import {
  buildPlanCompilePlanner,
  PLAN_COMPILE_BOUNDARY,
} from '../../src/modules/planCompileBoundary.js';

/**
 * Compile-boundary cases.
 * This suite asserts that `apps/api` exposes one coherent compile profile
 * instead of spreading planner policy across unrelated module tests.
 */
function describePlanCompileBoundaryCases(): void {
  describe('planCompileBoundary', () => {
    it('reuses canonical execution profiles for every exposed step kind', () => {
      for (const definition of PLAN_COMPILE_BOUNDARY.catalog.stepKinds) {
        if (definition.kind === LOAD_OBJECT_FILE_TO_POSTGRES_STEP_KIND) {
          expect(definition.executionProfile).toEqual(
            LOAD_OBJECT_FILE_TO_POSTGRES_EXECUTION_PROFILE
          );
        } else {
          expect(definition.executionProfile.supportedAdapters).toEqual(
            SUPPORTED_START_RUN_TARGET_ADAPTERS
          );
        }
      }
    });

    it('rejects DBT step kinds not listed in the compile profile', async () => {
      const planner = buildPlanCompilePlanner();

      await expect(
        planner.buildPlan({
          requestedBy: 'principal-1',
          requestId: 'req-compile-reject-dbt',
          requestedAtIso: '2026-04-17T00:00:00.000Z',
          graphSource: {
            kind: 'generic-graph-v1',
            sourceFamily: 'dbt',
            sourceVersion: 'manifest-v10',
            nodes: [{ nodeId: 'dbt-node-1', stepKind: 'DBT_MODEL', dependsOn: [] }],
          },
          selection: {
            selectedNodeIds: ['dbt-node-1'],
          },
        })
      ).rejects.toThrow(/DBT_MODEL/);
    });

    it('accepts a non-dbt spark graph from the resolved catalog', async () => {
      const planner = buildPlanCompilePlanner();

      const result = await planner.buildPlan({
        requestedBy: 'principal-1',
        requestId: 'req-compile-spark',
        requestedAtIso: '2026-04-19T00:00:00.000Z',
        graphSource: {
          kind: 'generic-graph-v1',
          sourceFamily: 'spark-job-graph',
          sourceVersion: 'spark-application-v1',
          nodes: [
            {
              nodeId: 'spark-job-1',
              stepKind: 'SPARK_JOB',
              dependsOn: [],
              stepTypeConfig: {
                application: 'orders-daily',
                entrypoint: 'jobs/orders.py',
                runtime: 'python',
              },
            },
          ],
        },
        selection: {
          selectedNodeIds: ['spark-job-1'],
        },
      });

      expect(result.plan.steps).toMatchObject([
        {
          stepId: 'spark-job-1',
          kind: 'SPARK_JOB',
          dependsOn: [],
          stepTypeConfig: {
            application: 'orders-daily',
            entrypoint: 'jobs/orders.py',
            runtime: 'python',
          },
        },
      ]);
      expect(result.executionPolicy.requiresCapabilities).toEqual(['spark.submit']);
    });

    it('rejects a step from the deleted SQL-first runtime family', async () => {
      const planner = buildPlanCompilePlanner();

      await expect(
        planner.buildPlan({
          requestedBy: 'principal-1',
          requestId: 'req-compile-retired-sql',
          requestedAtIso: '2026-04-24T00:00:00.000Z',
          graphSource: {
            kind: 'generic-graph-v1',
            sourceFamily: 'dvt-substrait',
            sourceVersion: 'substrait-v1',
            nodes: [
              {
                nodeId: 'transform_orders',
                stepKind: 'POSTGRES_SQL_TRANSFORM',
                dependsOn: [],
              },
            ],
          },
          selection: {
            selectedNodeIds: ['transform_orders'],
          },
        })
      ).rejects.toThrow(/POSTGRES_SQL_TRANSFORM/);
    });

    it('rejects profile kinds that fall outside the allowed families', () => {
      expect(() =>
        buildPlanCompilePlanner({
          ...PLAN_COMPILE_BOUNDARY,
          profile: {
            ...PLAN_COMPILE_BOUNDARY.profile,
            allowedFamilies: ['spark'],
            allowedStepKinds: [LOAD_OBJECT_FILE_TO_POSTGRES_STEP_KIND],
          },
        })
      ).toThrow(new RegExp(LOAD_OBJECT_FILE_TO_POSTGRES_STEP_KIND));
    });
  });
}

describePlanCompileBoundaryCases();
