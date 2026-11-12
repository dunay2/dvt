/**
 * Owned concern: assemble real Preview services and fixed authorization inputs; no simulated planner or persistence.
 * @decision Extract real planner, artifact and resolver assembly without replacing services.
 * @consequence Database lifecycle and replay assertions remain owned by the integration suite.
 */
import { PostgresPlanStore } from '@dvt/adapter-postgres';
import {
  FileContentAddressedArtifactStore,
  locateFileContentAddressedArtifact,
} from '@dvt/artifacts';
import type { WorkspaceGraphAuthoringDraft, WorkspaceGraphDraftScope } from '@dvt/contracts';
import { createDefaultStepTypeRegistry } from '@dvt/contracts';
import { PlannerFacade } from '@dvt/planner';

import {
  AUTHORIZATION_ACTION,
  buildEnvironmentAccessScope,
} from '../../src/application/ports/accessDecision.js';
import type { AuthorizedCommandExecutionContext } from '../../src/application/ports/authContract.js';
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

export function buildDvtPreviewIntegrationUseCase(input: {
  readonly scope: WorkspaceGraphDraftScope;
  readonly draft: WorkspaceGraphAuthoringDraft;
  readonly artifactRoot: string;
  readonly planStore: PostgresPlanStore;
}): PreviewPlanUseCase {
  const { scope, draft, artifactRoot, planStore } = input;
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
    dbtCompilation: {
      execute: async () => {
        throw new Error('DVT authority must not compile file models');
      },
    },
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

  return useCase;
}

export function buildDvtPreviewIntegrationContext(
  scope: WorkspaceGraphDraftScope
): AuthorizedCommandExecutionContext {
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
  return context;
}
