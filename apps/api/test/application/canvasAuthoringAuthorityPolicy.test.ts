import type { WorkspaceGraphAuthoringDraft } from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import type {
  CanvasAuthoringAuthorityKey,
  ICanvasAuthoringAuthorityStore,
} from '../../src/application/ports/canvasAuthoringAuthority.js';
import type { IWorkspaceGraphDraftStore } from '../../src/application/ports/workspaceGraphDraft.js';
import {
  CanvasAuthoringAuthorityMissingError,
  CanvasAuthoringAuthorityMixedError,
  CanvasAuthoringAuthorityPolicy,
} from '../../src/application/services/canvasAuthoringAuthorityPolicy.js';
import { buildWorkspaceGraphDraft } from '../fixtures/workspaceGraphDraftFixture.js';

const KEY: CanvasAuthoringAuthorityKey = {
  tenantId: 'tenant-a',
  projectId: 'project-a',
  environmentId: 'dev',
  canvasId: 'orders-canvas',
};

function storeWithRead(
  read: ICanvasAuthoringAuthorityStore['read'],
  readFileAuthorityByProjectRoot: ICanvasAuthoringAuthorityStore['readFileAuthorityByProjectRoot'] = vi
    .fn()
    .mockResolvedValue(null)
): ICanvasAuthoringAuthorityStore {
  return {
    migrate: vi.fn(),
    close: vi.fn(),
    read,
    readFileAuthorityByProjectRoot,
    withGraphArtifactPublicationLock: vi.fn(async (_input, operation) => operation()),
    bind: vi.fn(),
    release: vi.fn(),
  };
}

function draftStoreWithCanvas(hasCanvas: boolean): Pick<IWorkspaceGraphDraftStore, 'read'> {
  return hasCanvas
    ? draftStoreWithDraft(
        buildWorkspaceGraphDraft({
          canvas: {
            id: KEY.canvasId,
            kind: 'transformation',
            title: 'Orders',
          },
        })
      )
    : { read: vi.fn().mockResolvedValue(null) };
}

function draftStoreWithDraft(
  draftPayload: WorkspaceGraphAuthoringDraft
): Pick<IWorkspaceGraphDraftStore, 'read'> {
  return {
    read: vi.fn().mockResolvedValue({
      scope: KEY,
      schemaVersion: 'workspace-graph-draft.v1',
      revision: 'draft-1',
      draftPayload,
      updatedAt: '2026-07-14T10:00:00.000Z',
    }),
  };
}

