/**
 * Owned concern: prove protected DVT plans persist/replay through real PG and artifact-backed services, never file compilation.
 * @decision Retain real PG persistence and replay assertions independently of file compilation.
 * @consequence Protected native DVT keeps its existing missing-capability outcome and never calls the file compiler.
 */
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { PostgresPlanStore } from '@dvt/adapter-postgres';
import {
  DVT_POSTGRES_OPERATIONAL_WORKLOAD_REQUIRED_CAPABILITY,
  DvtOperationalWorkloadContractV1,
  KNOWN_STEP_KINDS,
  parseExecutionSelection,
} from '@dvt/contracts';
import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildDvtJoinPreviewDraft } from '../fixtures/dvtJoinPreviewFixture.js';
import { buildDvtTerminalTransformPreviewDraft } from '../fixtures/workspaceGraphDraftFixture.js';

import {
  buildDvtPreviewIntegrationUseCase,
  buildDvtPreviewIntegrationContext,
} from './dvtProtectedPreview.integration.fixtures.js';

const databaseUrl = process.env['DVT_PG_URL'] ?? process.env['DATABASE_URL'];

const describeIfPostgres = databaseUrl === undefined ? describe.skip : describe;

describeIfPostgres('protected DVT Preview integration', () => {
  const scope = {
    tenantId: 'tenant-dvt-preview-it',
    projectId: 'project-dvt-preview-it',
    environmentId: 'env-dvt-preview-it',
  } as const;
  const schema = `dvt_preview_it_${randomUUID().replaceAll('-', '')}`;
  let artifactRoot = '';
  let planStore: PostgresPlanStore;

  beforeAll(async () => {
    artifactRoot = await mkdtemp(path.join(os.tmpdir(), 'dvt-preview-it-'));
    planStore = new PostgresPlanStore({
      connectionString: databaseUrl!,
      schema,
      toExecutablePlan: (buildResult) => ({
        schemaVersion: buildResult.plan.metadata.schemaVersion,
        text: JSON.stringify(buildResult.plan),
      }),
    });
    await planStore.migrate();
  });

  afterAll(async () => {
    await planStore.close();
    const client = new Client({ connectionString: databaseUrl! });
    await client.connect();
    try {
      await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    } finally {
      await client.end();
    }
    await rm(artifactRoot, { recursive: true, force: true });
  });

  it.each([
    [1, 'preview'],
    [2, 'preview'],
    [3, 'preview'],
    [2, 'run'],
  ] as const)(
    'persists and replays %i protected inputs as one %s plan without client graphSource',
    async (inputCount, intent) => {
      const baseDraft =
        inputCount === 1
          ? buildDvtTerminalTransformPreviewDraft()
          : buildDvtJoinPreviewDraft(inputCount);
      const draft =
        intent === 'preview'
          ? baseDraft
          : {
              ...baseDraft,
              nodes: baseDraft.nodes.map((node) =>
                node.id === 'transform-orders'
                  ? {
                      ...node,
                      metadata: {
                        ...node.metadata,
                        config: {
                          materialized: 'table',
                          resultTarget: {
                            schemaVersion: 'dvt-transform-result-target.v1',
                            connectionRef: {
                              schemaVersion: 'connection-ref.v1',
                              connectionId: 'local-postgres-proof',
                              provider: 'postgres',
                            },
                            schema: 'analytics',
                            relation: 'orders_result',
                          },
                        },
                      },
                    }
                  : node
              ),
            };
      const useCase = buildDvtPreviewIntegrationUseCase({ scope, draft, artifactRoot, planStore });
      const command = {
        targetAdapter: 'temporal',
        selection: parseExecutionSelection({
          mode: 'upstream',
          nodeIds: ['transform-orders'],
        }),
        provenance: {
          kind: 'dvt-protected-workspace-graph' as const,
          canvasId: 'dvt-terminal-preview-canvas',
        },
      };
      const context = buildDvtPreviewIntegrationContext(scope);

      expect(command).not.toHaveProperty('graphSource');
      const result = await useCase.execute(command, context);
      if (result.kind === 'selection-rejected') {
        throw new Error(JSON.stringify(result.rejection));
      }

      expect(result).toMatchObject({
        kind: 'plan-invalid',
        validation: {
          status: 'ERROR',
          code: 'MISSING_CAPABILITY',
          cause: DVT_POSTGRES_OPERATIONAL_WORKLOAD_REQUIRED_CAPABILITY,
        },
      });
      if (result.kind !== 'plan-invalid') {
        throw new Error('Expected persisted plan with the real missing executor capability');
      }
      expect(result.plan.steps).toEqual([
        expect.objectContaining({
          stepId: 'transform-orders',
          kind: KNOWN_STEP_KINDS.DVT_POSTGRES_OPERATIONAL_WORKLOAD,
          dependsOn: [],
        }),
      ]);
      const workload = DvtOperationalWorkloadContractV1.schema.parse(
        result.plan.steps[0]?.stepTypeConfig
      );
      expect(workload.graph.selectedNodeIds).toEqual([...draft.nodeIds].sort());
      expect(workload.graph.selectedEdgeIds).toEqual(draft.edges.map((edge) => edge.id).sort());
      expect(workload.semantics).toHaveLength(1);
      expect(workload.output.kind).toBe(
        intent === 'preview' ? 'ephemeral-preview' : 'transform-result'
      );
      await expect(
        planStore.getPlanRecordByRef({
          ...scope,
          planRef: result.planRef,
        })
      ).resolves.toMatchObject({
        planId: result.plan.metadata.planId,
        sourceRef: result.planRef.uri,
      });
      await expect(
        planStore.getStoredPlanValidationRecord({
          ...scope,
          planId: result.plan.metadata.planId,
        })
      ).resolves.toMatchObject({
        state: 'INVALID',
      });

      const repeated = await useCase.execute(command, context);
      expect(repeated).toMatchObject({
        kind: 'plan-invalid',
        planRef: result.planRef,
        planRecord: {
          planId: result.planRecord.planId,
          canonicalHash: result.planRecord.canonicalHash,
          canonicalPlanJson: result.planRecord.canonicalPlanJson,
          sourceRef: result.planRecord.sourceRef,
          createdAtIso: result.planRecord.createdAtIso,
        },
        validation: result.validation,
      });
    }
  );
});
