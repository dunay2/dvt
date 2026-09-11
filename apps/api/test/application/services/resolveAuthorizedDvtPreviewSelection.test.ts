import {
  parseExecutionSelection,
  type DvtOperationalWorkloadV1,
  type DvtProtectedWorkspaceGraphProvenance,
  type GenericGraphSourceV1,
  type WorkspaceGraphAuthoringDraft,
} from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import {
  AUTHORIZATION_ACTION,
  buildEnvironmentAccessScope,
} from '../../../src/application/ports/accessDecision.js';
import type { AuthorizedCommandExecutionContext } from '../../../src/application/ports/authContract.js';
import type { DvtOperationalWorkloadProjectionResult } from '../../../src/application/services/dvtOperationalWorkloadProjector.js';
import { ResolveAuthorizedDvtPreviewSelectionService } from '../../../src/application/services/resolveAuthorizedDvtPreviewSelection.js';
import { EnvironmentId, ProjectId, TenantId } from '../../../src/domain/auth/types.js';

const provenance: DvtProtectedWorkspaceGraphProvenance = {
  kind: 'dvt-protected-workspace-graph',
  canvasId: 'canvas-a',
};

const draft = {
  canvas: { id: 'canvas-a', kind: 'transformation', title: 'Canvas' },
  nodeIds: ['source-a', 'transform-a'],
  nodePositions: {
    'source-a': { x: 0, y: 0 },
    'transform-a': { x: 200, y: 0 },
  },
  nodes: [],
  edges: [],
} as unknown as WorkspaceGraphAuthoringDraft;

const graphSource: GenericGraphSourceV1 = {
  kind: 'generic-graph-v1',
  sourceFamily: 'dvt-operational-workloads',
  sourceVersion: '1.0',
  nodes: [
    {
      nodeId: 'transform-a',
      stepKind: 'DVT_POSTGRES_OPERATIONAL_WORKLOAD',
      dependsOn: [],
      stepTypeConfig: {} as DvtOperationalWorkloadV1,
    },
  ],
};

const targetProjection = {
  outputNodeId: 'transform-a',
  semanticPlanSha256: 'a'.repeat(64),
  connectionRef: {
    schemaVersion: 'connection-ref.v1',
    connectionId: 'warehouse-main',
    provider: 'postgres',
  },
  artifact: {
    artifactKind: 'compiled-sql' as const,
    sha256: 'b'.repeat(64),
    storageUri: `file:///artifacts/${'b'.repeat(64)}`,
    sizeBytes: 24,
    encoding: 'utf-8' as const,
  },
};

function context(): AuthorizedCommandExecutionContext {
  return {
    principal: {
      principalId: 'user-1',
      subjectId: 'user-1',
      issuer: 'issuer',
      audience: 'audience',
      principalType: 'user',
      expiresAt: new Date('2030-01-01T00:00:00.000Z'),
      rawScopes: [],
      assertedTenantIds: ['tenant-a'],
      assertedProjectIds: ['project-a'],
    },
    scope: buildEnvironmentAccessScope(
      TenantId.unsafe('tenant-a'),
      ProjectId.unsafe('project-a'),
      EnvironmentId.unsafe('env-a')
    ),
    action: AUTHORIZATION_ACTION.runStart,
    requestId: 'req-1',
    authorizedAt: new Date('2026-09-11T00:00:00.000Z'),
  };
}

function dependencies(): {
  readonly executeWithAuthorizedDraft: ReturnType<typeof vi.fn>;
  readonly publish: ReturnType<typeof vi.fn>;
  readonly project: ReturnType<typeof vi.fn>;
  readonly service: ResolveAuthorizedDvtPreviewSelectionService;
} {
  const executeWithAuthorizedDraft = vi.fn(async () => ({
    ok: true as const,
    value: {
      selection: parseExecutionSelection({ mode: 'upstream', nodeIds: ['transform-a'] }),
      nodeIds: ['source-a', 'transform-a'],
      edgeIds: ['source-transform'],
      executable: true,
      diagnostics: [],
      decisionScopeNodeIds: ['source-a', 'transform-a'],
      authorizedDraft: { revision: 'revision-7', draft },
    },
  }));
  const publish = vi.fn(async () => targetProjection);
  const project = vi.fn((): DvtOperationalWorkloadProjectionResult => ({ ok: true, graphSource }));

  return {
    executeWithAuthorizedDraft,
    publish,
    project,
    service: new ResolveAuthorizedDvtPreviewSelectionService({
      graphDraftResolver: { executeWithAuthorizedDraft } as never,
      targetProjectionPublisher: { publish } as never,
      workloadProjector: { project } as never,
    }),
  };
}

describe('ResolveAuthorizedDvtPreviewSelectionService', () => {
  it('uses one protected snapshot to publish and lower a terminal Transform workload', async () => {
    const deps = dependencies();
    const selection = parseExecutionSelection({ mode: 'upstream', nodeIds: ['transform-a'] });

    await expect(deps.service.execute({ selection, provenance }, context())).resolves.toEqual({
      ok: true,
      value: {
        graphSource,
        nodeIds: ['transform-a'],
        decisionScopeNodeIds: ['transform-a'],
        requestedRootNodeIds: ['transform-a'],
      },
    });
    expect(deps.executeWithAuthorizedDraft).toHaveBeenCalledWith({ selection }, context());
    expect(deps.publish).toHaveBeenCalledWith({
      scope: {
        tenantId: 'tenant-a',
        projectId: 'project-a',
        environmentId: 'env-a',
      },
      draft,
      selectedNodeIds: ['source-a', 'transform-a'],
      selectedEdgeIds: ['source-transform'],
    });
    expect(deps.project).toHaveBeenCalledWith({
      scope: {
        tenantId: 'tenant-a',
        projectId: 'project-a',
        environmentId: 'env-a',
      },
      draftRevision: 'revision-7',
      canvasId: 'canvas-a',
      draft,
      selectedNodeIds: ['source-a', 'transform-a'],
      selectedEdgeIds: ['source-transform'],
      targetProjection,
    });
  });

  it('rejects a stale Canvas identity before publishing SQL', async () => {
    const deps = dependencies();
    const selection = parseExecutionSelection({ mode: 'upstream', nodeIds: ['transform-a'] });

    await expect(
      deps.service.execute(
        {
          selection,
          provenance: { ...provenance, canvasId: 'canvas-stale' },
        },
        context()
      )
    ).resolves.toMatchObject({
      ok: false,
      rejection: { cause: 'dvt_preview_canvas_mismatch' },
    });
    expect(deps.publish).not.toHaveBeenCalled();
    expect(deps.project).not.toHaveBeenCalled();
  });

  it('fails closed when workload lowering rejects the protected closure', async () => {
    const deps = dependencies();
    deps.project.mockReturnValue({
      ok: false,
      reason: 'Selection must contain exactly one DVT Source and one DVT Transform.',
    });

    await expect(
      deps.service.execute(
        {
          selection: parseExecutionSelection({ mode: 'upstream', nodeIds: ['transform-a'] }),
          provenance,
        },
        context()
      )
    ).resolves.toMatchObject({
      ok: false,
      rejection: { cause: 'dvt_preview_workload_projection_failed' },
    });
  });
});
