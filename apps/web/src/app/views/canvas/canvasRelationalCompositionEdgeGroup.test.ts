import { describe, expect, it } from 'vitest';

import { projectCanvasRelationalCompositionEdgeGroup } from './canvasRelationalCompositionEdgeGroup';

const EDGES = [
  { sourceId: 'orders', targetId: 'model' },
  { sourceId: 'clients', targetId: 'model' },
] as const;

describe('relational-composition edge group', () => {
  it('leaves a single dependency ungrouped', () => {
    expect(
      projectCanvasRelationalCompositionEdgeGroup({
        targetId: 'model',
        incomingEdges: [EDGES[0]],
        truth: { state: 'single-input', connectedInputCount: 1 },
      }).size
    ).toBe(0);
  });

  it('projects a pending composition without inventing an operation', () => {
    const members = projectCanvasRelationalCompositionEdgeGroup({
      targetId: 'model',
      incomingEdges: EDGES,
      truth: { state: 'pending', connectedInputCount: 2, pendingInputCount: 2 },
    });

    expect([...members.values()]).toEqual([
      {
        groupId: 'relational-composition:model',
        memberCount: 2,
        role: 'trunk-owner',
        state: 'pending',
      },
      {
        groupId: 'relational-composition:model',
        memberCount: 2,
        role: 'branch',
        state: 'pending',
      },
    ]);
  });

  it('projects the exact committed canonical operation', () => {
    const members = projectCanvasRelationalCompositionEdgeGroup({
      targetId: 'model',
      incomingEdges: EDGES,
      truth: { state: 'canonical', connectedInputCount: 2, operation: 'union_all' },
    });

    expect([...members.values()].every((member) => member.operation === 'union_all')).toBe(true);
    expect([...members.values()].filter((member) => member.role === 'trunk-owner')).toHaveLength(1);
  });

  it('keeps an existing operation distinct from a newly pending input', () => {
    const members = projectCanvasRelationalCompositionEdgeGroup({
      targetId: 'model',
      incomingEdges: [...EDGES, { sourceId: 'details', targetId: 'model' }],
      truth: {
        state: 'pending',
        connectedInputCount: 3,
        pendingInputCount: 1,
        canonicalOperation: 'inner_join',
      },
    });

    expect([...members.values()]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ state: 'pending', operation: 'inner_join', memberCount: 3 }),
      ])
    );
  });
});
