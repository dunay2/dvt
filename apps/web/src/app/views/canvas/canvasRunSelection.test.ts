import { describe, expect, it } from 'vitest';

import type { PlanViewModel } from '../../types/plans';
import { collectPlanSelection, collectPreviewSelection } from './canvasRunSelection';

describe('canvas run selection', () => {
  it('uses the selected preview scope when nodes are selected', () => {
    expect(collectPreviewSelection(['node-a', 'node-b'], ['node-a', 'node-b', 'node-c'])).toEqual({
      mode: 'explicit',
      nodeIds: ['node-a', 'node-b'],
    });
  });

  it('uses the workspace scope when preview selection is empty', () => {
    expect(collectPreviewSelection([], ['node-a', 'node-b'])).toEqual({
      mode: 'explicit',
      nodeIds: ['node-a', 'node-b'],
    });
  });

  it('deduplicates persisted plan nodes before starting a run', () => {
    const plan = {
      steps: [{ nodes: ['node-a', 'node-b', 'node-a'] }, { nodes: ['node-b', 'node-c'] }],
    } as PlanViewModel;

    expect(collectPlanSelection(plan)).toEqual({
      mode: 'explicit',
      nodeIds: ['node-a', 'node-b', 'node-c'],
    });
  });
});
