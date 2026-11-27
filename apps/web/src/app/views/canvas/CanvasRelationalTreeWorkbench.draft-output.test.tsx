// @vitest-environment jsdom
import React, { act } from 'react';
import { describe, expect, it, type Mock, vi } from 'vitest';

import { CanvasRelationalTreeWorkbench } from './CanvasRelationalTreeWorkbench';
import {
  dropWorkbenchSource,
  removeWorkbenchConnection,
  stageWorkbenchOperation,
} from './CanvasRelationalTreeWorkbench.gestures.test-support';
import {
  container,
  COPY,
  root,
  setupWorkbenchTest,
} from './CanvasRelationalTreeWorkbench.test-support';
import { occurrenceGraph } from './relational-source-occurrence/occurrence.test.fixtures';

const outputInspector = '[data-slot="canvas-model-output-inspector"]';
const outputCard = '[data-slot="canvas-relational-tree-output-open"]';
const operationEditor = '[data-slot="canvas-relational-tree-inline-editor"]:not([hidden])';
const stagedCard = '[data-pending-operation="true"] [data-slot="canvas-relational-tree-node"]';
const pendingSource = '[data-pending="true"][data-operator="read"]';

describe('Model Output in an active relational draft', () => {
  setupWorkbenchTest();

  it('keeps the operation editor mounted and inspects the connected draft without writes', async () => {
    const { apply, projectTransformSql } = await renderDraftWorkbench();
    expect(container.querySelector('[data-slot="canvas-relational-tree-draft"]')).not.toBeNull();
    const originalEditor = container.querySelector(operationEditor);
    expect(originalEditor).not.toBeNull();

    await clickWorkbenchElement(outputCard);
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
    await clickWorkbenchElement(outputCard);
    const unavailable = container.querySelector(`${outputInspector} [data-value="output"]`);
    expect(unavailable?.textContent).toContain(COPY.relationalTreeUnavailableMessage);
    expect(unavailable?.querySelector('[data-slot="relation-output-field"]')).toBeNull();
    expect(projectTransformSql).not.toHaveBeenCalled();
    expect(apply).not.toHaveBeenCalled();
  });

  it('returns to operation and Source inspectors on explicit selection or creation', async () => {
    const { sourceId, apply, projectTransformSql } = await renderDraftWorkbench();
    await clickWorkbenchElement(outputCard);
    await stageWorkbenchOperation('projection');
    expect(container.querySelector(outputInspector)).toBeNull();
    expect(
      container.querySelector('[data-slot="canvas-staged-operation-inspector"]')
    ).not.toBeNull();

    await clickWorkbenchElement(outputCard);
    await clickWorkbenchElement(stagedCard);
    expect(container.querySelector(outputInspector)).toBeNull();

    await clickWorkbenchElement(outputCard);
    await dropWorkbenchSource(sourceId);
    expect(container.querySelector(outputInspector)).toBeNull();
    expect(container.querySelector(pendingSource)).not.toBeNull();

    await clickWorkbenchElement(outputCard);
    await clickWorkbenchElement(pendingSource);
    expect(container.querySelector(outputInspector)).toBeNull();
    expect(apply).not.toHaveBeenCalled();
    expect(projectTransformSql).not.toHaveBeenCalled();
  });
});

async function renderDraftWorkbench(): Promise<{
  sourceId: string;
  apply: Mock<() => { outcome: 'no_changes' }>;
  projectTransformSql: Mock;
}> {
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
  return { sourceId: graph.source.id, apply, projectTransformSql };
}

async function clickWorkbenchElement(selector: string): Promise<void> {
  await act(async () => container.querySelector<HTMLElement>(selector)!.click());
}
