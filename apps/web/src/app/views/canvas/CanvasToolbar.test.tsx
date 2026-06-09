// @vitest-environment jsdom

/** Owned concern: prove Canvas toolbar command wiring and passive control behavior. */
import { fireEvent, waitFor } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Circle, Square } from 'lucide-react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import CanvasToolbar from './CanvasToolbar';
import { canvasViewCopy } from './copy';
import type { CanvasDraftToolbarState } from './canvasDraftToolbarState';
import { useCanvasViewMenuContributionStore } from './canvasViewMenuContributionStore';
import type { CanvasViewMenuContribution } from './canvasViewMenuContributionStore';
import type { TransformationGraphValidationResult } from './transformationGraphValidation';
import type { NodeKindRegistration } from '../../plugins/nodeTypeContracts';
import type { PlanRunReadinessReadModel } from './canvasPlanReadiness';

const nodeKinds: readonly NodeKindRegistration[] = [
  {
    kind: 'dvt:source',
    pluginId: 'dvt',
    label: 'Source',
    role: 'input',
    icon: Circle,
    borderClass: 'border-sky-500',
    minimapColor: '#0ea5e9',
    allowsIncoming: false,
    allowsOutgoing: true,
    supportsColumns: true,
  },
  {
    kind: 'dvt:sql_transform',
    pluginId: 'dvt',
    label: 'SQL transform',
    role: 'transform',
    icon: Square,
    borderClass: 'border-violet-500',
    minimapColor: '#8b5cf6',
    allowsIncoming: true,
    allowsOutgoing: true,
    supportsColumns: true,
  },
  {
    kind: 'dvt:sink',
    pluginId: 'dvt',
    label: 'Sink',
    role: 'output',
    icon: Square,
    borderClass: 'border-emerald-500',
    minimapColor: '#10b981',
    allowsIncoming: true,
    allowsOutgoing: false,
    supportsColumns: false,
  },
];

function buildToolbarProps(
  overrides?: Partial<React.ComponentProps<typeof CanvasToolbar>>
): React.ComponentProps<typeof CanvasToolbar> {
  return {
    onAutoLayout: vi.fn(),
    onToggleCostOverlay: vi.fn(),
    onToggleImpact: vi.fn(),
    onToggleColumns: vi.fn(),
    onToggleGridVisible: vi.fn(),
    onGridColorChange: vi.fn(),
    onToggleSnapToGrid: vi.fn(),
    onSetCanvasEmptyStateGuideVisible: vi.fn(),
    onReloadLatestDraft: vi.fn(),
    onExportProjectSnapshot: vi.fn(),
    onImportProjectSnapshotFile: vi.fn(),
    onPlan: vi.fn(),
    onRun: vi.fn(),
    routeState: 'ready',
    draftToolbarState: {
      label: canvasViewCopy.draftSyncedLabel,
      tone: 'neutral',
      showReloadAction: false,
    },
    canPlan: true,
    canPlanGraph: true,
    canRun: true,
    canEditEdges: true,
    canExportProjectSnapshot: true,
    canImportProjectSnapshot: true,
    canStartRun: false,
    planStatusSummary: canvasViewCopy.planStatusPreviewRequiredMessage,
    planRunReadiness: buildPlanRunReadiness(),
    canvasAuthoringMode: 'transformation',
    exclusiveOverlayMode: 'runtime',
    canUseCostOverlay: true,
    impactOverlayEnabled: false,
    columnLevelLineageEnabled: false,
    canvasGridVisible: true,
    canvasGridColor: '#94a3b8',
    canvasSnapToGrid: false,
    canvasEmptyStateGuideVisible: true,
    transformationValidation: buildValidationResult(),
    nodeCount: 3,
    edgeCount: 2,
    ...overrides,
  };
}

function buildPlanRunReadiness(
  overrides?: Partial<PlanRunReadinessReadModel>
): PlanRunReadinessReadModel {
  return {
    blockers: ['plan_integrity'],
    rail: 'ObservePlanRunReadiness',
    status: 'blocked',
    summary: canvasViewCopy.planStatusPreviewRequiredMessage,
    ...overrides,
  };
}

