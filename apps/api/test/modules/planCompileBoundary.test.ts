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

    it('preserves DVT runtime step configs without injecting dbt-only policy keys', async () => {
      const planner = buildPlanCompilePlanner();

      const result = await planner.buildPlan({
        requestedBy: 'principal-1',
        requestId: 'req-compile-dvt-substrait',
        requestedAtIso: '2026-04-24T00:00:00.000Z',
        graphSource: {
          kind: 'generic-graph-v1',
          sourceFamily: 'dvt-substrait',
          sourceVersion: 'substrait-v1',
          nodes: [
            {
              nodeId: 'prepare_orders',
              stepKind: 'PREPARE_POSTGRES_TRANSFORM',
              dependsOn: [],
              stepTypeConfig: {
                connectionRef: {
                  schemaVersion: 'connection-ref.v1',
                  connectionId: 'warehouse-a',
                  provider: 'postgres',
                },
                targetSchema: 'analytics',
                sourceSchema: 'raw',
                sourceTable: 'orders',
                sourceAlias: 'orders',
              },
            },
            {
              nodeId: 'transform_orders',
              stepKind: 'POSTGRES_SQL_TRANSFORM',
              dependsOn: ['prepare_orders'],
              stepTypeConfig: {
                connectionRef: {
                  schemaVersion: 'connection-ref.v1',
                  connectionId: 'warehouse-a',
                  provider: 'postgres',
                },
                dialect: 'postgres',
                entrypoint: 'models/analytics/model_orders.sql',
                sql: 'select * from raw.orders',
                sqlArtifact: {
                  repo: 'dunay2/dvt',
                  path: 'models/analytics/model_orders.sql',
                  ref: 'refs/heads/main',
                  commitSha: 'local',
                  contentSha256: 'a'.repeat(64),
                },
                sourceSchema: 'raw',
                sourceTable: 'orders',
                sourceAlias: 'orders',
                sinkSchema: 'analytics',
                sinkTable: 'orders_daily',
                materialization: 'table',
                writeMode: 'replace',
              },
            },
            {
              nodeId: 'capture_orders',
              stepKind: 'CAPTURE_MATERIALIZATION_EVIDENCE',
              dependsOn: ['transform_orders'],
              stepTypeConfig: {
                connectionRef: {
                  schemaVersion: 'connection-ref.v1',
                  connectionId: 'warehouse-a',
                  provider: 'postgres',
                },
                sinkSchema: 'analytics',
                sinkTable: 'orders_daily',
                materialization: 'table',
                writeMode: 'replace',
              },
            },
          ],
        },
        selection: {
          selectedNodeIds: ['prepare_orders', 'transform_orders', 'capture_orders'],
        },
      });

      expect(result.plan.steps).toMatchObject([
        {
          stepId: 'prepare_orders',
          kind: 'PREPARE_POSTGRES_TRANSFORM',
          stepTypeConfig: {
            connectionRef: {
              schemaVersion: 'connection-ref.v1',
              connectionId: 'warehouse-a',
              provider: 'postgres',
            },
            targetSchema: 'analytics',
            sourceSchema: 'raw',
            sourceTable: 'orders',
            sourceAlias: 'orders',
          },
        },
        {
          stepId: 'transform_orders',
          kind: 'POSTGRES_SQL_TRANSFORM',
          stepTypeConfig: {
            connectionRef: {
              schemaVersion: 'connection-ref.v1',
              connectionId: 'warehouse-a',
              provider: 'postgres',
            },
            dialect: 'postgres',
            entrypoint: 'models/analytics/model_orders.sql',
            sinkSchema: 'analytics',
            sinkTable: 'orders_daily',
          },
        },
        {
          stepId: 'capture_orders',
          kind: 'CAPTURE_MATERIALIZATION_EVIDENCE',
          stepTypeConfig: {
            connectionRef: {
              schemaVersion: 'connection-ref.v1',
              connectionId: 'warehouse-a',
              provider: 'postgres',
            },
            sinkSchema: 'analytics',
            sinkTable: 'orders_daily',
            materialization: 'table',
            writeMode: 'replace',
          },
        },
      ]);
      expect(result.plan.steps[0]?.stepTypeConfig).not.toHaveProperty('stepTimeoutMs');
      expect(result.plan.steps[0]?.stepTypeConfig).not.toHaveProperty('concurrency');
      expect(result.plan.steps[1]?.stepTypeConfig).not.toHaveProperty('stepTimeoutMs');
      expect(result.plan.steps[1]?.stepTypeConfig).not.toHaveProperty('concurrency');
    });

    it('rejects profile kinds that fall outside the allowed families', () => {
      expect(() =>
        buildPlanCompilePlanner({
          ...PLAN_COMPILE_BOUNDARY,
          profile: {
            ...PLAN_COMPILE_BOUNDARY.profile,
            allowedFamilies: ['spark'],
            allowedStepKinds: ['POSTGRES_SQL_TRANSFORM'],
          },
        })
      ).toThrow(/POSTGRES_SQL_TRANSFORM/);
    });
  });
}

describePlanCompileBoundaryCases();
