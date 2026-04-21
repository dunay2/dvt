import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  createCanvasRouteHarness,
  currentCanvasRouteState,
  getPrimaryCanvasButtons,
  renderCanvasRouteWithController,
} from './Canvas.test.support';

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
    expect(layoutButton).toBeDefined();
    expect(planButton).toBeDefined();
    expect(runButton).toBeDefined();
    expect(layoutButton?.getAttribute('disabled')).not.toBeNull();
    expect(planButton?.getAttribute('disabled')).not.toBeNull();
    expect(runButton?.getAttribute('disabled')).not.toBeNull();
  });

  it('keeps the viewport visible and shows limited access when the draft boundary is read_only', async () => {
    await renderCanvasRouteWithController(harness, {
      canStartRun: true,
      draftAccessMode: 'read_only',
      draftCapabilityReason: 'write_denied',
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
    expect(harness.container.textContent).toContain('Limited mutation access');
    expect(harness.container.textContent).toContain('graph edits');
    expect(layoutButton).toBeDefined();
    expect(planButton).toBeDefined();
    expect(runButton).toBeDefined();
    expect(layoutButton?.getAttribute('disabled')).not.toBeNull();
    expect(planButton?.getAttribute('disabled')).toBeNull();
    expect(runButton?.getAttribute('disabled')).toBeNull();
  });

  it('blocks the canvas with an explicit forbidden-draft message when the draft boundary denies reads', async () => {
    await renderCanvasRouteWithController(harness, {
      draftAccessMode: 'forbidden',
      draftCapabilityReason: 'workspace_scope_denied',
    });

    expect(harness.container.querySelector('[data-slot="canvas-blocked-state"]')).not.toBeNull();
    expect(harness.container.querySelector('[data-slot="canvas-viewport"]')).toBeNull();
    expect(harness.container.textContent).toContain('Draft access denied');
    expect(harness.container.textContent).toContain(
      'Canvas cannot read the persisted draft for the current workspace scope.'
    );
  });

  it('shows the typed unsupported-schema message when the persisted draft payload is unreadable', async () => {
    await renderCanvasRouteWithController(harness, {
      draftAccessMode: 'writable',
      draftFormatError: {
        reason: 'unsupported_schema_version',
        storedSchemaVersion: 'workspace-graph-draft.v0',
      },
    });

    expect(harness.container.querySelector('[data-slot="canvas-error-state"]')).not.toBeNull();
    expect(harness.container.querySelector('[data-slot="canvas-viewport"]')).toBeNull();
    expect(harness.container.textContent).toContain('Persisted draft format is unsupported');
    expect(harness.container.textContent).toContain('workspace-graph-draft.v0');
  });
});
