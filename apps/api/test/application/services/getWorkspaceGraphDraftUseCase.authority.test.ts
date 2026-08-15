import type { CanvasAuthoringAuthorityResolution } from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import type { IWarehouseConnectionCatalog } from '../../../src/application/ports/warehouseSourceImport.js';
import { WarehouseConnectionNotFoundError } from '../../../src/application/ports/warehouseSourceImport.js';
import type {
  IWorkspaceGraphDraftAuditPort,
  IWorkspaceGraphDraftStore,
  WorkspaceGraphDraftDecisionContext,
} from '../../../src/application/ports/workspaceGraphDraft.js';
import { GetWorkspaceGraphDraftUseCase } from '../../../src/application/services/getWorkspaceGraphDraftUseCase.js';
import { EnvironmentId, ProjectId, TenantId } from '../../../src/domain/auth/types.js';
import {
  buildWorkspaceGraphDraft,
  TEST_WORKSPACE_SCOPE,
} from '../../fixtures/workspaceGraphDraftFixture.js';

const DECISION = {
  authentication: 'authenticated',
  requestId: 'request-authority',
  correlationId: 'correlation-authority',
  decisionId: 'decision-authority',
  recordedAt: '2026-07-31T00:00:00.000Z',
  requestedScope: {
    tenantId: TenantId.unsafe(TEST_WORKSPACE_SCOPE.tenantId),
    projectId: ProjectId.unsafe(TEST_WORKSPACE_SCOPE.projectId),
    environmentId: EnvironmentId.unsafe(TEST_WORKSPACE_SCOPE.environmentId),
  },
  scope: TEST_WORKSPACE_SCOPE,
  capability: {
    scope: TEST_WORKSPACE_SCOPE,
    mode: 'writable',
    canRead: true,
    canWrite: true,
    reason: 'authorized',
  },
} as const satisfies WorkspaceGraphDraftDecisionContext;

function buildUseCase(
  canvasId: string | null,
  authority: CanvasAuthoringAuthorityResolution = {
    kind: 'resolved',
    binding: {
      schemaVersion: 'canvas-authoring-authority-binding.v1',
      canvasId: canvasId ?? 'unused-canvas',
      authority: { kind: 'graph-draft' },
    },
  },
  options: Readonly<{
    draft?: ReturnType<typeof buildWorkspaceGraphDraft>;
    connectionCatalog?: Pick<IWarehouseConnectionCatalog, 'getConnection'>;
  }> = {}
): GetWorkspaceGraphDraftUseCase {
  const store = {
    read: vi.fn(async () => ({
      scope: TEST_WORKSPACE_SCOPE,
      schemaVersion: 'workspace-graph-draft.v1',
      revision: 'revision-authority',
      draftPayload:
        options.draft ??
        buildWorkspaceGraphDraft({
          canvas: {
            ...(canvasId === null ? {} : { id: canvasId }),
            kind: 'transformation',
            title: 'Main canvas',
          },
        }),
      updatedAt: '2026-07-31T00:00:00.000Z',
    })),
  } as unknown as IWorkspaceGraphDraftStore;
  const audit = {
    record: vi.fn(async () => undefined),
  } satisfies IWorkspaceGraphDraftAuditPort;

  return new GetWorkspaceGraphDraftUseCase(
    store,
    audit,
    {
      resolveGraphDraftReadAuthority: vi.fn(async () => authority),
    },
    options.connectionCatalog ?? { getConnection: vi.fn() }
  );
}

