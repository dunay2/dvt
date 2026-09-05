import { describe, expect, it } from 'vitest';
import {
  findCanvasGraphStrategy,
  findCanvasSurfaceStrategy,
  getGraphNodeCardStrategies,
  getCanvasRuntimeRegistrations,
  resolveCanvasGraphStrategy,
  resolveCanvasSurfaceStrategy,
} from './graphStrategyRegistry';
import type { RuntimeCapabilities } from './registry';

describe('resolveCanvasGraphStrategy', () => {
  it('lists only the shared transformation Canvas runtime', () => {
    const registrations = getCanvasRuntimeRegistrations();

    expect(registrations.map((registration) => registration.kind)).toEqual(['transformation']);
    expect(registrations[0]?.executionStrategy.kind).toBe('not_executable');
    expect(registrations[0]?.graphStrategy.id).toBe('transformation');
    expect(registrations[0]?.surfaceStrategy.id).toBe('dvt-transformation-contextual-canvas');
  });

  it('keeps the shared Canvas runtime independent from dbt plugin availability', () => {
    const capabilities: RuntimeCapabilities = {
      plugins: {
        dbt: { available: false, reason: 'disabled_for_workspace' },
      },
    };

    expect(
      getCanvasRuntimeRegistrations(capabilities).map((registration) => registration.kind)
    ).toEqual(['transformation']);
    expect(findCanvasGraphStrategy('dbt', capabilities)).toBeNull();
    expect(findCanvasSurfaceStrategy('dbt', capabilities)).toBeNull();
  });

  it('resolves graph node card strategies from available plugins rather than Canvas kind', () => {
    expect(getGraphNodeCardStrategies().map((strategy) => strategy.id)).toEqual([
      'shared-source-model-card',
      'dbt-card',
      'dvt-card',
    ]);
    expect(
      getGraphNodeCardStrategies({
        plugins: {
          dbt: { available: false, reason: 'disabled_for_workspace' },
        },
      }).map((strategy) => strategy.id)
    ).toEqual(['shared-source-model-card', 'dvt-card']);
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

  it('fails closed for unknown and retired explicit strategy ids', () => {
    expect(findCanvasGraphStrategy('unknown')).toBeNull();
    expect(findCanvasGraphStrategy('dbt')).toBeNull();
    expect(() => resolveCanvasGraphStrategy('unknown')).toThrow(
      'Unknown canvas graph strategy registration: unknown'
    );
    expect(() => resolveCanvasGraphStrategy('dbt')).toThrow(
      'Unknown canvas graph strategy registration: dbt'
    );
    expect(() => resolveCanvasSurfaceStrategy('dbt')).toThrow(
      'Unknown canvas surface strategy registration: dbt'
    );
  });

  it('resolves transformation strategy when explicitly requested', () => {
    const strategy = resolveCanvasGraphStrategy('transformation');
    expect(strategy.id).toBe('transformation');
    expect('authoringPolicy' in strategy).toBe(false);
    expect('surfacePolicy' in strategy).toBe(false);
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

  it('resolves the shared transformation surface strategy with sink authoring sections', () => {
    const strategy = resolveCanvasSurfaceStrategy('transformation');

    expect(strategy.id).toBe('dvt-transformation-contextual-canvas');
    expect(strategy.sourceImport.openedFrom).toEqual(['canvas-context-menu', 'command-palette']);
    expect(strategy.nodeWorkbench.openedFrom).toEqual(['double-click']);
    expect(strategy.nodeWorkbench.sections).toEqual([
      'properties',
      'columns',
      'sql',
      'sink',
      'preview',
      'runs',
    ]);
    expect(strategy.globalNavigation.workbenchTabs).toBe('retired');
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
