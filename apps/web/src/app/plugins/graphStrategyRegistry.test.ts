import { describe, expect, it } from 'vitest';
import {
  findCanvasGraphStrategy,
  findCanvasSurfaceStrategy,
  getCanvasGraphNodeCardStrategies,
  getCanvasRuntimeRegistrations,
  resolveCanvasGraphStrategy,
  resolveCanvasSurfaceStrategy,
} from './graphStrategyRegistry';
import type { RuntimeCapabilities } from './registry';

describe('resolveCanvasGraphStrategy', () => {
  it('lists canvas runtime registrations with matching canvas kind and graph strategy ids', () => {
    const registrations = getCanvasRuntimeRegistrations();
    const dbt = registrations.find((registration) => registration.kind === 'dbt');
    const transformation = registrations.find(
      (registration) => registration.kind === 'transformation'
    );

    expect(dbt?.executionStrategy.kind).toBe('planner_generic_preview');
    expect(dbt?.graphStrategy.id).toBe('dbt');
    expect(dbt?.surfaceStrategy.id).toBe('dbt-contextual-canvas');
    expect(transformation?.executionStrategy.kind).toBe('not_executable');
    expect(transformation?.graphStrategy.id).toBe('transformation');
    expect(transformation?.surfaceStrategy.id).toBe('dvt-transformation-contextual-canvas');
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
    expect(findCanvasSurfaceStrategy('dbt', capabilities)).toBeNull();
  });

  it('resolves graph node card strategies from the active canvas kind owner', () => {
    expect(getCanvasGraphNodeCardStrategies('dbt').map((strategy) => strategy.id)).toEqual([
      'dbt-card',
      'dvt-card',
    ]);
    expect(
      getCanvasGraphNodeCardStrategies('transformation').map((strategy) => strategy.id)
    ).toEqual(['dvt-card']);
  });

  it('does not leak DBT card strategies into a DVT canvas when DBT is available', () => {
    const strategyIds = getCanvasGraphNodeCardStrategies('transformation').map(
      (strategy) => strategy.id
    );

    expect(strategyIds).toEqual(['dvt-card']);
    expect(strategyIds).not.toContain('dbt-card');
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
    expect('surfacePolicy' in strategy).toBe(false);
  });

  it('resolves dbt surface strategy as contextual authoring policy', () => {
    const strategy = resolveCanvasSurfaceStrategy('dbt');

    expect(strategy).toMatchObject({
      id: 'dbt-contextual-canvas',
      globalNavigation: {
        workbenchTabs: 'retired',
        fixedResourcePanel: 'retired',
        fixedInspectorPanel: 'retired',
      },
      sourceImport: {
        placement: 'contextual-modal',
      },
      nodeWorkbench: {
        placement: 'contextual-overlay',
      },
      operationalDrawer: {
        placement: 'bottom-drawer',
      },
    });
    expect(strategy.nodeWorkbench.sections).toEqual([
      'properties',
      'columns',
      'tests',
      'lineage',
      'preview',
      'runs',
    ]);
    expect(strategy.nodeWorkbench.openedFrom).toEqual(['double-click']);
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

  it('resolves DVT transformation surface strategy with sink authoring sections', () => {
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
