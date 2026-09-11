import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { PostgresPlanStore } from '@dvt/adapter-postgres';
import {
  FileContentAddressedArtifactStore,
  locateFileContentAddressedArtifact,
} from '@dvt/artifacts';
import {
  DVT_POSTGRES_OPERATIONAL_WORKLOAD_REQUIRED_CAPABILITY,
  KNOWN_STEP_KINDS,
  createDefaultStepTypeRegistry,
  parseExecutionSelection,
} from '@dvt/contracts';
import { PlannerFacade } from '@dvt/planner';
import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  AUTHORIZATION_ACTION,
  buildEnvironmentAccessScope,
} from '../../src/application/ports/accessDecision.js';
import { WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION } from '../../src/application/ports/workspaceGraphDraft.js';
import { DvtOperationalWorkloadProjector } from '../../src/application/services/dvtOperationalWorkloadProjector.js';
import { DvtPostgresTargetProjectionPublisher } from '../../src/application/services/dvtPostgresTargetProjectionPublisher.js';
import { PreviewPlanUseCase } from '../../src/application/services/PreviewPlanUseCase.js';
import { ResolveAuthorizedDvtPreviewSelectionService } from '../../src/application/services/resolveAuthorizedDvtPreviewSelection.js';
import { ResolveAuthorizedExecutableSubgraphService } from '../../src/application/services/resolveAuthorizedExecutableSubgraph.js';
import { ResolveAuthorizedPreviewSelectionService } from '../../src/application/services/resolveAuthorizedPreviewSelection.js';
import { StoredExecutablePlanResolver } from '../../src/application/services/StoredExecutablePlanResolver.js';
import { StoredPlanExecutabilityValidator } from '../../src/application/services/StoredPlanExecutabilityValidator.js';
import { EnvironmentId, ProjectId, TenantId } from '../../src/domain/auth/types.js';
import { makeAdapter } from '../application/services/storedPlanExecutabilityValidator/harness.js';
import { buildDvtTerminalTransformPreviewDraft } from '../fixtures/workspaceGraphDraftFixture.js';

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

  it('persists one Planner-built step without accepting graphSource from the client', async () => {
    const draft = buildDvtTerminalTransformPreviewDraft();
    const planner = new PlannerFacade();
    const graphDraftResolver = new ResolveAuthorizedExecutableSubgraphService({
      planner,
      workspaceGraphDraftStore: {
        migrate: async () => undefined,
        close: async () => undefined,
        read: async () => ({
          scope,
          schemaVersion: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
          revision: 'revision-dvt-preview-1',
          draftPayload: draft,
          updatedAt: '2026-09-11T00:00:00.000Z',
        }),
        save: async () => {
          throw new Error('Draft writes are outside this Preview integration');
        },
      },
    });
    const targetProjectionPublisher = new DvtPostgresTargetProjectionPublisher({
      artifactStore: new FileContentAddressedArtifactStore({ rootPath: artifactRoot }),
      locateArtifact: ({ tenantId, sha256 }) =>
        locateFileContentAddressedArtifact({
          rootPath: artifactRoot,
          tenantId,
          sha256,
        }),
    });
    const dvtPreviewSelectionResolver = new ResolveAuthorizedDvtPreviewSelectionService({
      graphDraftResolver,
      targetProjectionPublisher,
      workloadProjector: new DvtOperationalWorkloadProjector(),
    });
    const previewSelectionResolver = new ResolveAuthorizedPreviewSelectionService({
      graphDraftResolver,
      dvtPreviewSelectionResolver,
      projectGraph: {
        execute: async () => {
          throw new Error('dbt projection is outside this DVT Preview');
        },
      },
    });
    const stepTypeRegistry = createDefaultStepTypeRegistry();
    const planValidator = new StoredPlanExecutabilityValidator({
      materializer: new StoredExecutablePlanResolver({
        fetcher: planStore,
        stepTypeRegistry,
      }),
      adapters: new Map([['temporal', makeAdapter([])]]),
      stepTypeRegistry,
    });
    const useCase = new PreviewPlanUseCase({
      planner,
      planStore,
      planValidator,
      previewSelectionResolver,
    });
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
    const context = {
      principal: {
        principalId: 'principal-dvt-preview-it',
        subjectId: 'principal-dvt-preview-it',
        issuer: 'issuer',
        audience: 'audience',
        principalType: 'user' as const,
        expiresAt: new Date('2030-01-01T00:00:00.000Z'),
        rawScopes: [],
        assertedTenantIds: [scope.tenantId],
        assertedProjectIds: [scope.projectId],
      },
      scope: buildEnvironmentAccessScope(
        TenantId.unsafe(scope.tenantId),
        ProjectId.unsafe(scope.projectId),
        EnvironmentId.unsafe(scope.environmentId)
      ),
      action: AUTHORIZATION_ACTION.runStart,
      requestId: 'request-dvt-preview-it',
      authorizedAt: new Date('2026-09-11T00:00:00.000Z'),
    };

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
  });
});
