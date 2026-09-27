// @vitest-environment jsdom
/** Incomplete source occurrences persist and reopen with stable identity. */
import React, { act } from 'react';
import { describe, expect, it } from 'vitest';
import { CanvasRelationalTreeWorkbench } from './CanvasRelationalTreeWorkbench';
import { applyCanvasInspectorNodeDraft } from './canvasInspectorAuthoringModel';
import type { CanvasInspectorNodeDraft } from './canvasInspectorAuthoring.types';
import { dropWorkbenchSource } from './CanvasRelationalTreeWorkbench.gestures.test-support';
import {
  COPY,
  container,
  edge,
  root,
  setupWorkbenchTest,
  sourceNode,
  transformNode,
} from './CanvasRelationalTreeWorkbench.test-support';

describe('Canvas relational-tree source reopen', () => {
  setupWorkbenchTest();

  it('reopens an incomplete occurrence with the same identity', async () => {
    const source = sourceNode('customers', 'customers');
    const target = transformNode();
    const saved: CanvasInspectorNodeDraft[] = [];
    const authoring = {
      canEditNode: true,
      onApplyNodeDraft: (_id: string, draft: CanvasInspectorNodeDraft) => {
        saved.push(draft);
        return { outcome: 'no_changes' as const };
      },
    };
    await act(async () =>
      root.render(
        <CanvasRelationalTreeWorkbench
          transformNode={target}
          nodes={[source, target]}
          edges={[edge(source.id)]}
          copy={COPY}
          authoring={authoring}
        />
      )
    );
    await dropWorkbenchSource(source.id, 460, 240);
    const relationId = container
      .querySelector<HTMLElement>('[data-pending="true"]')!
      .getAttribute('data-relation-id');
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-apply"]')!
        .click()
    );

    const reopened = applyCanvasInspectorNodeDraft(target, saved[0]!);
    await act(async () =>
      root.render(
        <CanvasRelationalTreeWorkbench
          transformNode={reopened}
          nodes={[source, reopened]}
          edges={[edge(source.id)]}
          copy={COPY}
          authoring={authoring}
        />
      )
    );
    expect(container.querySelector('[data-pending="true"]')?.getAttribute('data-relation-id')).toBe(
      relationId
    );
  });
});
