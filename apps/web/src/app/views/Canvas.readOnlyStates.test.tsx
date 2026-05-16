import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  createCanvasRouteHarness,
  currentCanvasRouteState,
  getPrimaryCanvasButtons,
  renderCanvasRouteWithController,
} from './Canvas.test.support';
import { deriveCanvasDraftAccessPosture } from './canvas/canvasDraftAccessPostureModel';
import { useCanvasViewMenuContributionStore } from './canvas/canvasViewMenuContributionStore';

describe('Canvas route access states', () => {
  let harness: ReturnType<typeof createCanvasRouteHarness>;

  beforeEach(() => {
    harness = createCanvasRouteHarness();
  });

  afterEach(() => {
    harness.cleanup();
  });

  it('keeps the viewport visible and shows a read-only banner when mutations are gated', async () => {
    await renderCanvasRouteWithController(harness, {
      userPermissions: {
        canPlan: false,
        canRun: false,
        canEditEdges: false,
        canManagePlugins: false,
        canManageRBAC: false,
      },
    });
    const { layoutButton, planButton, runButton } = getPrimaryCanvasButtons(harness.container);

    expect(harness.container.querySelector('[data-slot="canvas-viewport"]')).not.toBeNull();
    expect(harness.container.querySelector('[data-slot="canvas-readonly-state"]')).not.toBeNull();
    expect(harness.container.textContent).toContain('Read-only canvas');
    expect(currentCanvasRouteState().explorerProps).toMatchObject({
      canEditGraph: false,
    });
    expect(currentCanvasRouteState().explorerProps?.onOpenDataRegistry).toBeUndefined();
    expect(layoutButton).toBeUndefined();
    expect(planButton).toBeDefined();
    expect(runButton).toBeDefined();
    expect(planButton?.getAttribute('disabled')).not.toBeNull();
    expect(runButton?.getAttribute('disabled')).not.toBeNull();
    expect(useCanvasViewMenuContributionStore.getState().contribution).toMatchObject({
      canEditEdges: false,
    });
  });

  it('keeps the viewport visible and shows limited access when the draft boundary is read_only', async () => {
    await renderCanvasRouteWithController(harness, {
      canStartRun: true,
      draftAccessMode: 'read_only',
      draftCapabilityReason: 'write_denied',
      draftAccessPosture: deriveCanvasDraftAccessPosture({
        draftAccessMode: 'read_only',
        draftCapabilityReason: 'write_denied',
        draftFormatError: null,
        authTransportPosture: 'none',
        recoveryReason: null,
        draftSaveStatus: 'idle',
      }),
      transformationValidation: {
        valid: true,
        summaryCode: 'valid',
        draftSignature: 'draft',
        scopedNodeIds: [],
        scopedEdgeIds: [],
        nodeRolesById: {},
      },
    });
    const { layoutButton, planButton, runButton } = getPrimaryCanvasButtons(harness.container);

    expect(harness.container.querySelector('[data-slot="canvas-viewport"]')).not.toBeNull();
    expect(harness.container.querySelector('[data-slot="canvas-readonly-state"]')).not.toBeNull();
    expect(harness.container.textContent).toContain('Read-only canvas');
    expect(harness.container.textContent).toContain('graph edits');
    expect(layoutButton).toBeUndefined();
    expect(planButton).toBeDefined();
    expect(runButton).toBeDefined();
    expect(planButton?.getAttribute('disabled')).not.toBeNull();
    expect(runButton?.getAttribute('disabled')).not.toBeNull();
    expect(useCanvasViewMenuContributionStore.getState().contribution).toMatchObject({
      canEditEdges: false,
    });
    expect(harness.container.textContent).toContain('Draft is read-only');
  });

  it('blocks the canvas with an explicit forbidden-draft message when the draft boundary denies reads', async () => {
    await renderCanvasRouteWithController(harness, {
      draftAccessMode: 'forbidden',
      draftCapabilityReason: 'workspace_scope_denied',
      draftAccessPosture: deriveCanvasDraftAccessPosture({
        draftAccessMode: 'forbidden',
        draftCapabilityReason: 'workspace_scope_denied',
        draftFormatError: null,
        authTransportPosture: 'none',
        recoveryReason: null,
        draftSaveStatus: 'idle',
      }),
    });

    expect(harness.container.querySelector('[data-slot="canvas-blocked-state"]')).not.toBeNull();
    expect(harness.container.querySelector('[data-slot="canvas-viewport"]')).toBeNull();
    expect(harness.container.textContent).toContain('Draft scope is forbidden');
    expect(harness.container.textContent).toContain(
      'Canvas cannot read this workspace draft with the current tenant, project, or permission scope.'
    );
  });

  it('shows the typed unsupported-schema message when the persisted draft payload is unreadable', async () => {
    await renderCanvasRouteWithController(harness, {
      draftAccessMode: 'writable',
      draftFormatError: {
        reason: 'unsupported_schema_version',
        storedSchemaVersion: 'workspace-graph-draft.v0',
      },
      draftAccessPosture: deriveCanvasDraftAccessPosture({
        draftAccessMode: 'writable',
        draftCapabilityReason: 'authorized',
        draftFormatError: {
          reason: 'unsupported_schema_version',
          storedSchemaVersion: 'workspace-graph-draft.v0',
        },
        authTransportPosture: 'none',
        recoveryReason: null,
        draftSaveStatus: 'idle',
      }),
    });

    expect(harness.container.querySelector('[data-slot="canvas-error-state"]')).not.toBeNull();
    expect(harness.container.querySelector('[data-slot="canvas-viewport"]')).toBeNull();
    expect(harness.container.textContent).toContain('Persisted draft format is unsupported');
    expect(harness.container.textContent).toContain('workspace-graph-draft.v0');
  });
});
