// @vitest-environment jsdom
/** Source cards use physical source identity, never a transform preview or alias-derived query. */
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { CanvasOperationPreviewProvider } from './CanvasOperationDataPreview';
import { CanvasRelationalTreeLayout } from './CanvasRelationalTreeLayout';
import { RelationalLayoutSession } from './relational-layout/RelationalLayoutSession';
import type { CanvasRelationalTreeNode } from './canvasRelationalTreeProjection';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';

it.each(['available', 'missing-reference', 'missing-port'] as const)(
  'routes a source card to its governed source query (%s)',
  (availability) => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    const onExecuteSource = vi.fn();
    const previewTransformRows = vi.fn();
    const node: CanvasRelationalTreeNode = {
      locator: 'source-locator',
      relationId: 'source-occurrence',
      operator: 'read',
      substraitKind: 'read',
      operation: 'read',
      displayName: 'Managers alias',
      output: { fields: [] },
      expressionRefs: [],
      decorations: [],
      children: [],
      sourceRef:
        availability === 'missing-reference'
          ? null
          : {
              schemaVersion: 'connected-source-ref.v1',
              connectionRef: {
                schemaVersion: 'connection-ref.v1',
                connectionId: 'warehouse',
                provider: 'postgres',
              },
              sourceObjectId: 'relation/dvt/raw/employees',
            },
    };
    try {
      act(() =>
        root.render(
          <CanvasOperationPreviewProvider
            ports={{
              canvasId: 'canvas',
              query: { previewTransformRows },
              onExecuteSource: availability === 'missing-port' ? undefined : onExecuteSource,
            }}
            nodeId="model"
            semanticDigest={null}
            canEditModel
            unapplied
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
          </CanvasOperationPreviewProvider>
        )
      );
      act(() =>
        container
          .querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-node"]')!
          .click()
      );
      expect(onExecuteSource).not.toHaveBeenCalled();
      const play = container.querySelector<HTMLButtonElement>('[data-slot="canvas-node-execute"]')!;
      expect(play.disabled).toBe(availability !== 'available');
      act(() => play.click());
      if (availability === 'available') {
        expect(onExecuteSource).toHaveBeenCalledExactlyOnceWith('model:source-occurrence', {
          connectionId: 'warehouse',
          objectId: 'relation/dvt/raw/employees',
          nodeName: 'Managers alias',
        });
      } else expect(onExecuteSource).not.toHaveBeenCalled();
      expect(previewTransformRows).not.toHaveBeenCalled();
    } finally {
      act(() => root.unmount());
      container.remove();
      vi.unstubAllGlobals();
    }
  }
);
