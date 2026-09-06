import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  buildCanvasRouteReadyNodes,
  createCanvasRouteHarness,
  expectActiveCanvasShellIdentity,
  getPrimaryCanvasButtons,
  renderCanvasRouteWithController,
} from './Canvas.test.support';
import { deriveCanvasDraftAccessPosture } from './canvas/canvasDraftAccessPostureModel';

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
      nodesWithImpact: buildCanvasRouteReadyNodes(),
      authorizationPermissions: {
        canPlan: false,
        canRun: false,
        canEditEdges: false,
        canPersistGraphDraft: false,
        canManagePlugins: false,
        canManageRBAC: false,
      },
      userPermissions: {
        canPlan: false,
        canRun: false,
        canEditEdges: false,
        canPersistGraphDraft: false,
        canManagePlugins: false,
        canManageRBAC: false,
      },
    });
    const { layoutButton, planButton, runButton } = getPrimaryCanvasButtons(harness.container);

    expect(harness.container.querySelector('[data-slot="canvas-viewport"]')).not.toBeNull();
    expect(harness.container.querySelector('[data-slot="canvas-readonly-state"]')).not.toBeNull();
    expect(harness.container.textContent).toContain('Read-only canvas');
    expect(layoutButton).toBeUndefined();
    expect(planButton).toBeUndefined();
    expect(runButton).toBeUndefined();
    expectActiveCanvasShellIdentity({
      container: harness.container,
      title: 'Main canvas',
      kindLabel: 'Transformation',
    });
    expect(harness.container.querySelector('[data-slot="canvas-draft-save-status"]')).toBeNull();
  });

  it('keeps the viewport visible and shows limited access when the draft boundary is read_only', async () => {
    const scopeTrigger = document.createElement('button');
    scopeTrigger.dataset.slot = 'shell-workspace-context-trigger';
    document.body.append(scopeTrigger);

    await renderCanvasRouteWithController(harness, {
      nodesWithImpact: buildCanvasRouteReadyNodes(),
      canPlanGraph: true,
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
    const accessState = harness.container.querySelector('[data-slot="canvas-readonly-state"]');

    expect(accessState).not.toBeNull();
    expect(accessState?.className).toContain('py-1.5');
    expect(harness.container.textContent).toContain('Read-only canvas');
    expect(harness.container.textContent).toContain('Use an executable workspace scope');
    expect(harness.container.textContent).toContain('Choose execution scope');
    expect(layoutButton).toBeUndefined();
    expect(planButton).toBeUndefined();
    expect(runButton).toBeUndefined();
    expectActiveCanvasShellIdentity({
      container: harness.container,
      title: 'Main canvas',
      kindLabel: 'Transformation',
    });
    const draftStatus = harness.container.querySelector('[data-slot="canvas-draft-save-status"]');

    expect(draftStatus).not.toBeNull();
    expect(draftStatus?.textContent).toContain('Read-only draft');
    expect(harness.container.textContent).not.toContain('Inspect only');

    harness.container
      .querySelector<HTMLButtonElement>('[data-slot="canvas-readonly-state"] button')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(document.activeElement).toBe(scopeTrigger);
    scopeTrigger.remove();
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
