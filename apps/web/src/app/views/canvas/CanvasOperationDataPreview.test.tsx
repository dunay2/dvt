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
import { CanvasRelationalTreeEditorFrame } from './CanvasRelationalTreeEditorFrame';

describe('selected operation data preview', () => {
  let container: HTMLDivElement;
  let root: Root;
  let dataHost: HTMLDivElement;
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
    dataHost = document.createElement('div');
    document.body.appendChild(dataHost);
    query.previewTransformRows.mockReset();
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    dataHost.remove();
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
  it('portals one preview to the bottom host, retains it across inspector tabs and removes hidden frames', async () => {
    const onOpenData = vi.fn();
    const renderDock = (hidden = false): void => {
      act(() =>
        root.render(
          <CanvasOperationPreviewProvider
            ports={{ canvasId: 'canvas-test', query, dataHost, onOpenData }}
            nodeId="model"
            semanticDigest={digest}
            canEditModel={false}
            unapplied={false}
          >
            <CanvasRelationalTreeEditorFrame
              operation="inner_join"
              relationId="join-1"
              hidden={hidden}
              onClose={() => undefined}
            >
              <input aria-label="Property" defaultValue="draft" />
            </CanvasRelationalTreeEditorFrame>
            <CanvasRelationalTreeEditorFrame
              operation="inner_join"
              relationId="join-2"
              hidden
              onClose={() => undefined}
            >
              <span>Inactive editor</span>
            </CanvasRelationalTreeEditorFrame>
          </CanvasOperationPreviewProvider>
        )
      );
    };
    query.previewTransformRows.mockResolvedValue(sample('join-1'));
    renderDock();
    expect(onOpenData).toHaveBeenCalledOnce();
    expect(query.previewTransformRows).not.toHaveBeenCalled();
    expect(container.querySelector('[data-slot="canvas-operation-data-preview"]')).toBeNull();
    expect(dataHost.querySelectorAll('[data-slot="canvas-operation-data-preview"]')).toHaveLength(
      1
    );
    await act(async () =>
      dataHost.querySelector<HTMLButtonElement>('[data-slot="canvas-model-preview"]')!.click()
    );
    const table = dataHost.querySelector('table');
    expect(table?.textContent).toContain('intermediate-result');
    act(() =>
      container
        .querySelector('[data-slot="canvas-operation-tree-tab"]')!
        .dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    );
    expect(dataHost.querySelector('table')).toBe(table);
    expect(query.previewTransformRows).toHaveBeenCalledOnce();
    renderDock(true);
    expect(dataHost.childElementCount).toBe(0);
    expect(onOpenData).toHaveBeenCalledOnce();
  });
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
