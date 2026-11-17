/** Mount saved Model SQL inspection with its actual output frame and scoped editing action. */
import React, { act } from 'react';
import { fireEvent } from '@testing-library/dom';
import { TransformSqlProjectionResponseSchema } from '@dvt/contracts';
import type { CanvasTransformSqlQueryBinding } from '../../ports/canvasTransformSql';
import { CanvasModelSqlOutput } from './CanvasModelSqlOutput';
import {
  CanvasOperationInspectorTabs,
  CanvasRelationalTreeEditorFrame,
} from './CanvasRelationalTreeEditorFrame';
import { container, root } from './CanvasRelationalTreeWorkbench.test-support';
import {
  occurrenceGraph,
  occurrenceInput,
} from './relational-source-occurrence/occurrence.test.fixtures';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
import { CanvasModelSqlEditorAction } from './model-sql/CanvasModelSqlEditorAction';

export const graph = occurrenceGraph();
export const digest = readDvtTransformAuthoringAuthority(graph.targetNode)!.semanticDocument
  .semanticPlan.sha256;
export const response = TransformSqlProjectionResponseSchema.parse({
  schemaVersion: 'canvas-transform-sql-projection.v1',
  canvasId: 'canvas-model',
  transformNodeId: graph.targetNode.id,
  draftRevision: 'saved-revision',
  semanticPlanSha256: digest,
  sql: 'SELECT id FROM public.places',
  presentation: { status: 'unchanged', sql: 'SELECT id FROM public.places', steps: [] },
  provenance: { sourceRefs: [occurrenceInput.source.sourceRef!] },
});

export function render(
  binding?: CanvasTransformSqlQueryBinding,
  active = true,
  editing = false,
  relationId?: string,
  onEditSql?: () => void
): void {
  act(() =>
    root.render(
      <CanvasModelSqlEditorAction.Provider
        value={
          onEditSql == null
            ? null
            : { open: onEditSql, panelId: 'model-sql-panel', expanded: false }
        }
      >
        <CanvasOperationInspectorTabs active={active}>
          <CanvasRelationalTreeEditorFrame
            operation="projection"
            relationId="final-model-output"
            label="Model"
            hasExpression={false}
            readOnly
            editing={editing}
            onClose={() => undefined}
            output={<p>Fields</p>}
            sqlOutput={
              <CanvasModelSqlOutput
                transformNode={graph.targetNode}
                nodes={graph.nodes}
                edges={graph.edges}
                codeProjection={binding}
                relationId={relationId}
              />
            }
          >
            <p>Properties</p>
          </CanvasRelationalTreeEditorFrame>
        </CanvasOperationInspectorTabs>
      </CanvasModelSqlEditorAction.Provider>
    )
  );
}

export function selectSqlTab(): void {
  act(() => {
    fireEvent.mouseDown(container.querySelector('[data-slot="canvas-operation-sql-tab"]')!, {
      button: 0,
    });
  });
}

export async function generate(): Promise<void> {
  await act(async () => {
    container.querySelector<HTMLButtonElement>('[data-slot="canvas-model-sql-generate"]')!.click();
  });
}
