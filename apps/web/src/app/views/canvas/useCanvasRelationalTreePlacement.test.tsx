/** Applied and staged cards share disclosure geometry without changing their documents. */
import React, { act } from 'react';
import { describe, expect, it } from 'vitest';
import { RelationalLayoutSession } from './relational-layout/RelationalLayoutSession';
import {
  expressionStageDraft,
  projectExpressionStage,
} from './canvasRelationalExpressionStage.test-support';
import { configureCanvasStagedTransform } from './canvasStagedTransformConfiguration';
import { useCanvasRelationalTreePlacement } from './useCanvasRelationalTreePlacement';
import { setupWorkbenchTest, root } from './CanvasRelationalTreeWorkbench.test-support';
import type { CanvasRelationalTreePlacedNode } from './canvasRelationalTreeGeometry';

describe('relational tree placement disclosure', () => {
  setupWorkbenchTest();
  it('keeps configured staged cards compact until expanded and restores size after zoom', async () => {
    const document = expressionStageDraft();
    const { node: transformNode, projection } = projectExpressionStage(document);
    const staged = await configureCanvasStagedTransform(
      {
        id: 'pending-operation:placement',
        operation: 'field_transform',
        inputs: [projection.root.relationId!],
      },
      document,
      projection.root.output.fields[0]!.fieldId
    );
    const before = structuredClone(staged);
    let placement!: ReturnType<typeof useCanvasRelationalTreePlacement>;
    function Host({ zoom }: { zoom: number }): null {
      placement = useCanvasRelationalTreePlacement({
        root: projection.root,
        semanticContext: { transformNode, draft: document },
        stagedOperations: [staged],
        zoom,
        panMode: false,
      });
      return null;
    }
    const render = async (zoom: number): Promise<void> => {
      await act(async () =>
        root.render(
          <RelationalLayoutSession>
            <Host zoom={zoom} />
          </RelationalLayoutSession>
        )
      );
    };
    await render(1);
    const placed = (): CanvasRelationalTreePlacedNode =>
      placement.layout.nodes.find(({ node }) => node.relationId === staged.id)!;
    expect(placed()).toMatchObject({ width: 224, height: 76 });
    act(() => placement.toggleDetail(staged.id));
    expect(placed().height).toBeGreaterThan(76);
    act(() => placement.toggleDetail(staged.id));
    expect(placed()).toMatchObject({ width: 224, height: 76 });
    await render(2);
    expect(placed().height).toBeGreaterThan(76);
    await render(1);
    expect(placed()).toMatchObject({ width: 224, height: 76 });
    expect(staged).toEqual(before);
  });
});
