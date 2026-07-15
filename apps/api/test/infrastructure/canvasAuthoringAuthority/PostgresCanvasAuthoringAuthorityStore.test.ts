import { randomUUID } from 'node:crypto';
import process from 'node:process';

import { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { WorkspaceGraphDraftSaveStoreResult } from '../../../src/application/ports/workspaceGraphDraft.js';
import { resolveWorkspaceGraphDraftCanvasIds } from '../../../src/application/ports/workspaceGraphDraft.js';
import { PostgresCanvasAuthoringAuthorityStore } from '../../../src/infrastructure/canvasAuthoringAuthority/PostgresCanvasAuthoringAuthorityStore.js';
import { PostgresWorkspaceGraphDraftStore } from '../../../src/infrastructure/workspaceGraphDraft/PostgresWorkspaceGraphDraftStore.js';
import { buildWorkspaceGraphDraftSaveRequest } from '../../fixtures/workspaceGraphDraftFixture.js';

const databaseUrl = process.env['DVT_PG_URL'] ?? process.env['DATABASE_URL'];
const describeWithPostgres = databaseUrl ? describe : describe.skip;
const schema = `it_canvas_authority_${randomUUID().replaceAll('-', '')}`;
const pool = databaseUrl ? new Pool({ connectionString: databaseUrl }) : null;
const store = pool
  ? new PostgresCanvasAuthoringAuthorityStore({ pool, schema, queryTimeoutMs: 5_000 })
  : null;
const draftStore = pool
  ? new PostgresWorkspaceGraphDraftStore({ pool, schema, queryTimeoutMs: 5_000 })
  : null;

const KEY = {
  tenantId: 'tenant-a',
  projectId: 'project-a',
  environmentId: 'dev',
  canvasId: 'orders-canvas',
} as const;
const BINDING = {
  schemaVersion: 'canvas-authoring-authority-binding.v1' as const,
  canvasId: KEY.canvasId,
  authority: { kind: 'dbt-project-files' as const, projectRoot: 'analytics' },
};

describeWithPostgres('PostgresCanvasAuthoringAuthorityStore', () => {
  beforeAll(async () => {
    await draftStore!.migrate();
    await store!.migrate();
  });

  afterAll(async () => {
    await pool!.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await pool!.end();
  });

  beforeEach(async () => {
    await pool!.query(`TRUNCATE TABLE "${schema}".canvas_authoring_authorities CASCADE`);
    await pool!.query(
      `TRUNCATE TABLE "${schema}".workspace_graph_draft_idempotency, "${schema}".workspace_graph_drafts CASCADE`
    );
  });

  it('isolates authority records by tenant, project, environment, and Canvas', async () => {
    await expect(
      store!.bind({
        key: KEY,
        binding: BINDING,
        idempotencyKey: 'bind-orders',
        requestHash: 'request-a',
        revision: 'authority-1',
        nowIso: '2026-07-14T10:00:00.000Z',
      })
    ).resolves.toMatchObject({ kind: 'bound', deduplicated: false });

    await expect(store!.read(KEY)).resolves.toMatchObject({ binding: BINDING });
    await expect(store!.read({ ...KEY, tenantId: 'tenant-b' })).resolves.toBeNull();
    await expect(store!.read({ ...KEY, canvasId: 'other-canvas' })).resolves.toBeNull();
  });

  it('rejects rebinding an occupied Canvas instead of overwriting authority', async () => {
    await bindOrders();
    const result = await store!.bind({
      key: KEY,
      binding: { ...BINDING, authority: { kind: 'dbt-project-files', projectRoot: 'finance' } },
      idempotencyKey: 'bind-finance',
      requestHash: 'request-b',
      revision: 'authority-2',
      nowIso: '2026-07-14T10:01:00.000Z',
    });

    expect(result).toMatchObject({
      kind: 'conflict',
      current: { binding: BINDING, revision: 'authority-1' },
    });
    await expect(store!.read(KEY)).resolves.toMatchObject({ binding: BINDING });
  });

  it('deduplicates an identical key and rejects an idempotency-key mismatch', async () => {
    await bindOrders();
    await expect(
      store!.bind({
        key: KEY,
        binding: BINDING,
        idempotencyKey: 'bind-orders',
        requestHash: 'request-a',
        revision: 'authority-ignored',
        nowIso: '2026-07-14T10:02:00.000Z',
      })
    ).resolves.toMatchObject({
      kind: 'bound',
      deduplicated: true,
      record: { revision: 'authority-1' },
    });

    await expect(
      store!.bind({
        key: KEY,
        binding: BINDING,
        idempotencyKey: 'bind-orders',
        requestHash: 'different-request',
        revision: 'authority-3',
        nowIso: '2026-07-14T10:03:00.000Z',
      })
    ).resolves.toEqual({ kind: 'idempotency_mismatch' });
  });

  it('conditionally releases only the binding created by the matching command', async () => {
    await bindOrders();
    await expect(
      store!.release({
        key: KEY,
        expectedRevision: 'stale-revision',
        idempotencyKey: 'bind-orders',
        requestHash: 'request-a',
      })
    ).resolves.toMatchObject({ kind: 'conflict', currentRevision: 'authority-1' });

    await expect(
      store!.release({
        key: KEY,
        expectedRevision: 'authority-1',
        idempotencyKey: 'bind-orders',
        requestHash: 'request-a',
      })
    ).resolves.toEqual({ kind: 'released' });
    await expect(store!.read(KEY)).resolves.toBeNull();
  });

  it('serializes concurrent attempts so exactly one authority wins', async () => {
    const [first, second] = await Promise.all([
      store!.bind({
        key: KEY,
        binding: BINDING,
        idempotencyKey: 'bind-orders-a',
        requestHash: 'request-a',
        revision: 'authority-a',
        nowIso: '2026-07-14T10:00:00.000Z',
      }),
      store!.bind({
        key: KEY,
        binding: { ...BINDING, authority: { kind: 'dbt-project-files', projectRoot: 'finance' } },
        idempotencyKey: 'bind-orders-b',
        requestHash: 'request-b',
        revision: 'authority-b',
        nowIso: '2026-07-14T10:00:00.000Z',
      }),
    ]);

    expect([first.kind, second.kind].sort()).toEqual(['bound', 'conflict']);
  });

  it('rejects file authority when the same Canvas is already owned by the graph draft', async () => {
    await saveOrdersDraft();

    await expect(
      store!.bind({
        key: KEY,
        binding: BINDING,
        idempotencyKey: 'bind-after-draft',
        requestHash: 'request-after-draft',
        revision: 'authority-after-draft',
        nowIso: '2026-07-14T10:04:00.000Z',
      })
    ).resolves.toEqual({ kind: 'canvas_occupied' });
  });

  it('rejects a graph draft save when the same Canvas has file authority', async () => {
    await bindOrders();

    await expect(saveOrdersDraft()).resolves.toEqual({
      kind: 'authoring_authority_conflict',
      canvasIds: [KEY.canvasId],
    });
  });

  it('rejects the complete multi-Canvas aggregate when a secondary Canvas has file authority', async () => {
    await bindOrders();
    const baseline = buildWorkspaceGraphDraftSaveRequest();
    const primaryCanvasId = 'canvas-primary';
    const draft = {
      ...baseline.draft,
      canvas: { ...baseline.draft.canvas, id: primaryCanvasId },
      activeCanvasId: primaryCanvasId,
      canvases: [
        {
          canvas: { ...baseline.draft.canvas, id: primaryCanvasId },
          nodeIds: baseline.draft.nodeIds,
          nodePositions: baseline.draft.nodePositions,
          nodes: baseline.draft.nodes,
          edges: baseline.draft.edges,
        },
        {
          canvas: { ...baseline.draft.canvas, id: KEY.canvasId },
          nodeIds: [],
          nodePositions: {},
          nodes: [],
          edges: [],
        },
      ],
    };

    await expect(
      draftStore!.save({
        scope: {
          tenantId: KEY.tenantId,
          projectId: KEY.projectId,
          environmentId: KEY.environmentId,
        },
        schemaVersion: baseline.schemaVersion,
        expectedRevision: baseline.expectedRevision,
        idempotencyKey: 'draft-multi-canvas',
        draft,
        canvasIds: resolveWorkspaceGraphDraftCanvasIds(draft),
        requestHash: 'draft-multi-canvas',
        revision: 'revision-multi-canvas',
        nowIso: '2026-07-14T10:04:30.000Z',
      })
    ).resolves.toEqual({
      kind: 'authoring_authority_conflict',
      canvasIds: [KEY.canvasId],
    });
  });

  it('serializes concurrent draft and file-authority claims so only one owner wins', async () => {
    const [binding, draft] = await Promise.all([
      store!.bind({
        key: KEY,
        binding: BINDING,
        idempotencyKey: 'bind-concurrent-owner',
        requestHash: 'request-concurrent-owner',
        revision: 'authority-concurrent-owner',
        nowIso: '2026-07-14T10:05:00.000Z',
      }),
      saveOrdersDraft(),
    ]);

    const authorityWon = binding.kind === 'bound' && draft.kind === 'authoring_authority_conflict';
    const draftWon = binding.kind === 'canvas_occupied' && draft.kind === 'saved';
    expect(authorityWon || draftWon).toBe(true);
  });
});

async function bindOrders(): Promise<void> {
  const result = await store!.bind({
    key: KEY,
    binding: BINDING,
    idempotencyKey: 'bind-orders',
    requestHash: 'request-a',
    revision: 'authority-1',
    nowIso: '2026-07-14T10:00:00.000Z',
  });
  expect(result).toMatchObject({ kind: 'bound', deduplicated: false });
}

async function saveOrdersDraft(): Promise<WorkspaceGraphDraftSaveStoreResult> {
  const baseline = buildWorkspaceGraphDraftSaveRequest();
  const request = buildWorkspaceGraphDraftSaveRequest({
    scope: {
      tenantId: KEY.tenantId,
      projectId: KEY.projectId,
      environmentId: KEY.environmentId,
    },
    draft: {
      ...baseline.draft,
      canvas: {
        ...baseline.draft.canvas,
        id: KEY.canvasId,
      },
      activeCanvasId: KEY.canvasId,
    },
  });
  return draftStore!.save({
    scope: request.scope,
    schemaVersion: request.schemaVersion,
    expectedRevision: request.expectedRevision,
    idempotencyKey: request.idempotencyKey,
    draft: request.draft,
    canvasIds: [KEY.canvasId],
    requestHash: `draft-${request.idempotencyKey}`,
    revision: `revision-${request.idempotencyKey}`,
    nowIso: '2026-07-14T10:00:00.000Z',
  });
}