describe('CanvasAuthoringAuthorityPolicy', () => {
  it('resolves graph authority only when the persisted graph draft owns the Canvas', async () => {
    const read = vi.fn().mockResolvedValue(null);
    const policy = new CanvasAuthoringAuthorityPolicy(
      storeWithRead(read),
      draftStoreWithCanvas(true)
    );

    await expect(policy.resolve(KEY)).resolves.toEqual({
      schemaVersion: 'canvas-authoring-authority-binding.v1',
      canvasId: 'orders-canvas',
      authority: { kind: 'graph-draft' },
    });
    expect(read).toHaveBeenCalledWith(KEY);
  });

  it('returns the persisted file authority without accepting caller authority', async () => {
    const binding = {
      schemaVersion: 'canvas-authoring-authority-binding.v1' as const,
      canvasId: 'orders-canvas',
      authority: { kind: 'dbt-project-files' as const, projectRoot: 'analytics' },
    };
    const policy = new CanvasAuthoringAuthorityPolicy(
      storeWithRead(
        vi.fn().mockResolvedValue({
          key: KEY,
          binding,
          revision: 'authority-1',
          updatedAt: '2026-07-14T10:00:00.000Z',
        })
      ),
      draftStoreWithCanvas(false)
    );

    await expect(policy.resolve(KEY)).resolves.toEqual(binding);
  });

  it('fails closed when neither persisted authority fact owns the Canvas', async () => {
    const policy = new CanvasAuthoringAuthorityPolicy(
      storeWithRead(vi.fn().mockResolvedValue(null)),
      draftStoreWithCanvas(false)
    );

    await expect(policy.resolve(KEY)).rejects.toBeInstanceOf(CanvasAuthoringAuthorityMissingError);
  });

  it('fails closed when graph and file authority facts both own the Canvas', async () => {
    const policy = new CanvasAuthoringAuthorityPolicy(
      storeWithRead(
        vi.fn().mockResolvedValue({
          key: KEY,
          binding: {
            schemaVersion: 'canvas-authoring-authority-binding.v1',
            canvasId: KEY.canvasId,
            authority: { kind: 'dbt-project-files', projectRoot: 'analytics' },
          },
          revision: 'authority-1',
          updatedAt: '2026-07-14T10:00:00.000Z',
        })
      ),
      draftStoreWithCanvas(true)
    );

    await expect(policy.resolve(KEY)).rejects.toBeInstanceOf(CanvasAuthoringAuthorityMixedError);
  });

  it('reports mixed authority when a graph draft read observes a persisted binding', async () => {
    const policy = new CanvasAuthoringAuthorityPolicy(
      storeWithRead(
        vi.fn().mockResolvedValue({
          key: KEY,
          binding: {
            schemaVersion: 'canvas-authoring-authority-binding.v1',
            canvasId: KEY.canvasId,
            authority: { kind: 'dbt-project-files', projectRoot: 'analytics' },
          },
          revision: 'authority-1',
          updatedAt: '2026-07-14T10:00:00.000Z',
        })
      ),
      draftStoreWithCanvas(true)
    );

    await expect(policy.resolveGraphDraftReadAuthority(KEY)).resolves.toEqual({
      kind: 'unresolved',
      reason: 'mixed_authority',
      canvasId: KEY.canvasId,
    });
  });

  it('refuses graph publication when another file-authoritative Canvas owns the project root', async () => {
    const policy = new CanvasAuthoringAuthorityPolicy(
      storeWithRead(
        vi.fn().mockResolvedValue(null),
        vi.fn().mockResolvedValue({
          key: { ...KEY, canvasId: 'imported-project' },
          binding: {
            schemaVersion: 'canvas-authoring-authority-binding.v1',
            canvasId: 'imported-project',
            authority: { kind: 'dbt-project-files', projectRoot: '.' },
          },
          revision: 'authority-2',
          updatedAt: '2026-07-14T10:00:00.000Z',
        })
      ),
      draftStoreWithCanvas(true)
    );

    await expect(policy.authorizeGraphArtifactPublication(KEY, '.')).resolves.toEqual({
      kind: 'refused',
      reason: 'dbt_project_files_authority',
    });
  });

  it('keeps every retained Canvas under graph-draft authority', async () => {
    const graphShape = buildWorkspaceGraphDraft();
    const staleCanvas = {
      canvas: {
        id: KEY.canvasId,
        kind: 'transformation',
        title: 'Orders',
      },
      nodeIds: graphShape.nodeIds,
      nodePositions: graphShape.nodePositions,
      nodes: graphShape.nodes,
      edges: graphShape.edges,
    };
    const activeCanvas = {
      ...staleCanvas,
      canvas: {
        ...staleCanvas.canvas,
        id: 'customers-canvas',
        title: 'Customers',
      },
    };
    const policy = new CanvasAuthoringAuthorityPolicy(
      storeWithRead(vi.fn().mockResolvedValue(null)),
      draftStoreWithDraft(
        buildWorkspaceGraphDraft({
          canvas: activeCanvas.canvas,
          activeCanvasId: activeCanvas.canvas.id,
          canvases: [staleCanvas, activeCanvas],
        })
      )
    );

    await expect(policy.authorizeGraphArtifactPublication(KEY, '.')).resolves.toMatchObject({
      kind: 'allowed',
      binding: { canvasId: KEY.canvasId, authority: { kind: 'graph-draft' } },
    });
  });

  it('accepts the legacy canvas id only when activeCanvasId is absent', async () => {
    const policy = new CanvasAuthoringAuthorityPolicy(
      storeWithRead(vi.fn().mockResolvedValue(null)),
      draftStoreWithDraft(
        buildWorkspaceGraphDraft({
          canvas: {
            id: KEY.canvasId,
            kind: 'transformation',
            title: 'Orders',
          },
        })
      )
    );

    await expect(policy.authorizeGraphArtifactPublication(KEY, '.')).resolves.toMatchObject({
      kind: 'allowed',
    });
  });

  it('returns explicit missing and mixed publication refusals', async () => {
    const missing = new CanvasAuthoringAuthorityPolicy(
      storeWithRead(vi.fn().mockResolvedValue(null)),
      draftStoreWithCanvas(false)
    );
    const mixed = new CanvasAuthoringAuthorityPolicy(
      storeWithRead(
        vi.fn().mockResolvedValue({
          key: KEY,
          binding: {
            schemaVersion: 'canvas-authoring-authority-binding.v1',
            canvasId: KEY.canvasId,
            authority: { kind: 'dbt-project-files', projectRoot: '.' },
          },
          revision: 'authority-1',
          updatedAt: '2026-07-14T10:00:00.000Z',
        })
      ),
      draftStoreWithCanvas(true)
    );

    await expect(missing.authorizeGraphArtifactPublication(KEY, '.')).resolves.toEqual({
      kind: 'refused',
      reason: 'missing_authority',
    });
    await expect(mixed.authorizeGraphArtifactPublication(KEY, '.')).resolves.toEqual({
      kind: 'refused',
      reason: 'mixed_authority',
    });
  });

  it('holds the authority boundary for the complete authorized publication', async () => {
    const publicationLock = vi.fn();
    const store = storeWithRead(vi.fn().mockResolvedValue(null));
    store.withGraphArtifactPublicationLock = async (input, operation) => {
      publicationLock(input, operation);
      return operation();
    };
    const policy = new CanvasAuthoringAuthorityPolicy(store, draftStoreWithCanvas(true));

    await expect(
      policy.runAuthorizedGraphArtifactPublication(KEY, '.', async () => 'published')
    ).resolves.toEqual({
      kind: 'executed',
      value: 'published',
    });
    expect(publicationLock).toHaveBeenCalledWith(
      { key: KEY, projectRoot: '.' },
      expect.any(Function)
    );
  });

  it('fails closed when persistence cannot resolve authority', async () => {
    const policy = new CanvasAuthoringAuthorityPolicy(
      storeWithRead(vi.fn().mockRejectedValue(new Error('authority store unavailable'))),
      draftStoreWithCanvas(false)
    );

    await expect(policy.resolve(KEY)).rejects.toThrow('authority store unavailable');
  });
});
