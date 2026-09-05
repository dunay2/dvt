// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { buildController } from '../Canvas.test.controller';
import { deriveCanvasDraftAccessPosture } from './canvasDraftAccessPostureModel';
import { deriveCanvasRouteViewState } from './canvasRouteViewState';

describe('canvasRouteViewState', () => {
  it('uses one draft access posture for transport and interaction state', () => {
    const draftAccessPosture = deriveCanvasDraftAccessPosture({
      draftAccessMode: 'forbidden',
      draftCapabilityReason: 'workspace_scope_denied',
      draftFormatError: null,
      authTransportPosture: 'none',
      recoveryReason: null,
      draftSaveStatus: 'idle',
    });
    const viewState = deriveCanvasRouteViewState(
      buildController({
        draftAccessMode: 'forbidden',
        draftAccessPosture,
      })
    );

    expect(viewState.draftAccessPosture).toBe(draftAccessPosture);
    expect(viewState.workspaceScope).toMatchObject({
      tenantId: 'tenant-a',
      projectId: 'project-orders',
      environmentId: 'dev',
      targetAdapter: 'temporal',
    });
    expect(viewState.draftTransportError).toMatchObject({
      kind: 'forbidden_scope',
      title: 'Draft scope is forbidden',
    });
    expect(viewState.effectiveUserPermissions).toMatchObject({
      canPlan: false,
      canRun: false,
      canEditEdges: false,
    });
    expect(viewState.presentationState.draftStatusState.label).toBe('Draft access denied');
  });
});
