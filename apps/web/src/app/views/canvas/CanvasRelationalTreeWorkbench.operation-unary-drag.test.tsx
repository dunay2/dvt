// @vitest-environment jsdom
/** A unary operation is placed before its producer and Output connections. */
import { describe, expect, it, vi } from 'vitest';
import { applyCanvasInspectorNodeDraft } from './canvasInspectorAuthoringModel';
import { createCanvasRelationalTreeNodeDraft } from './canvasRelationalTreeAuthoringModel';
import { createDvtTransformAuthoringMetadata } from './canvasDvtTransformAuthoring';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { applySelectedRelationFilter } from './canvasSelectedRelationFilter';
import { dvtSubstraitTextComparison } from './canvasDvtSubstraitTextComparison';
import {
  container,
  setupWorkbenchTest,
  sourceNode,
} from './CanvasRelationalTreeWorkbench.test-support';
import {
  connectWorkbenchOutput,
  disconnectWorkbenchOutput,
  dragWorkbenchOperation,
} from './CanvasRelationalTreeWorkbench.gestures.test-support';
import {
  canonicalOutputPort,
  dragElement,
  projectionTarget,
  renderOperationWorkbench,
  stagedOperation,
} from './CanvasRelationalTreeWorkbench.operation-drag.test-support';

describe('Canvas relational-tree unary operation drag', () => {
  setupWorkbenchTest();

  it.each(['new-save', 'existing-snapshot'] as const)(
    'does not restore the completed Transform terminal after Filter insertion (%s)',
    async (state) => {
      const source = sourceNode('customers', 'customers');
      const target = projectionTarget(source);
      const document = createDvtTransformAuthoringMetadata(target);
      if (document.mode !== 'substrait') throw new Error('Expected Transform document');
      const session = new CanvasRelationAnalysisSession(target.id);
      session.receive(document);
      const transformId = session.rootId;
      target.metadata = {
        ...target.metadata,
        relationalAuthoringDraft: {
          version: 'v1',
          sources: [],
          operations: [],
          positions: {},
          outputRelationId: transformId,
        },
      };
      const fields = await session.query(transformId);
      const filtered = await applySelectedRelationFilter(session, {
        intent: 'insert',
        relationId: transformId,
        expectedRevision: session.revision,
        fieldId: fields.bindings[0]!.fieldId,
        capabilityId: dvtSubstraitTextComparison.capabilities[0]!.capabilityId,
        value: 'C-001',
      });
      const saved = applyCanvasInspectorNodeDraft(
        target,
        createCanvasRelationalTreeNodeDraft(target, 'projection', filtered)
      );
      expect(saved.metadata?.relationalAuthoringDraft).toBeUndefined();
      if (state === 'existing-snapshot') {
        saved.metadata = {
          ...saved.metadata,
          relationalAuthoringDraft: target.metadata.relationalAuthoringDraft,
        };
      }
      const apply = vi.fn();
      await renderOperationWorkbench(saved, [source], apply);
      const filter = container
        .querySelector<HTMLElement>('[data-operator="filter"]')!
        .closest('li')!;
      const fromX = parseFloat(filter.style.left) + parseFloat(filter.style.width);
      const fromY = parseFloat(filter.style.top) + parseFloat(filter.style.height) / 2;
      expect(
        container.querySelector('[data-slot="canvas-relational-output-edge"]')?.getAttribute('d')
      ).toMatch(new RegExp(`^M ${fromX} ${fromY} C `));
      expect(container.querySelectorAll('[data-operator="project"]')).toHaveLength(1);
      expect(container.querySelectorAll('[data-operator="filter"]')).toHaveLength(1);
      expect(apply).not.toHaveBeenCalled();
      session.dispose();
    }
  );

  it('places Transform first and links its Input and Output explicitly', async () => {
    const source = sourceNode('customers', 'customers');
    const apply = vi.fn(() => ({ outcome: 'no_changes' as const }));
    await renderOperationWorkbench(projectionTarget(source), [source], apply);

    await dragWorkbenchOperation('transform');
    const transform = stagedOperation('project');
    expect(container.querySelectorAll('[data-operator="project"]')).toHaveLength(2);

    await disconnectWorkbenchOutput(container);
    await dragElement(
      canonicalOutputPort(),
      transform.querySelector<HTMLElement>('[data-slot="canvas-relational-input-port"]')!
    );
    expect(container.querySelectorAll('[data-slot="canvas-relational-pending-edge"]')).toHaveLength(
      1
    );
    expect(container.querySelector('[data-slot="canvas-relational-output-edge"]')).toBeNull();

    await connectWorkbenchOutput(
      container,
      transform.querySelector<HTMLElement>('[data-slot="canvas-relational-output-port"]')!
    );
    expect(container.querySelector('[data-slot="canvas-relational-output-edge"]')).not.toBeNull();
    expect(
      container.querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-apply"]')
        ?.disabled
    ).toBe(false);
    expect(apply).not.toHaveBeenCalled();
  });
});