function buildValidationResult(
  overrides?: Partial<TransformationGraphValidationResult>
): TransformationGraphValidationResult {
  return {
    valid: true,
    summaryCode: 'valid',
    draftSignature: 'nodes:src,tx,sink|edges:e1,e2',
    scopedNodeIds: ['src', 'tx', 'sink'],
    scopedEdgeIds: ['e1', 'e2'],
    nodeRolesById: {
      src: 'source',
      tx: 'sql_transform',
      sink: 'sink',
    },
    ...overrides,
  };
}

function buildCanvasViewMenuContribution(
  overrides?: Partial<CanvasViewMenuContribution>
): CanvasViewMenuContribution {
  return {
    canEditEdges: true,
    canUseCostOverlay: true,
    exclusiveOverlayMode: 'runtime',
    impactOverlayEnabled: false,
    columnLevelLineageEnabled: false,
    canvasGridVisible: true,
    canvasGridColor: '#94a3b8',
    canvasSnapToGrid: false,
    canvasEmptyStateGuideVisible: true,
    onAutoLayout: vi.fn(),
    onToggleCostOverlay: vi.fn(),
    onToggleImpact: vi.fn(),
    onToggleColumns: vi.fn(),
    onToggleGridVisible: vi.fn(),
    onGridColorChange: vi.fn(),
    onToggleSnapToGrid: vi.fn(),
    onSetCanvasEmptyStateGuideVisible: vi.fn(),
    ...overrides,
  };
}

