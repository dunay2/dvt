import { describe, expect, it } from 'vitest';

import {
  buildCanvasWorkbenchTabPath,
  parseCanvasWorkbenchRouteState,
  resolveCanvasWorkbenchTabSelectionCommand,
} from './canvasWorkbenchRouteState';

describe('canvas workbench route state', () => {
  it('defaults /canvas to the Graph tab query state', () => {
    expect(parseCanvasWorkbenchRouteState(undefined)).toEqual({
      kind: 'selected',
      tabId: 'graph',
    });
  });

  it('accepts only cataloged Canvas workbench tabs', () => {
    expect(parseCanvasWorkbenchRouteState('code')).toEqual({
      kind: 'selected',
      tabId: 'code',
    });
    expect(parseCanvasWorkbenchRouteState('unknown')).toEqual({
      kind: 'unavailable',
      requestedTabId: 'unknown',
      recoveryTabId: 'graph',
    });
  });

  it('builds SelectCanvasWorkbenchTab command output as Canvas route paths', () => {
    expect(
      resolveCanvasWorkbenchTabSelectionCommand({
        tabId: 'lineage',
        enabledTabIds: ['graph', 'code', 'lineage'],
      })
    ).toEqual({
      kind: 'accepted',
      to: '/canvas/lineage',
    });
    expect(buildCanvasWorkbenchTabPath('graph')).toBe('/canvas');
  });

  it('rejects disabled or unknown tab selections', () => {
    expect(
      resolveCanvasWorkbenchTabSelectionCommand({
        tabId: 'runs',
        enabledTabIds: ['graph', 'code'],
      })
    ).toEqual({
      kind: 'rejected',
      reason: 'unknown_or_disabled_tab',
    });
  });
});
