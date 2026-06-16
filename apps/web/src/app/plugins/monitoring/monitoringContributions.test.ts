import { describe, expect, it } from 'vitest';

import type { BadgeContext, OverlayContext } from '../contracts/NodeRendering';
import type { CanonicalNode } from '../../types/canonical';
import { monitoringContributions } from './monitoringContributions';

const node: CanonicalNode = {
  id: 'node-1',
  name: 'node-1',
  pluginId: 'dvt',
  kind: 'dvt:task',
  role: 'transform',
  status: 'idle',
  tags: [],
};

function buildOverlayContext(status: string | undefined): OverlayContext {
  return {
    activeRun: 'running',
    costByNodeId: new Map(),
    downstreamOfSelected: new Set(),
    runStatusByNodeId: status ? new Map([['node-1', status]]) : new Map(),
    selectedNodeIds: new Set(),
    upstreamOfSelected: new Set(),
  };
}

describe('monitoringContributions', () => {
  it('declares route, command palette, diagnostics, overlay, and badge contributions', () => {
    expect(monitoringContributions.id).toBe('monitoring');
    expect(monitoringContributions.views?.map((view) => view.id)).toContain('monitoring.runs');
    expect(monitoringContributions.commandPaletteContributions?.map((item) => item.id)).toContain(
      'monitoring.open-runs'
    );
    expect(
      monitoringContributions.bottomDiagnosticsContributions?.map((item) => item.id)
    ).toContain('monitoring.run-events');
    expect(monitoringContributions.overlays?.map((overlay) => overlay.id)).toContain('runtime');
    expect(monitoringContributions.nodeBadges?.map((badge) => badge.id)).toContain(
      'monitoring.run-status'
    );
  });

  it('projects runtime status overlay and badge from caller-provided run state', () => {
    const runtimeOverlay = monitoringContributions.overlays?.find(
      (candidate) => candidate.id === 'runtime'
    );
    const runtimeBadge = monitoringContributions.nodeBadges?.find(
      (candidate) => candidate.id === 'monitoring.run-status'
    );
    const badgeContext: BadgeContext = {
      activeRunId: 'run-1',
      runStatusByNodeId: new Map([['node-1', 'running']]),
    };

    expect(runtimeOverlay?.nodeDecorator(node, buildOverlayContext('running'))).toEqual({
      borderColor: '#3b82f6',
    });
    expect(runtimeOverlay?.nodeDecorator(node, buildOverlayContext(undefined))).toBeNull();
    expect(runtimeBadge?.getBadge(node, badgeContext)).toMatchObject({
      color: 'blue',
      position: 'top-right',
      tooltip: 'Run status: running',
    });
  });
});
