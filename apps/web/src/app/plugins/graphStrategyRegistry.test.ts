import { describe, expect, it } from 'vitest';
import {
  findCanvasGraphStrategy,
  getCanvasRuntimeRegistrations,
  resolveCanvasGraphStrategy,
} from './graphStrategyRegistry';
import type { RuntimeCapabilities } from './registry';

describe('resolveCanvasGraphStrategy', () => {
  it('lists canvas runtime registrations with matching canvas kind and graph strategy ids', () => {
    expect(
      getCanvasRuntimeRegistrations().map((registration) => ({
        kind: registration.kind,
        executionKind: registration.executionStrategy.kind,
        graphStrategyId: registration.graphStrategy.id,
      }))
    ).toEqual([
      { kind: 'dbt', executionKind: 'not_executable', graphStrategyId: 'dbt' },
      {
        kind: 'transformation',
        executionKind: 'transformation_preview',
        graphStrategyId: 'transformation',
      },
    ]);
  });

  it('filters canvas runtime registrations through runtime plugin capabilities', () => {
    const capabilities: RuntimeCapabilities = {
      plugins: {
        dbt: { available: false, reason: 'disabled_for_workspace' },
      },
    };

    expect(
      getCanvasRuntimeRegistrations(capabilities).map((registration) => registration.kind)
    ).toEqual(['transformation']);
    expect(findCanvasGraphStrategy('dbt', capabilities)).toBeNull();
  });

  it('defaults to transformation strategy when strategy id is missing', () => {
    const strategy = resolveCanvasGraphStrategy(undefined);
    expect(strategy.id).toBe('transformation');
  });

  it('fails closed when the default transformation plugin is capability-disabled', () => {
    const capabilities: RuntimeCapabilities = {
      plugins: {
        dvt: { available: false, reason: 'disabled_for_workspace' },
      },
    };

    expect(() => resolveCanvasGraphStrategy(undefined, capabilities)).toThrow(
      'Missing default canvas graph strategy registration'
    );
  });

  it('defaults to transformation strategy for empty values only', () => {
    expect(resolveCanvasGraphStrategy('  ').id).toBe('transformation');
  });

  it('fails closed for unknown explicit strategy ids', () => {
    expect(findCanvasGraphStrategy('unknown')).toBeNull();
    expect(() => resolveCanvasGraphStrategy('unknown')).toThrow(
      'Unknown canvas graph strategy registration: unknown'
    );
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
