import { describe, expect, it } from 'vitest';
import { resolveCanvasGraphStrategy } from './graphStrategyRegistry';

describe('resolveCanvasGraphStrategy', () => {
  it('defaults to transformation strategy when strategy id is missing', () => {
    const strategy = resolveCanvasGraphStrategy(undefined);
    expect(strategy.id).toBe('transformation');
  });

  it('defaults to transformation strategy for empty or unknown values', () => {
    expect(resolveCanvasGraphStrategy('  ').id).toBe('transformation');
    expect(resolveCanvasGraphStrategy('unknown').id).toBe('transformation');
  });

  it('resolves dbt strategy when explicitly requested', () => {
    const strategy = resolveCanvasGraphStrategy('dbt');
    expect(strategy.id).toBe('dbt');
    expect('authoringPolicy' in strategy).toBe(false);
  });

  it('resolves transformation strategy when explicitly requested', () => {
    const strategy = resolveCanvasGraphStrategy('transformation');
    expect(strategy.id).toBe('transformation');
    expect('authoringPolicy' in strategy).toBe(false);
    expect(
      strategy.mapNodeToCanonical({
        id: 'source-node',
        name: 'Source node',
        pluginId: 'dvt',
        kind: 'dvt:source',
        role: 'input',
        status: 'idle',
        tags: [],
      })
    ).toEqual({
      id: 'source-node',
      name: 'Source node',
      pluginId: 'dvt',
      kind: 'dvt:source',
      role: 'input',
      status: 'idle',
      tags: [],
    });
  });

  it('rejects malformed transformation graph canonical nodes and edges', () => {
    const strategy = resolveCanvasGraphStrategy('transformation');

    expect(
      strategy.mapNodeToCanonical({
        id: 'source-node',
        name: 'Source node',
        pluginId: 'dvt',
        kind: 'dvt:source',
        role: 'god-mode',
        status: 'idle',
        tags: [],
      })
    ).toBeNull();
    expect(
      strategy.mapNodeToCanonical({
        id: 'source-node',
        name: 'Source node',
        pluginId: 'dvt',
        kind: 'dvt:source',
        role: 'input',
        status: 'paused',
        tags: [],
      })
    ).toBeNull();
    expect(
      strategy.mapEdgeToCanonical({
        id: 'edge-1',
        sourceId: 'source-node',
        targetId: 'transform-node',
        relation: 'teleport',
      })
    ).toBeNull();
  });
});
