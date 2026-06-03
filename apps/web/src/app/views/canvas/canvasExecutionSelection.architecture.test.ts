/**
 * Owned concern: verify that Canvas preview and run both emit canonical
 * execution selection through one browser-local semantic seam.
 */
import { describe, expect, it } from 'vitest';

import type { PlanViewModel } from '../../types/plans';
import { readArchitectureSiblingSource } from '../architecture.test.support';
import { collectPlanSelection, collectPreviewSelection } from './canvasRunSelection';

const RUN_SELECTION_SOURCE = readArchitectureSiblingSource(import.meta.dirname, 'canvasRunSelection.ts');
const PLAN_ACTION_SOURCE = readArchitectureSiblingSource(import.meta.dirname, 'canvasPlanAction.ts');
const RUN_START_ACTION_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasRunStartAction.ts'
);
const COMPONENT_GUIDE_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  '../../../../../../docs/architecture/components/web/graph/canvas-execution-selection-component.md'
);

describe('canvas execution selection architecture', () => {
  it('documents one selection seam used by both preview and run', () => {
    expect(RUN_SELECTION_SOURCE).toContain('Owned concern: derive caller-owned start-run selection');
    expect(RUN_SELECTION_SOURCE).toContain('parseExecutionSelection');
    expect(PLAN_ACTION_SOURCE).toContain("from './canvasRunSelection'");
    expect(PLAN_ACTION_SOURCE).toContain('collectPreviewSelection(');
    expect(RUN_START_ACTION_SOURCE).toContain("from './canvasRunSelection'");
    expect(RUN_START_ACTION_SOURCE).toContain('collectPlanSelection(currentPlan)');
    expect(COMPONENT_GUIDE_SOURCE).toContain('## Public API');
    expect(COMPONENT_GUIDE_SOURCE).toContain('## Invariants');
    expect(COMPONENT_GUIDE_SOURCE).toContain('## Transitions');
    expect(COMPONENT_GUIDE_SOURCE).toContain('## Consumers');
    expect(COMPONENT_GUIDE_SOURCE).toContain('```mermaid');
  });

  it('emits canonical explicit selection for preview from the selected node scope', () => {
    expect(collectPreviewSelection(['node-a', 'node-b'], ['node-a', 'node-b', 'node-c'])).toEqual({
      mode: 'explicit',
      nodeIds: ['node-a', 'node-b'],
    });
  });

  it('falls back preview selection to workspace nodes and deduplicates persisted run selection', () => {
    const plan = {
      steps: [
        { nodes: ['node-a', 'node-b', 'node-a'] },
        { nodes: ['node-b', 'node-c'] },
      ],
    } as PlanViewModel;

    expect(collectPreviewSelection([], ['node-a', 'node-b'])).toEqual({
      mode: 'explicit',
      nodeIds: ['node-a', 'node-b'],
    });
    expect(collectPlanSelection(plan)).toEqual({
      mode: 'explicit',
      nodeIds: ['node-a', 'node-b', 'node-c'],
    });
  });
});
