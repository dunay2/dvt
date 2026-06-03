/** Owned concern: prove Canvas project snapshot value-object round-trip and rejection semantics. */
import { describe, expect, it } from 'vitest';

import { canvasProjectSnapshot } from './canvasProjectSnapshot';
import { buildAuthoringDraft } from './canvasDraftRepository.test.fixtures';

describe('canvasProjectSnapshot', () => {
  function buildSnapshotContents(): string {
    const draft = buildAuthoringDraft();
    return canvasProjectSnapshot.exportFile({
      record: {
        revision: 'rev-snapshot-1',
        savedAt: '2026-05-11T08:00:00.000Z',
        draft,
      },
      workspaceScope: {
        tenantId: 'tenant-a',
        projectId: 'project-a',
        environmentId: 'dev',
        targetAdapter: 'temporal',
      },
      exportedAt: '2026-05-11T08:01:00.000Z',
    }).contents;
  }

  it('round trips a versioned project snapshot with workspace metadata and Canvas identity', () => {
    const draft = buildAuthoringDraft();
    const exportResult = canvasProjectSnapshot.exportFile({
      record: {
        revision: 'rev-snapshot-1',
        savedAt: '2026-05-11T08:00:00.000Z',
        draft,
      },
      workspaceScope: {
        tenantId: 'tenant-a',
        projectId: 'project-a',
        environmentId: 'dev',
        targetAdapter: 'temporal',
      },
      exportedAt: '2026-05-11T08:01:00.000Z',
    });

    const validation = canvasProjectSnapshot.validateImport(exportResult.contents);

    expect(exportResult.fileName).toBe('main-canvas-project-snapshot.json');
    expect(validation.kind).toBe('accepted');
    if (validation.kind !== 'accepted') {
      return;
    }
    expect(validation.snapshot.project).toEqual({
      tenantId: 'tenant-a',
      projectId: 'project-a',
      environmentId: 'dev',
      targetAdapter: 'temporal',
    });
    expect(validation.snapshot.canvas).toEqual({
      kind: 'transformation',
      title: 'Main canvas',
    });
    expect(validation.snapshot.draft).toEqual(draft);
  });

  it('rejects malformed JSON before import can attempt a draft save', () => {
    expect(canvasProjectSnapshot.validateImport('{not-json').kind).toBe('rejected');
    expect(canvasProjectSnapshot.validateImport('{not-json')).toMatchObject({
      kind: 'rejected',
      reason: 'malformed_json',
    });
  });

  it('rejects unsupported project snapshot versions', () => {
    const snapshot = JSON.parse(buildSnapshotContents()) as Record<string, unknown>;

    snapshot.schemaVersion = 999;

    expect(canvasProjectSnapshot.validateImport(JSON.stringify(snapshot))).toMatchObject({
      kind: 'rejected',
      reason: 'unsupported_version',
    });
  });

  it('rejects snapshots whose draft fails the authoring aggregate schema', () => {
    const snapshot = JSON.parse(buildSnapshotContents()) as { draft: Record<string, unknown> };

    snapshot.draft.nodePositions = {};

    expect(canvasProjectSnapshot.validateImport(JSON.stringify(snapshot))).toMatchObject({
      kind: 'rejected',
      reason: 'invalid_draft',
    });
  });

  it('rejects snapshots whose declared Canvas identity disagrees with the draft', () => {
    const snapshot = JSON.parse(buildSnapshotContents()) as { canvas: { title: string } };

    snapshot.canvas.title = 'Different canvas';

    expect(canvasProjectSnapshot.validateImport(JSON.stringify(snapshot))).toMatchObject({
      kind: 'rejected',
      reason: 'canvas_identity_mismatch',
    });
  });

  it('normalizes snapshot file names from Canvas titles', () => {
    expect(canvasProjectSnapshot.buildFileName('Sales / Daily Orders')).toBe(
      'sales-daily-orders-project-snapshot.json'
    );
  });
});
