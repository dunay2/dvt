import { describe, expect, it } from 'vitest';

import {
  buildCanvasDependencyEdgeData,
  readCanvasDependencyEdgeData,
} from './canvasDependencyEdgeModel';

describe('canvas dependency edge execution presentation', () => {
  it('projects an ordinary dependency as gateable and effectively executable', () => {
    const data = buildCanvasDependencyEdgeData({
      sourceId: 'orders',
      targetId: 'transform',
    });

    expect(data.execution).toEqual({
      gateState: 'open',
      isGateable: true,
      isEffectivelyExecutable: true,
    });
  });

  it('projects a retained closed dependency as excluded from execution', () => {
    const data = buildCanvasDependencyEdgeData({
      sourceId: 'orders',
      targetId: 'transform',
      executionGate: 'closed',
    });

    expect(data.execution).toEqual({
      gateState: 'closed',
      isGateable: true,
      isEffectivelyExecutable: false,
    });
  });

  it('does not offer an enabling gate for a structurally non-executable dependency', () => {
    const data = buildCanvasDependencyEdgeData({
      sourceId: 'orders',
      targetId: 'transform',
      canonicalMetadata: { executionDependency: false },
    });

    expect(data.execution).toEqual({
      gateState: 'open',
      isGateable: false,
      isEffectivelyExecutable: false,
      unavailableReason: 'structural-execution-disabled',
    });
  });

  it('fails closed and rejects commands when persisted gate metadata is malformed', () => {
    const data = buildCanvasDependencyEdgeData({
      sourceId: 'orders',
      targetId: 'transform',
      canonicalMetadata: { executionGate: 'future-state' },
    });

    expect(data.execution).toEqual({
      gateState: 'closed',
      isGateable: false,
      isEffectivelyExecutable: false,
      unavailableReason: 'invalid-gate',
    });
  });

  it('accepts only complete typed dependency presentation data', () => {
    const data = buildCanvasDependencyEdgeData({ sourceId: 'orders', targetId: 'transform' });

    expect(readCanvasDependencyEdgeData(data)).toEqual(data);
    expect(readCanvasDependencyEdgeData({ execution: data.execution })).toBeUndefined();
  });

  it('carries a canonical composition projection without changing execution truth', () => {
    const data = buildCanvasDependencyEdgeData({
      sourceId: 'orders',
      targetId: 'transform',
      composition: {
        groupId: 'relational-composition:transform',
        label: 'INNER JOIN',
        memberCount: 2,
        role: 'trunk-owner',
        state: 'canonical',
        operation: 'inner_join',
      },
    });

    expect(readCanvasDependencyEdgeData(data)).toEqual(data);
    expect(data.execution.isEffectivelyExecutable).toBe(true);
  });

  it('rejects an incomplete canonical composition projection', () => {
    const data = buildCanvasDependencyEdgeData({ sourceId: 'orders', targetId: 'transform' });

    expect(
      readCanvasDependencyEdgeData({
        ...data,
        composition: {
          groupId: 'relational-composition:transform',
          label: 'JOIN',
          memberCount: 2,
          role: 'trunk-owner',
          state: 'canonical',
        },
      })
    ).toBeUndefined();
  });
});
