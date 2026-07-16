/**
 * Owned concern: verify that Canvas preview and run both emit canonical
 * execution selection through one browser-local semantic seam.
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import type { PlanViewModel } from '../../types/plans';
import { readArchitectureSiblingSource } from '../architecture.test.support';
import { collectPlanSelection, collectPreviewSelection } from './canvasRunSelection';

const RUN_SELECTION_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasRunSelection.ts'
);
const DBT_SCOPE_POLICY_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'dbtExecutionScopePolicy.ts'
);
const DBT_EXECUTION_PROJECTION_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasDbtExecutionProjection.ts'
);
const PLAN_ACTION_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasPlanAction.ts'
);
const EXECUTION_STATE_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasExecutionState.ts'
);
const SELECTION_INTENT_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  '../../types/canvasExecutionSelection.ts'
);
const INTERACTION_STORE_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  '../../stores/canvasInteractionStore.ts'
);
const EXECUTION_ACTIONS_TYPES_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasExecutionActions.types.ts'
);
const DRAFT_SCOPE_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasDraftScope.ts'
);
const AUTHORED_CONTROLLER_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useCanvasController.ts'
);
const PROJECT_FILE_CONTROLLER_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useDbtProjectFileCanvasController.ts'
);
const STORE_ROOT = path.resolve(import.meta.dirname, '../../stores');
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
    expect(RUN_SELECTION_SOURCE).toContain(
      'Owned concern: derive caller-owned start-run selection'
    );
    expect(RUN_SELECTION_SOURCE).toContain('parseExecutionSelection');
    expect(PLAN_ACTION_SOURCE).toContain("from './canvasRunSelection'");
    expect(PLAN_ACTION_SOURCE).toContain('collectPreviewSelection(');
    expect(PLAN_ACTION_SOURCE).toContain("from './canvasDbtExecutionProjection'");
    expect(EXECUTION_STATE_SOURCE).toContain("from './canvasDbtExecutionProjection'");
    expect(DBT_EXECUTION_PROJECTION_SOURCE).toContain('buildCanvasDbtExecutionProjection');
    expect(DBT_SCOPE_POLICY_SOURCE).toContain('isDbtExecutionSelectableNode');
    expect(DBT_SCOPE_POLICY_SOURCE).toContain('applyDbtExecutionSelectionToggle');
    expect(DBT_SCOPE_POLICY_SOURCE).toContain('requestedRootNodeIds');
    expect(DBT_SCOPE_POLICY_SOURCE).toContain('derivedDependencyNodeIds');
    expect(RUN_START_ACTION_SOURCE).toContain("from './canvasRunSelection'");
    expect(RUN_START_ACTION_SOURCE).toContain('collectPlanSelection(currentPlan)');
    expect(COMPONENT_GUIDE_SOURCE).toContain('## Public API');
    expect(COMPONENT_GUIDE_SOURCE).toContain('## Invariants');
    expect(COMPONENT_GUIDE_SOURCE).toContain('## Transitions');
    expect(COMPONENT_GUIDE_SOURCE).toContain('## Consumers');
    expect(COMPONENT_GUIDE_SOURCE).toContain(
      'workspace fallback and explicit empty intent are different states'
    );
    expect(COMPONENT_GUIDE_SOURCE).toContain(
      'selection gestures mutate the complete requested-id set'
    );
    expect(COMPONENT_GUIDE_SOURCE).toContain('```mermaid');
  });

  it('keeps one atomic route-local selection intent authority', () => {
    const storesImportingSelectionIntent = readdirSync(STORE_ROOT)
      .filter((fileName) => fileName.endsWith('.ts') && !fileName.endsWith('.test.ts'))
      .filter((fileName) =>
        readFileSync(path.join(STORE_ROOT, fileName), 'utf8').includes(
          'CanvasExecutionSelectionIntent'
        )
      );

    expect(storesImportingSelectionIntent).toEqual(['canvasInteractionStore.ts']);
    expect(SELECTION_INTENT_SOURCE).toContain('type CanvasExecutionSelectionIntent =');
    expect(SELECTION_INTENT_SOURCE).toContain("readonly mode: 'workspace'");
    expect(SELECTION_INTENT_SOURCE).toContain("readonly mode: 'explicit'");
    expect(INTERACTION_STORE_SOURCE).toContain(
      'executionSelectionIntent: CanvasExecutionSelectionIntent'
    );
    expect(INTERACTION_STORE_SOURCE).not.toContain('executionSelectionMode:');
    expect(INTERACTION_STORE_SOURCE).not.toContain('selectedNodes: string[]');
  });

  it('carries the atomic intent through state commands and execution boundaries', () => {
    expect(INTERACTION_STORE_SOURCE).toContain(
      'setExecutionSelectionIntent: (intent: CanvasExecutionSelectionIntent)'
    );
    expect(DBT_SCOPE_POLICY_SOURCE).toContain('): CanvasExecutionSelectionIntent {');
    expect(EXECUTION_ACTIONS_TYPES_SOURCE).toContain(
      'selectionIntent: CanvasExecutionSelectionIntent;'
    );
    expect(DRAFT_SCOPE_SOURCE).toContain('selectionIntent: CanvasExecutionSelectionIntent;');
    expect(AUTHORED_CONTROLLER_SOURCE).toContain('store.setExecutionSelectionIntent(');
    expect(PROJECT_FILE_CONTROLLER_SOURCE).toContain('store.setExecutionSelectionIntent(');
    expect(INTERACTION_STORE_SOURCE).not.toContain("mode?: CanvasExecutionSelectionIntent['mode']");
  });

  it('emits canonical explicit selection for preview from the selected node scope', () => {
    expect(collectPreviewSelection(['node-a', 'node-b'], ['node-a', 'node-b', 'node-c'])).toEqual({
      mode: 'explicit',
      nodeIds: ['node-a', 'node-b'],
    });
  });

  it('falls back preview selection to workspace nodes and deduplicates persisted run selection', () => {
    const plan = {
      steps: [{ nodes: ['node-a', 'node-b', 'node-a'] }, { nodes: ['node-b', 'node-c'] }],
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
