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
    expect(strategy.authoringPolicy).toEqual({
      toolbarMode: 'dbt',
      enforceTransformationTopology: false,
    });
  });

  it('resolves transformation strategy when explicitly requested', () => {
    const strategy = resolveCanvasGraphStrategy('transformation');
    expect(strategy.id).toBe('transformation');
    expect(strategy.authoringPolicy).toEqual({
      toolbarMode: 'transformation',
      enforceTransformationTopology: true,
    });
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
});
