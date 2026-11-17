// @vitest-environment jsdom
/** Prove saved Model SQL stays bound to visible passive inspection and the protected revision. */
import React, { act } from 'react';
import { fireEvent } from '@testing-library/dom';
import { describe, expect, it, vi } from 'vitest';
import type { TransformSqlProjectionResponse } from '@dvt/contracts';
import { container, setupWorkbenchTest } from './CanvasRelationalTreeWorkbench.test-support';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';

import {
  graph,
  digest,
  response,
  render,
  selectSqlTab,
  generate,
} from './CanvasModelSqlOutput.test-support';

vi.mock('../../components/monaco/MonacoCodeViewer', () => ({
  MonacoCodeViewer: ({ value }: { value: string }) => <pre>{value}</pre>,
}));

describe('Model Output SQL inspection', () => {
  setupWorkbenchTest();
  it('opens the scoped SQL editor explicitly without requesting generated SQL', () => {
    const query = { projectTransformSql: vi.fn() };
    const edit = vi.fn();
    render({ canvasId: response.canvasId, query }, true, false, undefined, edit);
    selectSqlTab();
    const button = container.querySelector<HTMLButtonElement>(
      '[data-slot="canvas-model-sql-edit"]'
    );
    expect(button).not.toBeNull();
    const output = container.querySelector('[data-slot="canvas-model-sql-output"]');
    expect(output?.querySelectorAll('button')).toHaveLength(1);
    expect(output?.querySelector('[data-slot="canvas-model-sql-generate"]')).toBeNull();
    expect(output?.querySelector('pre')).toBeNull();
    act(() => button!.click());
    expect(edit).toHaveBeenCalledOnce();
    expect(query.projectTransformSql).not.toHaveBeenCalled();
  });

  it('omits the editing action outside a Model SQL authoring owner', () => {
    render({ canvasId: response.canvasId, query: { projectTransformSql: vi.fn() } });
    selectSqlTab();
    expect(container.querySelector('[data-slot="canvas-model-sql-edit"]')).toBeNull();
  });

  it('queries only on explicit generation with the protected target and digest', async () => {
    const query = { projectTransformSql: vi.fn().mockResolvedValue(response) };
    const binding = { canvasId: response.canvasId, scopeKey: 'tenant::project::dev', query };
    render(binding, false);
    selectSqlTab();
    expect(query.projectTransformSql).not.toHaveBeenCalled();
    render(binding);
    await act(async () => {
      await Promise.resolve();
    });
    expect(query.projectTransformSql).not.toHaveBeenCalled();
    await generate();
    expect(query.projectTransformSql).toHaveBeenCalledExactlyOnceWith({
      canvasId: response.canvasId,
      transformNodeId: graph.targetNode.id,
      semanticPlanSha256: digest,
      presentation: 'readable',
    });
    expect(container.querySelector('pre')?.textContent).toBe(response.sql);
    render(binding, true, true);
    expect(container.querySelector('pre')).toBeNull();
    expect(container.querySelector('[data-slot="canvas-model-sql-output"]')).toBeNull();
    expect(
      container
        .querySelector('[data-slot="canvas-operation-output-tab"]')
        ?.getAttribute('aria-selected')
    ).toBe('true');
  });

  it.each(['missing', 'denied'] as const)(
    'shows %s query failure without local SQL or retry loops',
    async (mode) => {
      const query = { projectTransformSql: vi.fn().mockRejectedValue(new Error('Denied')) };
      render(mode === 'missing' ? undefined : { canvasId: response.canvasId, query });
      selectSqlTab();
      expect(query.projectTransformSql).not.toHaveBeenCalled();
      if (mode === 'missing') {
        expect(
          container.querySelector<HTMLButtonElement>('[data-slot="canvas-model-sql-generate"]')
            ?.disabled
        ).toBe(true);
        expect(container.querySelector('[role="status"]')).not.toBeNull();
        return;
      }
      await generate();
      expect(container.querySelector('[role="alert"]')).not.toBeNull();
      expect(container.querySelector('pre')).toBeNull();
      expect(query.projectTransformSql).toHaveBeenCalledOnce();
      await generate();
      expect(query.projectTransformSql).toHaveBeenCalledTimes(2);
    }
  );

  it('discards a pending SQL response when selecting another saved relation', async () => {
    const relations = readDvtTransformAuthoringAuthority(graph.targetNode)!.semanticDocument.sidecar
      .relations;
    const first = relations[0]!.relationId,
      second = relations[1]!.relationId;
    let resolve!: (value: TransformSqlProjectionResponse) => void;
    const projectTransformSql = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<TransformSqlProjectionResponse>((accept) => {
            resolve = accept;
          })
      )
      .mockResolvedValue({ ...response, relationId: second });
    const binding = { canvasId: response.canvasId, query: { projectTransformSql } };
    render(binding, true, false, first);
    selectSqlTab();
    await generate();
    render(binding, true, false, second);
    await act(async () => resolve({ ...response, relationId: first }));
    expect(container.querySelector('pre')).toBeNull();
    await generate();
    expect(projectTransformSql).toHaveBeenLastCalledWith(
      expect.objectContaining({ relationId: second, presentation: 'readable' })
    );
    expect(container.querySelector('pre')?.textContent).toBe(response.sql);
  });

  it.each(['workspace', 'properties', 'output'] as const)(
    'drops a pending result when leaving SQL for %s',
    async (destination) => {
      let resolve!: (value: TransformSqlProjectionResponse) => void;
      const query = {
        projectTransformSql: vi.fn(
          () =>
            new Promise<TransformSqlProjectionResponse>((accept) => {
              resolve = accept;
            })
        ),
      };
      const binding = { canvasId: response.canvasId, query };
      render(binding);
      selectSqlTab();
      expect(query.projectTransformSql).not.toHaveBeenCalled();
      await generate();
      expect(query.projectTransformSql).toHaveBeenCalledOnce();
      await generate();
      expect(query.projectTransformSql).toHaveBeenCalledOnce();
      if (destination === 'workspace') render(binding, false);
      else
        act(() => {
          fireEvent.mouseDown(
            container.querySelector(`[data-slot="canvas-operation-${destination}-tab"]`)!,
            { button: 0 }
          );
        });
      await act(async () => resolve(response));
      expect(container.querySelector('pre')).toBeNull();
      expect(container.querySelector('[data-slot="canvas-model-sql-output"]')).toBeNull();
    }
  );
});
