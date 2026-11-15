// @vitest-environment jsdom
/** Prove saved Model SQL stays bound to visible passive inspection and the protected revision. */
import React, { act } from 'react';
import { fireEvent } from '@testing-library/dom';
import { describe, expect, it, vi } from 'vitest';
import {
  TransformSqlProjectionResponseSchema,
  type TransformSqlProjectionResponse,
} from '@dvt/contracts';
import type { CanvasTransformSqlQueryBinding } from '../../ports/canvasTransformSql';
import { CanvasModelSqlOutput } from './CanvasModelSqlOutput';
import {
  CanvasOperationInspectorTabs,
  CanvasRelationalTreeEditorFrame,
} from './CanvasRelationalTreeEditorFrame';
import { container, root, setupWorkbenchTest } from './CanvasRelationalTreeWorkbench.test-support';
import {
  occurrenceGraph,
  occurrenceInput,
} from './relational-source-occurrence/occurrence.test.fixtures';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';

vi.mock('../../components/monaco/MonacoCodeViewer', () => ({
  MonacoCodeViewer: ({ value }: { value: string }) => <pre>{value}</pre>,
}));

describe('Model Output SQL inspection', () => {
  setupWorkbenchTest();
  const graph = occurrenceGraph();
  const digest = readDvtTransformAuthoringAuthority(graph.targetNode)!.semanticDocument.semanticPlan
    .sha256;
  const response = TransformSqlProjectionResponseSchema.parse({
    schemaVersion: 'canvas-transform-sql-projection.v1',
    canvasId: 'canvas-model',
    transformNodeId: graph.targetNode.id,
    draftRevision: 'saved-revision',
    semanticPlanSha256: digest,
    sql: 'SELECT id FROM public.places',
    provenance: { sourceRefs: [occurrenceInput.source.sourceRef!] },
  });

  function render(binding?: CanvasTransformSqlQueryBinding, active = true, editing = false): void {
    act(() =>
      root.render(
        <CanvasOperationInspectorTabs active={active}>
          <CanvasRelationalTreeEditorFrame
            operation="projection"
            relationId="final-model-output"
            label="Model"
            hasExpression={false}
            readOnly
            editing={editing}
            onClose={() => undefined}
            output={
              <CanvasModelSqlOutput
                transformNode={graph.targetNode}
                nodes={graph.nodes}
                edges={graph.edges}
                codeProjection={binding}
              />
            }
          >
            <p>Properties</p>
          </CanvasRelationalTreeEditorFrame>
        </CanvasOperationInspectorTabs>
      )
    );
  }

  function outputTab(): void {
    act(() =>
      fireEvent.mouseDown(container.querySelector('[data-slot="canvas-operation-output-tab"]')!, {
        button: 0,
      })
    );
  }

  it('queries only the visible Model Output with its protected target and digest', async () => {
    const query = { projectTransformSql: vi.fn().mockResolvedValue(response) };
    const binding = { canvasId: response.canvasId, scopeKey: 'tenant::project::dev', query };
    render(binding, false);
    outputTab();
    expect(query.projectTransformSql).not.toHaveBeenCalled();
    render(binding);
    await act(async () => {
      await Promise.resolve();
    });
    expect(query.projectTransformSql).toHaveBeenCalledExactlyOnceWith({
      canvasId: response.canvasId,
      transformNodeId: graph.targetNode.id,
      semanticPlanSha256: digest,
    });
    expect(container.querySelector('pre')?.textContent).toBe(response.sql);
    render(binding, true, true);
    expect(container.querySelector('pre')).toBeNull();
    expect(container.querySelector('[data-slot="canvas-model-sql-output"]')).toBeNull();
  });

  it.each(['missing', 'denied'] as const)(
    'shows %s query failure without local SQL or retry loops',
    async (mode) => {
      const query = { projectTransformSql: vi.fn().mockRejectedValue(new Error('Denied')) };
      render(mode === 'missing' ? undefined : { canvasId: response.canvasId, query });
      outputTab();
      await act(async () => {
        await Promise.resolve();
      });
      expect(container.querySelector('[role="alert"]')).not.toBeNull();
      expect(container.querySelector('pre')).toBeNull();
      expect(query.projectTransformSql).toHaveBeenCalledTimes(mode === 'missing' ? 0 : 1);
    }
  );

  it('drops a pending result when the retained Model becomes hidden', async () => {
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
    outputTab();
    expect(query.projectTransformSql).toHaveBeenCalledOnce();
    render(binding, false);
    await act(async () => resolve(response));
    expect(container.querySelector('pre')).toBeNull();
    expect(container.querySelector('[data-slot="canvas-model-sql-output"]')).toBeNull();
  });
});
