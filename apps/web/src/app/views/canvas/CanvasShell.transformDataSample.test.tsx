// @vitest-environment jsdom
/** Owned concern: prove revision-safe, explicit exploratory preview without publishing a Model. */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  TRANSFORM_DATA_SAMPLE_DEFAULT_LIMIT,
  TransformDataSampleRequestSchema,
} from '@dvt/contracts';
import { buildSemanticWorkbenchFixture } from '../../labs/semanticWorkbenchFixture';
import { CanvasModelDataView, type CanvasModelPreviewPreparation } from './CanvasModelDataView';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';

describe('Model data preview', () => {
  let container: HTMLDivElement;
  let root: Root;
  const fixture = buildSemanticWorkbenchFixture();
  const digest = readDvtTransformAuthoringAuthority(fixture.transform)!.semanticDocument
    .semanticPlan.sha256;
  const sample = {
    contractVersion: 1 as const,
    canvasId: 'canvas-test',
    transformNodeId: fixture.transform.id,
    draftRevision: 'revision-7',
    semanticPlanSha256: digest,
    columns: [{ name: 'order_id', type: 'integer', nullable: false }],
    rows: [{ values: ['42'] }],
    limit: TRANSFORM_DATA_SAMPLE_DEFAULT_LIMIT,
    truncated: false,
    sampledAt: '2026-09-17T10:00:00.000Z',
  };
  const query = { previewTransformRows: vi.fn().mockResolvedValue(sample) };
  const prepare = vi.fn<CanvasModelPreviewPreparation>().mockResolvedValue({
    ok: true,
    canonicalNodes: [...fixture.sources, fixture.transform],
    canonicalEdges: fixture.edges,
    workspaceNodeIds: [...fixture.sources, fixture.transform].map((node) => node.id),
  });
  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    vi.clearAllMocks();
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });
  function render(
    semanticDigest = digest,
    canEditModel = true,
    unresolvedInputs: readonly { label: string; state: 'pending' | 'missing' }[] = []
  ): void {
    act(() =>
      root.render(
        <CanvasModelDataView
          canvasId="canvas-test"
          nodeId={fixture.transform.id}
          nodeName="Sales"
          semanticDigest={semanticDigest}
          canEditModel={canEditModel}
          query={query}
          preparePreview={prepare}
          copy={resolveCanvasSemanticEditorCopy('en')}
          unresolvedInputs={unresolvedInputs}
        />
      )
    );
  }
  async function preview(): Promise<void> {
    await act(async () =>
      container.querySelector<HTMLButtonElement>('[data-slot="canvas-model-preview"]')!.click()
    );
  }
  it('does not query on navigation; flushes the applied draft before requesting rows', async () => {
    render();
    expect(query.previewTransformRows).not.toHaveBeenCalled();
    await preview();
    expect(prepare).toHaveBeenCalledOnce();
    expect(query.previewTransformRows).toHaveBeenCalledWith({
      canvasId: 'canvas-test',
      transformNodeId: fixture.transform.id,
      limit: TRANSFORM_DATA_SAMPLE_DEFAULT_LIMIT,
    });
    expect(
      TransformDataSampleRequestSchema.safeParse(query.previewTransformRows.mock.calls[0]?.[0])
        .success
    ).toBe(true);
    expect(prepare.mock.invocationCallOrder[0]).toBeLessThan(
      query.previewTransformRows.mock.invocationCallOrder[0]!
    );
    expect(container.textContent).toContain('42');
  });
  it('retains old rows and marks them stale after a new canonical Apply', async () => {
    render();
    await preview();
    render('b'.repeat(64));
    expect(container.textContent).toContain('42');
    expect(container.querySelector('[data-slot="canvas-model-data-stale"]')?.textContent).toContain(
      'Out of date'
    );
    expect(query.previewTransformRows).toHaveBeenCalledOnce();
  });
  it('does not query after a persistence conflict', async () => {
    prepare.mockResolvedValueOnce({ ok: false, message: 'Conflict' });
    render();
    await preview();
    expect(query.previewTransformRows).not.toHaveBeenCalled();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('could not be saved');
  });
  it('names unresolved sources instead of issuing a known-incomplete preview', async () => {
    render(digest, true, [
      { label: 'orders', state: 'pending' },
      { label: 'old_clients', state: 'missing' },
    ]);
    await preview();
    expect(
      container.querySelector<HTMLButtonElement>('[data-slot="canvas-model-preview"]')?.disabled
    ).toBe(true);
    expect(
      container.querySelector('[data-slot="canvas-model-unresolved-inputs"]')?.textContent
    ).toContain('orders');
    expect(container.textContent).toContain('old_clients');
    expect(query.previewTransformRows).not.toHaveBeenCalled();
    expect(prepare).not.toHaveBeenCalled();
  });
  it('explores a read-only Model without attempting any draft write', async () => {
    render(digest, false);
    await preview();
    expect(prepare).not.toHaveBeenCalled();
    expect(query.previewTransformRows).toHaveBeenCalledOnce();
    expect(container.textContent).toContain('42');
  });
  it('rejects rows from another Model or a different revision', async () => {
    query.previewTransformRows.mockResolvedValueOnce({ ...sample, transformNodeId: 'other-model' });
    render();
    await preview();
    expect(container.querySelector('table')).toBeNull();
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
  });
  it('keeps the prior result when a refresh fails', async () => {
    render();
    await preview();
    query.previewTransformRows.mockRejectedValueOnce(new Error('Unavailable'));
    await preview();
    expect(container.textContent).toContain('42');
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
  });
});
