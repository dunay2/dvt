import { describe, expect, it } from 'vitest';

import {
  deriveCanvasDraftAccessPosture,
  toCanvasDraftToolbarState,
} from './canvasDraftAccessPostureModel';
import { deriveCanvasToolbarViewModel } from './canvasToolbarViewModel';

describe('canvasToolbarViewModel', () => {
  it('does not surface draft-synced workflow copy for blocked draft postures', () => {
    const posture = deriveCanvasDraftAccessPosture({
      draftAccessMode: 'forbidden',
      draftCapabilityReason: 'workspace_scope_denied',
      draftFormatError: null,
      authTransportPosture: 'none',
      recoveryReason: null,
      draftSaveStatus: 'idle',
    });
    const toolbar = deriveCanvasToolbarViewModel({
      draftToolbarState: toCanvasDraftToolbarState(posture),
      routeState: 'error_graph',
      canPlan: false,
      canRun: false,
      canStartRun: false,
      canvasAuthoringMode: 'transformation',
      planStatusSummary: 'Preview required before running.',
      transformationValidation: {
        valid: false,
        summaryCode: 'requires_three_nodes',
        draftSignature: 'draft',
        scopedNodeIds: [],
        scopedEdgeIds: [],
        nodeRolesById: {},
      },
      nodeCount: 0,
      edgeCount: 0,
    });

    expect(posture.toolbarLabel).not.toBe('Draft synced');
    expect(toolbar.workflowStatusLabel).toBe('Read only');
  });
});
