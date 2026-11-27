// @vitest-environment jsdom
import React, { act } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { CanvasRelationalTreeWorkbench } from './CanvasRelationalTreeWorkbench';
import { removeWorkbenchConnection } from './CanvasRelationalTreeWorkbench.gestures.test-support';
import {
  container,
  COPY,
  root,
  setupWorkbenchTest,
} from './CanvasRelationalTreeWorkbench.test-support';
import { occurrenceGraph } from './relational-source-occurrence/occurrence.test.fixtures';

const outputInspector = '[data-slot="canvas-model-output-inspector"]';
const operationEditor = '[data-slot="canvas-relational-tree-inline-editor"]:not([hidden])';

describe('Model Output in an active relational draft', () => {
  setupWorkbenchTest();

  it('keeps the operation editor mounted and inspects the connected draft without writes', async () => {
    const graph = occurrenceGraph();
    const apply = vi.fn(() => ({ outcome: 'no_changes' as const }));
    const projectTransformSql = vi.fn();
    await act(async () =>
      root.render(
        <CanvasRelationalTreeWorkbench
          transformNode={graph.targetNode}
          nodes={graph.nodes}
          edges={graph.edges}
          copy={COPY}
          authoring={{ canEditNode: true, onApplyNodeDraft: apply }}
          codeProjection={{ canvasId: 'canvas-test', query: { projectTransformSql } }}
        />
      )
    );
    await clickWorkbenchElement('[data-slot="canvas-relational-tree-node"][data-operator="join"]');
    await clickWorkbenchElement('[data-slot="canvas-relational-edit"]');
    expect(container.querySelector('[data-slot="canvas-relational-tree-draft"]')).not.toBeNull();
    const originalEditor = container.querySelector(operationEditor);
    expect(originalEditor).not.toBeNull();

    await clickWorkbenchElement('[data-slot="canvas-relational-tree-output-open"]');
    const inspector = container.querySelector(outputInspector)!;
    expect(inspector.querySelector('[data-slot="canvas-operation-properties-tab"]')).not.toBeNull();
    expect(
      inspector
        .querySelector('[data-slot="canvas-operation-output-tab"]')
        ?.getAttribute('aria-selected')
    ).toBe('true');
    expect(
      inspector.querySelectorAll('[data-slot="relation-output-field"]').length
    ).toBeGreaterThan(0);
    expect(container.querySelector(operationEditor)).toBe(originalEditor);
    await act(async () => {
      inspector
        .querySelector('[data-slot="canvas-operation-sql-tab"]')!
        .dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
    });
    expect(inspector.textContent).toContain('Apply the model changes before generating SQL.');
    await clickWorkbenchElement(`${outputInspector} [data-slot="canvas-relational-collapse"]`);
    expect(container.querySelector(outputInspector)).toBeNull();
    expect(container.querySelector(operationEditor)).toBe(originalEditor);

    await removeWorkbenchConnection(
      container.querySelector('[data-slot="canvas-relational-output-edge-action"]')!
    );
    expect(container.querySelector(outputInspector)).toBeNull();
    await clickWorkbenchElement('[data-slot="canvas-relational-tree-output-open"]');
    const unavailable = container.querySelector(`${outputInspector} [data-value="output"]`);
    expect(unavailable?.textContent).toContain(COPY.relationalTreeUnavailableMessage);
    expect(unavailable?.querySelector('[data-slot="relation-output-field"]')).toBeNull();
    expect(projectTransformSql).not.toHaveBeenCalled();
    expect(apply).not.toHaveBeenCalled();
  });
});

async function clickWorkbenchElement(selector: string): Promise<void> {
  await act(async () => container.querySelector<HTMLElement>(selector)!.click());
}
