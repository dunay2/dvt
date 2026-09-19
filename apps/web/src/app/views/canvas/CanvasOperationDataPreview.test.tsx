// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  TransformDataSampleResponseSchema,
  type TransformDataSampleResponse,
} from '@dvt/contracts';
import {
  CanvasOperationDataPreview,
  CanvasOperationPreviewProvider,
} from './CanvasOperationDataPreview';

describe('selected operation data preview', () => {
  let container: HTMLDivElement;
  let root: Root;
  const digest = 'a'.repeat(64);
  const query = { previewTransformRows: vi.fn() };
  const sample = (relationId: string): TransformDataSampleResponse =>
    TransformDataSampleResponseSchema.parse({
      contractVersion: 1,
      canvasId: 'canvas-test',
      transformNodeId: 'model',
      relationId,
      semanticPlanSha256: digest,
      draftRevision: 'r7',
      columns: [{ name: 'id', type: 'integer', nullable: false }],
      rows: [{ values: ['intermediate-result'] }],
      limit: 20,
      truncated: false,
      sampledAt: '2026-09-19T00:00:00.000Z',
    });
  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    query.previewTransformRows.mockReset();
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });
  function render(relationId: string, unapplied = false): void {
    act(() =>
      root.render(
        <CanvasOperationPreviewProvider
          ports={{ canvasId: 'canvas-test', query }}
          nodeId="model"
          semanticDigest={digest}
          canEditModel={false}
          unapplied={unapplied}
        >
          <CanvasOperationDataPreview relationId={relationId} label="INNER JOIN" />
        </CanvasOperationPreviewProvider>
      )
    );
  }
  async function preview(): Promise<void> {
    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-slot="canvas-model-preview"]')!.click();
    });
  }
  it('requests a bounded selected relation, then clears its sample on selection change', async () => {
    query.previewTransformRows.mockResolvedValue(sample('join-1'));
    render('join-1');
    expect(query.previewTransformRows).not.toHaveBeenCalled();
    await preview();
    expect(query.previewTransformRows).toHaveBeenCalledWith({
      canvasId: 'canvas-test',
      transformNodeId: 'model',
      relationId: 'join-1',
      semanticPlanSha256: digest,
      limit: 20,
    });
    expect(container.querySelector('table')?.textContent).toContain('intermediate-result');
    render('join-2');
    expect(container.querySelector('table')).toBeNull();
    expect(query.previewTransformRows).toHaveBeenCalledOnce();
  });
  it('ignores a response arriving after the selected operation changes', async () => {
    let resolve!: (result: TransformDataSampleResponse) => void;
    query.previewTransformRows.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      })
    );
    render('join-1');
    await preview();
    render('join-2');
    await act(async () => {
      resolve(sample('join-1'));
    });
    expect(container.querySelector('table')).toBeNull();
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });
  it('blocks unapplied edits and rejects data tagged with another relation', async () => {
    render('join-1', true);
    expect(
      container.querySelector<HTMLButtonElement>('[data-slot="canvas-model-preview"]')!.disabled
    ).toBe(true);
    await preview();
    expect(query.previewTransformRows).not.toHaveBeenCalled();
    render('join-1');
    query.previewTransformRows.mockResolvedValue(sample('join-2'));
    await preview();
    expect(container.querySelector('table')).toBeNull();
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
  });
});
