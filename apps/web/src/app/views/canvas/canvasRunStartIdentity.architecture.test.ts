/**
 * Owned concern: verify that Canvas start-run keeps caller-owned intent and
 * leaves canonical execution identity to the protected API boundary.
 */
import { describe, expect, it } from 'vitest';

import type { PlanViewModel } from '../../types/plans';
import { readArchitectureSiblingSource } from '../architecture.test.support';
import { collectPlanSelection } from './canvasRunSelection';

const RUN_START_ACTION_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasRunStartAction.ts'
);
const RUN_SELECTION_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasRunSelection.ts'
);
const RUNS_PORT_SOURCE = readArchitectureSiblingSource(import.meta.dirname, '../../ports/runs.ts');
const CLIENT_IDENTITY_COMPONENT_GUIDE = readArchitectureSiblingSource(
  import.meta.dirname,
  '../../../../../../docs/architecture/components/web/runs/start-run-client-identity-boundary.md'
);

describe('canvas run-start identity architecture', () => {
  it('keeps execution identity outside Canvas and derives caller-owned selection in one semantic seam', () => {
    expect(RUN_SELECTION_SOURCE).toContain(
      'Owned concern: derive caller-owned start-run selection'
    );
    expect(RUN_START_ACTION_SOURCE).toContain("from './canvasRunSelection'");
    expect(RUN_START_ACTION_SOURCE).toContain('runsService.startRun({');
    expect(RUN_START_ACTION_SOURCE).toContain('planRef,');
    expect(RUN_START_ACTION_SOURCE).toContain(
      'workspaceScope: sessionContext.getWorkspaceScopeSnapshot()'
    );
    expect(RUN_START_ACTION_SOURCE).toContain('selection: collectPlanSelection(currentPlan)');
    expect(RUNS_PORT_SOURCE).toContain('export type StartRunInput = {');
    expect(RUNS_PORT_SOURCE).toContain('planRef: PlanRef;');
    expect(RUNS_PORT_SOURCE).toContain('workspaceScope: WorkspaceScope;');
    expect(RUNS_PORT_SOURCE).toContain('selection: readonly string[];');
  });

  it('deduplicates plan-node selection without authoring run identity', () => {
    const plan = {
      steps: [
        { nodes: ['model.orders', 'model.customers', 'model.orders'] },
        { nodes: ['model.customers', 'model.marts'] },
      ],
    } as PlanViewModel;

    expect(collectPlanSelection(plan)).toEqual(['model.orders', 'model.customers', 'model.marts']);
  });

  it('documents the active client boundary as a positive contract, not a retired compatibility rule', () => {
    expect(CLIENT_IDENTITY_COMPONENT_GUIDE).toContain(
      '`StartRunInput` is the complete client-authored start-run request contract'
    );
    expect(CLIENT_IDENTITY_COMPONENT_GUIDE).toContain(
      'Canvas run start builds `StartRunInput` from plan reference, workspace scope,'
    );
    expect(CLIENT_IDENTITY_COMPONENT_GUIDE).toContain('and selection only.');
    expect(CLIENT_IDENTITY_COMPONENT_GUIDE).toContain(
      'StartRunInput payload with caller-owned start intent'
    );
  });
});
