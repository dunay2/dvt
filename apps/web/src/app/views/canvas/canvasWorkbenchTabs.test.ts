/** Owned concern: prove Canvas workbench tab read-model projection semantics. */
import { FileCode2, GitGraph } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import {
  buildCanvasWorkbenchTabsReadModel,
  createGraphCanvasWorkbenchTab,
} from './canvasWorkbenchTabs';

describe('buildCanvasWorkbenchTabsReadModel', () => {
  it('projects Graph plus enabled plugin tabs in placement order', () => {
    const model = buildCanvasWorkbenchTabsReadModel({
      placements: [
        {
          kind: 'workbench-tab',
          workbench: 'canvas',
          tabId: 'lineage',
          label: 'Lineage',
          icon: GitGraph,
          order: 30,
          scope: 'canvas',
        },
        {
          kind: 'workbench-tab',
          workbench: 'canvas',
          tabId: 'code',
          label: 'Code',
          icon: FileCode2,
          order: 20,
          scope: 'selection',
        },
      ],
      routeState: { kind: 'selected', tabId: 'code' },
      context: { kind: 'ready' },
    });

    expect(model.activeTabId).toBe('code');
    expect(model.tabs.map((tab) => [tab.id, tab.label, tab.to])).toEqual([
      ['graph', 'Graph', '/canvas'],
      ['code', 'Code', '/canvas/code'],
      ['lineage', 'Lineage', '/canvas/lineage'],
    ]);
    expect(model.unavailableState).toBeNull();
  });

  it('projects Stage 1 workbench tabs as text-only labels without icon render data', () => {
    const model = buildCanvasWorkbenchTabsReadModel({
      placements: [
        {
          kind: 'workbench-tab',
          workbench: 'canvas',
          tabId: 'code',
          label: 'Code',
          icon: FileCode2,
          order: 20,
          scope: 'selection',
        },
      ],
      routeState: { kind: 'selected', tabId: 'graph' },
      context: { kind: 'ready' },
    });

    expect(model.tabs.map((tab) => [tab.id, tab.label, tab.to])).toEqual([
      ['graph', 'Graph', '/canvas'],
      ['code', 'Code', '/canvas/code'],
    ]);
    expect(model.tabs.every((tab) => !('icon' in tab))).toBe(true);
  });

  it('fails closed when duplicate Canvas tab IDs are registered', () => {
    expect(() =>
      buildCanvasWorkbenchTabsReadModel({
        placements: [
          {
            kind: 'workbench-tab',
            workbench: 'canvas',
            tabId: 'code',
            label: 'Code',
            icon: FileCode2,
            order: 20,
            scope: 'selection',
          },
          {
            kind: 'workbench-tab',
            workbench: 'canvas',
            tabId: 'code',
            label: 'Code duplicate',
            icon: FileCode2,
            order: 21,
            scope: 'selection',
          },
        ],
        routeState: { kind: 'selected', tabId: 'graph' },
        context: { kind: 'ready' },
      })
    ).toThrow(/duplicate Canvas workbench tab id/i);
  });

  it('returns an unavailable state for unknown route tabs without inventing a default', () => {
    const model = buildCanvasWorkbenchTabsReadModel({
      placements: [],
      routeState: { kind: 'unavailable', requestedTabId: 'unknown', recoveryTabId: 'graph' },
      context: { kind: 'ready' },
    });

    expect(model.activeTabId).toBe('graph');
    expect(model.unavailableState).toEqual({
      kind: 'unknown_tab',
      requestedTabId: 'unknown',
      recoveryTabId: 'graph',
    });
  });

  it('does not enable scoped tabs before Canvas context is ready', () => {
    const graphTab = createGraphCanvasWorkbenchTab();
    const model = buildCanvasWorkbenchTabsReadModel({
      placements: [
        {
          kind: 'workbench-tab',
          workbench: 'canvas',
          tabId: 'runs',
          label: 'Runs',
          icon: GitGraph,
          order: 60,
          scope: 'run',
        },
      ],
      routeState: { kind: 'selected', tabId: 'runs' },
      context: { kind: 'unavailable', reason: 'missing_canvas_context' },
    });

    expect(model.tabs).toEqual([graphTab]);
    expect(model.unavailableState).toEqual({
      kind: 'missing_canvas_context',
      recoveryTabId: 'graph',
    });
  });
});