describe('GetWorkspaceGraphDraftUseCase authoring authority', () => {
  it('returns the active graph-draft authority when the Canvas identity is explicit', async () => {
    const result = await buildUseCase('main-canvas').execute(DECISION);

    expect(result).toMatchObject({
      kind: 'response',
      httpStatus: 200,
      response: {
        kind: 'ok',
        authoringAuthority: {
          kind: 'resolved',
          binding: {
            canvasId: 'main-canvas',
            authority: { kind: 'graph-draft' },
          },
        },
      },
    });
  });

  it('returns missing authority instead of inferring a Canvas identity', async () => {
    const result = await buildUseCase(null).execute(DECISION);

    expect(result).toMatchObject({
      kind: 'response',
      httpStatus: 200,
      response: {
        kind: 'ok',
        authoringAuthority: {
          kind: 'unresolved',
          reason: 'missing_authority',
          canvasId: null,
        },
      },
    });
  });

  it('returns mixed authority reported by the canonical policy', async () => {
    const result = await buildUseCase('main-canvas', {
      kind: 'unresolved',
      reason: 'mixed_authority',
      canvasId: 'main-canvas',
    }).execute(DECISION);

    expect(result).toMatchObject({
      kind: 'response',
      httpStatus: 200,
      response: {
        kind: 'ok',
        authoringAuthority: {
          kind: 'unresolved',
          reason: 'mixed_authority',
          canvasId: 'main-canvas',
        },
      },
    });
  });

  it('replaces an imported source connection snapshot with the current catalog name', async () => {
    const draft = buildWorkspaceGraphDraft();
    const source = draft.nodes[0];
    if (!source) throw new Error('Expected source fixture.');
    const result = await buildUseCase('main-canvas', undefined, {
      draft: {
        ...draft,
        canvas: { ...draft.canvas, id: 'main-canvas' },
        nodes: [
          {
            ...source,
            pluginId: 'dvt.warehouse-source',
            kind: 'dvt:source',
            metadata: {
              ...source.metadata,
              connectionName: 'Old warehouse name',
              connectedSourceRef: {
                schemaVersion: 'connected-source-ref.v1',
                connectionRef: {
                  schemaVersion: 'connection-ref.v1',
                  connectionId: 'warehouse-prod',
                  provider: 'postgres',
                },
                sourceObjectId: 'relation/analytics/raw/orders',
              },
            },
          },
          ...draft.nodes.slice(1),
        ],
      },
      connectionCatalog: {
        getConnection: vi.fn(async () => ({
          id: 'warehouse-prod',
          name: 'Current warehouse name',
          type: 'postgres' as const,
          database: 'analytics',
          sourceObjects: [],
        })),
      },
    }).execute(DECISION);

    expect(result.response.kind).toBe('ok');
    if (result.response.kind !== 'ok') throw new Error('Expected readable graph draft.');
    expect(result.response.record.draft.nodes[0]?.metadata?.connectionName).toBe(
      'Current warehouse name'
    );
  });

  it.each([
    {
      caseName: 'the referenced catalog entry no longer exists',
      catalogError: new WarehouseConnectionNotFoundError('warehouse-deleted'),
    },
    {
      caseName: 'the auxiliary catalog cannot be read',
      catalogError: new Error('WAREHOUSE_CONNECTION_CATALOG_MALFORMED'),
    },
  ])('keeps the graph readable without a stale name when $caseName', async ({ catalogError }) => {
    const draft = buildWorkspaceGraphDraft();
    const source = draft.nodes[0];
    if (!source) throw new Error('Expected source fixture.');
    const result = await buildUseCase('main-canvas', undefined, {
      draft: {
        ...draft,
        canvas: { ...draft.canvas, id: 'main-canvas' },
        nodes: [
          {
            ...source,
            pluginId: 'dvt.warehouse-source',
            kind: 'dvt:source',
            metadata: {
              ...source.metadata,
              connectionName: 'Deleted warehouse',
              connectedSourceRef: {
                schemaVersion: 'connected-source-ref.v1',
                connectionRef: {
                  schemaVersion: 'connection-ref.v1',
                  connectionId: 'warehouse-deleted',
                  provider: 'postgres',
                },
                sourceObjectId: 'relation/analytics/raw/orders',
              },
            },
          },
          ...draft.nodes.slice(1),
        ],
      },
      connectionCatalog: {
        getConnection: vi.fn(async () => {
          throw catalogError;
        }),
      },
    }).execute(DECISION);

    expect(result.response.kind).toBe('ok');
    if (result.response.kind !== 'ok') throw new Error('Expected readable graph draft.');
    expect(result.response.record.draft.nodes[0]?.metadata).not.toHaveProperty('connectionName');
  });
});
