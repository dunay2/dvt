/** Owned concern: prove Canvas workbench log read-model projection semantics. */
import { describe, expect, it } from 'vitest';

import { buildCanvasWorkbenchLogEntries } from './canvasWorkbenchLogEntries';

describe('buildCanvasWorkbenchLogEntries', () => {
  it('projects current Canvas route, draft, plan, permission, and selection posture', () => {
    const model = buildCanvasWorkbenchLogEntries({
      presentation: {
        routeState: 'ready',
        bootstrapDetail: 'Canvas is ready',
      },
      draft: {
        kind: 'save_failed',
        title: 'Draft save failed',
        message: 'The protected draft write failed.',
        statusLabel: 'Draft save failed',
      },
      toolbar: {
        planRunReadiness: {
          status: 'blocked',
          summary: 'Preview must be regenerated before Run.',
        },
        canPlanGraph: false,
        canStartRun: false,
        planStatusSummary: 'Preview must be regenerated before Run.',
      },
      permissions: {
        canPlan: false,
        canRun: false,
        canEditEdges: true,
      },
      graph: {
        nodeCount: 3,
        edgeCount: 2,
      },
      selection: {
        inspectorNodeName: 'orders',
        activeRunId: 'run-42',
      },
    });

    expect(model.rail).toBe('ListCanvasWorkbenchLogEntries');
    expect(model.entries.map((entry) => [entry.severity, entry.source, entry.message])).toEqual([
      ['info', 'route', 'Canvas is ready'],
      ['error', 'draft', 'The protected draft write failed.'],
      ['warning', 'plan', 'Preview must be regenerated before Run.'],
      ['warning', 'permission', 'Execution Preview is unavailable for this workspace scope.'],
      ['warning', 'permission', 'Run start is unavailable for this workspace scope.'],
      ['info', 'graph', 'Graph contains 3 nodes and 2 edges.'],
      ['info', 'selection', 'Selected node: orders.'],
      ['info', 'run', 'Active run: run-42.'],
    ]);
  });

  it('omits empty and duplicate messages while keeping the first source-owned entry', () => {
    const model = buildCanvasWorkbenchLogEntries({
      presentation: {
        routeState: 'blocked_backend',
        bootstrapDetail: 'Backend is not ready.',
      },
      draft: {
        kind: 'writable',
        title: 'Canvas is ready',
        message: 'Backend is not ready.',
        statusLabel: 'Synced',
      },
      toolbar: {
        planRunReadiness: {
          status: 'ready',
          summary: '',
        },
        canPlanGraph: true,
        canStartRun: true,
        planStatusSummary: '',
      },
      permissions: {
        canPlan: true,
        canRun: true,
        canEditEdges: true,
      },
      graph: {
        nodeCount: 0,
        edgeCount: 0,
      },
      selection: {
        inspectorNodeName: null,
        activeRunId: null,
      },
    });

    expect(model.entries.map((entry) => [entry.severity, entry.source, entry.message])).toEqual([
      ['error', 'route', 'Backend is not ready.'],
      ['info', 'graph', 'Graph is empty.'],
    ]);
  });
});
