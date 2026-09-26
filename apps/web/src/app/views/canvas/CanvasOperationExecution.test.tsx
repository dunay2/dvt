// @vitest-environment jsdom
/** Real card actions own data requests; the Properties frame never owns their lifecycle. */
import { act, Fragment, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { TransformDataSampleResponseSchema } from '@dvt/contracts';
import { CanvasOperationPreviewProvider } from './CanvasOperationDataPreview';
import { CanvasRelationalTreeEditorFrame } from './CanvasRelationalTreeEditorFrame';
import { CanvasRelationalTreeLayout } from './CanvasRelationalTreeLayout';
import { RelationalLayoutSession } from './relational-layout/RelationalLayoutSession';
import type { CanvasRelationalTreeNode } from './canvasRelationalTreeProjection';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';

it.each([false, true])(
  'executes the exact card without replay after closing Properties or invalidation (StrictMode: %s)',
  async (strict) => {
    const Mode = strict ? StrictMode : Fragment;
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    const container = document.createElement('div');
    const dataHost = document.createElement('div');
    document.body.append(container, dataHost);
    const root = createRoot(container);
    const digest = 'a'.repeat(64);
    const onOpenData = vi.fn();
    const query = {
      previewTransformRows: vi.fn().mockResolvedValue(
        TransformDataSampleResponseSchema.parse({
          contractVersion: 1,
          canvasId: 'canvas-test',
          transformNodeId: 'model',
          relationId: 'join-1',
          semanticPlanSha256: digest,
          draftRevision: 'r7',
          columns: [{ name: 'id', type: 'integer', nullable: false }],
          rows: [{ values: ['intermediate-result'] }],
          limit: 20,
          truncated: false,
          sampledAt: '2026-09-22T00:00:00.000Z',
        })
      ),
    };
    const node: CanvasRelationalTreeNode = {
      locator: 'rel:join-1',
      relationId: 'join-1',
      operator: 'join',
      substraitKind: 'join',
      operation: 'inner_join',
      displayName: 'a+b',
      sourceRef: null,
      output: { fields: [] },
      expressionRefs: [],
      decorations: [],
      children: [],
    };
    const render = (hidden = false, unapplied = false, semanticDigest = digest): void => {
      act(() =>
        root.render(
          <Mode>
            <CanvasOperationPreviewProvider
              ports={{ canvasId: 'canvas-test', query, dataHost, onOpenData }}
              nodeId="model"
              semanticDigest={semanticDigest}
              canEditModel={false}
              unapplied={unapplied}
            >
              <RelationalLayoutSession>
                <CanvasRelationalTreeLayout
                  root={node}
                  outputName="Model"
                  selectedLocator={node.locator}
                  copy={resolveCanvasViewCopy('en')}
                  onSelect={vi.fn()}
                />
              </RelationalLayoutSession>
              <CanvasRelationalTreeEditorFrame
                operation="inner_join"
                relationId={node.relationId}
                hidden={hidden}
                onClose={() => undefined}
              >
                <input aria-label="Property" />
              </CanvasRelationalTreeEditorFrame>
            </CanvasOperationPreviewProvider>
          </Mode>
        )
      );
    };
    const execute = async (): Promise<void> => {
      await act(async () =>
        container.querySelector<HTMLButtonElement>('[data-slot="canvas-node-execute"]')!.click()
      );
    };
    try {
      render();
      expect(onOpenData).not.toHaveBeenCalled();
      expect(query.previewTransformRows).not.toHaveBeenCalled();
      expect(dataHost.childElementCount).toBe(0);
      await execute();
      expect(onOpenData).toHaveBeenCalledOnce();
      expect(query.previewTransformRows).toHaveBeenCalledExactlyOnceWith({
        canvasId: 'canvas-test',
        transformNodeId: 'model',
        relationId: 'join-1',
        semanticPlanSha256: digest,
        limit: 20,
      });
      const table = dataHost.querySelector('table');
      expect(table?.textContent).toContain('intermediate-result');
      expect(container.querySelector('[data-slot="canvas-operation-data-preview"]')).toBeNull();
      render(true);
      expect(dataHost.querySelector('table')).toBe(table);
      render(true, true);
      expect(dataHost.childElementCount).toBe(0);
      await execute();
      expect(query.previewTransformRows).toHaveBeenCalledOnce();
      render(true);
      expect(dataHost.childElementCount).toBe(0);
      expect(query.previewTransformRows).toHaveBeenCalledOnce();
      await execute();
      expect(query.previewTransformRows).toHaveBeenCalledTimes(2);
      render(true, false, 'b'.repeat(64));
      render(true);
      expect(query.previewTransformRows).toHaveBeenCalledTimes(2);
      expect(dataHost.childElementCount).toBe(0);
    } finally {
      act(() => root.unmount());
      container.remove();
      dataHost.remove();
      vi.unstubAllGlobals();
    }
  }
);