describe('CanvasToolbar', () => {
  let container: HTMLDivElement;
  let root: Root;
  const defaultDraftToolbarState: CanvasDraftToolbarState = {
    label: canvasViewCopy.draftSyncedLabel,
    tone: 'neutral',
    showReloadAction: false,
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    useCanvasViewMenuContributionStore.setState({ contribution: null });
    container.remove();
  });

  it('renders one workflow status and core actions in top-bar mode', async () => {
    await act(async () => {
      root.render(
        <CanvasToolbar
          {...buildToolbarProps({
            draftToolbarState: defaultDraftToolbarState,
          })}
        />
      );
    });

    expect(container.querySelectorAll('[data-slot="canvas-workflow-status"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-slot="plan-run-readiness-panel"]')).toHaveLength(1);
    expect(container.textContent).toContain(canvasViewCopy.toolbarWorkflowPlanRequiredLabel);
    expect(container.textContent).not.toContain(canvasViewCopy.toolbarLayoutLabel);
    expect(container.textContent).not.toContain(canvasViewCopy.toolbarImpactLabel);
    expect(container.textContent).not.toContain(canvasViewCopy.toolbarColumnsLabel);
    expect(container.textContent).not.toContain(canvasViewCopy.toolbarCostLabel);
    expect(container.textContent).not.toContain(canvasViewCopy.toolbarGridLabel);
    expect(container.textContent).not.toContain(canvasViewCopy.toolbarSnapToGridLabel);
    expect(container.textContent).toContain(canvasViewCopy.toolbarPlanLabel);
    expect(container.textContent).toContain(canvasViewCopy.toolbarRunLabel);
    expect(container.textContent).toContain(canvasViewCopy.draftSyncedLabel);
  });

  it('registers canvas view preference commands for the View menu', async () => {
    const onToggleGridVisible = vi.fn();
    const onGridColorChange = vi.fn();
    const onToggleSnapToGrid = vi.fn();
    const onSetCanvasEmptyStateGuideVisible = vi.fn();

    await act(async () => {
      root.render(
        <CanvasToolbar
          {...buildToolbarProps({
            onToggleGridVisible,
            onGridColorChange,
            onToggleSnapToGrid,
            onSetCanvasEmptyStateGuideVisible,
            canvasGridVisible: false,
            canvasGridColor: '#f97316',
            canvasSnapToGrid: true,
            canvasEmptyStateGuideVisible: false,
          })}
        />
      );
    });

    const { useCanvasViewMenuContributionStore } =
      await import('./canvasViewMenuContributionStore');
    const contribution = useCanvasViewMenuContributionStore.getState().contribution;

    expect(contribution?.canvasGridVisible).toBe(false);
    expect(contribution?.canvasGridColor).toBe('#f97316');
    expect(contribution?.canvasSnapToGrid).toBe(true);
    expect(contribution?.canvasEmptyStateGuideVisible).toBe(false);

    contribution?.onToggleGridVisible();
    contribution?.onToggleSnapToGrid();
    contribution?.onGridColorChange('#22c55e');
    contribution?.onSetCanvasEmptyStateGuideVisible(true);

    expect(onToggleGridVisible).toHaveBeenCalledTimes(1);
    expect(onToggleSnapToGrid).toHaveBeenCalledTimes(1);
    expect(onGridColorChange).toHaveBeenCalledWith('#22c55e');
    expect(onSetCanvasEmptyStateGuideVisible).toHaveBeenCalledWith(true);
  });

  it('does not let a stale View menu cleanup clear an active replacement contribution', () => {
    const staleContribution = buildCanvasViewMenuContribution({
      canvasGridVisible: false,
    });
    const activeContribution = buildCanvasViewMenuContribution({
      canvasGridVisible: true,
    });

    const { registerCanvasViewMenuContribution, clearCanvasViewMenuContribution } =
      useCanvasViewMenuContributionStore.getState();

    registerCanvasViewMenuContribution(staleContribution);
    registerCanvasViewMenuContribution(activeContribution);
    clearCanvasViewMenuContribution(staleContribution);

    expect(useCanvasViewMenuContributionStore.getState().contribution).toBe(activeContribution);

    clearCanvasViewMenuContribution(activeContribution);

    expect(useCanvasViewMenuContributionStore.getState().contribution).toBeNull();
  });

  it('exposes project snapshot export and import commands without adding manual Save', async () => {
    const onExportProjectSnapshot = vi.fn();
    const onImportProjectSnapshotFile = vi.fn();

    await act(async () => {
      root.render(
        <CanvasToolbar
          {...buildToolbarProps({
            draftToolbarState: defaultDraftToolbarState,
            onExportProjectSnapshot,
            onImportProjectSnapshotFile,
          })}
        />
      );
    });

    const projectMenuTrigger = container.querySelector<HTMLButtonElement>(
      '[data-slot="canvas-toolbar-project-menu-trigger"]'
    );
    expect(projectMenuTrigger).not.toBeNull();
    expect(container.textContent).not.toContain('Save');

    await act(async () => {
      fireEvent.pointerDown(projectMenuTrigger!);
    });

    await waitFor(() => {
      expect(
        document.body.querySelector('[data-slot="canvas-toolbar-export-command"]')
      ).not.toBeNull();
      expect(
        document.body.querySelector('[data-slot="canvas-toolbar-import-command"]')
      ).not.toBeNull();
    });

    await act(async () => {
      fireEvent.click(document.body.querySelector('[data-slot="canvas-toolbar-export-command"]')!);
    });

    expect(onExportProjectSnapshot).toHaveBeenCalledTimes(1);
    expect(onImportProjectSnapshotFile).not.toHaveBeenCalled();
    expect(container.querySelector('input[type="file"]')).not.toBeNull();
  });

  it('opens the active-canvas Insert/Add palette without adding a permanent rail', async () => {
    const onCreateAuthoringNode = vi.fn();

    await act(async () => {
      root.render(
        <CanvasToolbar
          {...buildToolbarProps({
            draftToolbarState: defaultDraftToolbarState,
            authoringNodeKinds: nodeKinds,
            onCreateAuthoringNode,
          })}
        />
      );
    });

    const insertButton = container.querySelector<HTMLButtonElement>(
      '[data-slot="canvas-toolbar-insert-command"]'
    );

    expect(insertButton).not.toBeNull();
    expect(insertButton?.textContent).toContain('Insert');
    expect(container.querySelector('[data-slot="canvas-add-node-palette"]')).toBeNull();

    await act(async () => {
      insertButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const search = document.body.querySelector<HTMLInputElement>(
      '[data-slot="canvas-add-node-palette-search"]'
    );
    const palette = document.body.querySelector('[data-slot="canvas-add-node-palette"]');
    expect(palette).not.toBeNull();
    expect(palette?.parentElement).toBe(document.body);

    await act(async () => {
      search?.focus();
      search?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      search?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });

    expect(onCreateAuthoringNode).toHaveBeenCalledTimes(1);
    expect(onCreateAuthoringNode).toHaveBeenCalledWith(nodeKinds[1]);
  });

  it('offers governed SQL transformation templates from the Insert palette', async () => {
    const onCreateAuthoringNode = vi.fn();

    await act(async () => {
      root.render(
        <CanvasToolbar
          {...buildToolbarProps({
            draftToolbarState: defaultDraftToolbarState,
            authoringNodeKinds: nodeKinds,
            onCreateAuthoringNode,
          })}
        />
      );
    });

    const insertButton = container.querySelector<HTMLButtonElement>(
      '[data-slot="canvas-toolbar-insert-command"]'
    );

    await act(async () => {
      insertButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(document.body.textContent).toContain('Filter rows');
    expect(document.body.textContent).toContain('Join sources');

    const search = document.body.querySelector<HTMLInputElement>(
      '[data-slot="canvas-add-node-palette-search"]'
    );
    await act(async () => {
      if (search) {
        search.value = 'aggregate';
      }
      search?.dispatchEvent(new InputEvent('input', { bubbles: true, data: 'aggregate' }));
    });

    expect(document.body.textContent).toContain('Aggregate metrics');
    expect(document.body.textContent).not.toContain('Filter rows');

    const aggregateTemplate = Array.from(
      document.body.querySelectorAll<HTMLButtonElement>(
        '[data-slot="canvas-add-node-palette-option"][data-option-kind="transformation-template"]'
      )
    ).find((button) => button.textContent?.includes('Aggregate metrics'));

    await act(async () => {
      aggregateTemplate?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onCreateAuthoringNode).toHaveBeenCalledWith(
      nodeKinds[1],
      undefined,
      expect.objectContaining({
        namePrefix: 'Aggregate metrics',
        metadata: expect.objectContaining({
          transformationTemplateId: 'aggregate-metrics',
          sql: expect.stringContaining('group by'),
          config: expect.objectContaining({
            sql: expect.stringContaining('group by'),
          }),
        }),
      })
    );
  });

  it('offers explicit SQL output target templates from the Insert palette', async () => {
    const onCreateAuthoringNode = vi.fn();

    await act(async () => {
      root.render(
        <CanvasToolbar
          {...buildToolbarProps({
            draftToolbarState: defaultDraftToolbarState,
            authoringNodeKinds: nodeKinds,
            onCreateAuthoringNode,
          })}
        />
      );
    });

    const insertButton = container.querySelector<HTMLButtonElement>(
      '[data-slot="canvas-toolbar-insert-command"]'
    );

    await act(async () => {
      insertButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(document.body.textContent).toContain('Analytics table');
    expect(document.body.textContent).toContain('Reporting view');
    expect(document.body.textContent).toContain('analytics.transformed_output');
    expect(document.body.textContent).toContain('table');
    expect(document.body.textContent).toContain('replace');

    const search = document.body.querySelector<HTMLInputElement>(
      '[data-slot="canvas-add-node-palette-search"]'
    );
    await act(async () => {
      if (search) {
        search.value = 'reporting';
      }
      search?.dispatchEvent(new InputEvent('input', { bubbles: true, data: 'reporting' }));
    });

    expect(document.body.textContent).toContain('Reporting view');
    expect(document.body.textContent).toContain('reporting.transformed_view');
    expect(document.body.textContent).toContain('view');
    expect(document.body.textContent).toContain('replace');
    expect(document.body.textContent).not.toContain('Analytics table');

    const reportingTarget = Array.from(
      document.body.querySelectorAll<HTMLButtonElement>(
        '[data-slot="canvas-add-node-palette-option"][data-option-kind="output-target-template"]'
      )
    ).find((button) => button.textContent?.includes('Reporting view'));

    await act(async () => {
      reportingTarget?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onCreateAuthoringNode).toHaveBeenCalledWith(
      nodeKinds[2],
      undefined,
      expect.objectContaining({
        namePrefix: 'Reporting view',
        metadata: expect.objectContaining({
          outputTargetTemplateId: 'reporting-view-replace',
          config: expect.objectContaining({
            schema: 'reporting',
            table: 'transformed_view',
            materialization: 'view',
            writeMode: 'replace',
          }),
        }),
      })
    );
  });

  it('keeps plan button disabled when transformation validation is invalid', async () => {
    await act(async () => {
      root.render(
        <CanvasToolbar
          {...buildToolbarProps({
            draftToolbarState: defaultDraftToolbarState,
            canUseCostOverlay: false,
            transformationValidation: buildValidationResult({
              valid: false,
              summaryCode: 'requires_three_nodes',
            }),
            canPlanGraph: false,
            nodeCount: 2,
            edgeCount: 1,
          })}
        />
      );
    });

    const planButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes(canvasViewCopy.toolbarPlanLabel)
    );
    expect(planButton?.getAttribute('disabled')).not.toBeNull();
    expect(container.textContent).toContain(canvasViewCopy.toolbarWorkflowPlanRequiredLabel);
  });

  it('shows run ready when execution can start', async () => {
    await act(async () => {
      root.render(
        <CanvasToolbar
          {...buildToolbarProps({
            draftToolbarState: defaultDraftToolbarState,
            canStartRun: true,
            planStatusSummary: canvasViewCopy.planStatusPreviewReadyMessage,
            canUseCostOverlay: false,
          })}
        />
      );
    });

    expect(container.textContent).toContain(canvasViewCopy.toolbarWorkflowRunReadyLabel);
  });

  it('shows read only and disables actions when plan and run are unavailable', async () => {
    await act(async () => {
      root.render(
        <CanvasToolbar
          {...buildToolbarProps({
            draftToolbarState: defaultDraftToolbarState,
            canPlan: false,
            canRun: false,
            canEditEdges: false,
            planStatusSummary: canvasViewCopy.planStatusRunUnavailableMessage,
            canUseCostOverlay: false,
          })}
        />
      );
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    const planButton = buttons.find((button) =>
      button.textContent?.includes(canvasViewCopy.toolbarPlanLabel)
    );
    const runButton = buttons.find((button) =>
      button.textContent?.includes(canvasViewCopy.toolbarRunLabel)
    );

    expect(container.textContent).toContain(canvasViewCopy.toolbarWorkflowReadOnlyLabel);
    expect(planButton?.getAttribute('disabled')).not.toBeNull();
    expect(runButton?.getAttribute('disabled')).not.toBeNull();
  });

  it('shows recovery draft status and exposes reload action when recovery is active', async () => {
    const onReloadLatestDraft = vi.fn();

    await act(async () => {
      root.render(
        <CanvasToolbar
          {...buildToolbarProps({
            onReloadLatestDraft,
            routeState: 'recovery',
            draftToolbarState: {
              label: canvasViewCopy.draftMissingLabel,
              tone: 'warning',
              showReloadAction: true,
            },
            canPlan: false,
            canRun: false,
            canEditEdges: false,
            planStatusSummary: canvasViewCopy.planStatusRunUnavailableMessage,
            canUseCostOverlay: false,
          })}
        />
      );
    });

    expect(container.textContent).toContain(canvasViewCopy.toolbarWorkflowRecoveryLabel);
    expect(container.textContent).toContain(canvasViewCopy.draftMissingLabel);
    const reloadButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes(canvasViewCopy.reloadLatestDraftLabel)
    );
    expect(reloadButton).not.toBeNull();

    await act(async () => {
      reloadButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onReloadLatestDraft).toHaveBeenCalledTimes(1);
  });

  it('keeps workflow posture out of recovery when reload remains available on a blocked route', async () => {
    await act(async () => {
      root.render(
        <CanvasToolbar
          {...buildToolbarProps({
            routeState: 'blocked_backend',
            draftToolbarState: {
              label: canvasViewCopy.draftMissingLabel,
              tone: 'warning',
              showReloadAction: true,
            },
            canPlan: false,
            canRun: false,
            canEditEdges: false,
            planStatusSummary: canvasViewCopy.planStatusRunUnavailableMessage,
            canUseCostOverlay: false,
          })}
        />
      );
    });

    expect(container.textContent).toContain(canvasViewCopy.toolbarWorkflowReadOnlyLabel);
    expect(container.textContent).not.toContain(canvasViewCopy.toolbarWorkflowRecoveryLabel);
    expect(container.textContent).toContain(canvasViewCopy.reloadLatestDraftLabel);
  });
});
