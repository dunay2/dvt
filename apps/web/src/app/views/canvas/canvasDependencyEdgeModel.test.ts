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
});
