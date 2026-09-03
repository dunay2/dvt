import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  buildRemoteDraftRecord,
  createHarnessWithDraft,
  waitForAutosaveDebounce,
} from './useCanvasController.draftLifecycle.test.support';
import { projectCanvasHarnessDraftReadModel } from './useCanvasController.test.draftAuthoring';
import { setupCanvasControllerHarness } from './useCanvasController.test.harness';

describe('useCanvasController permission and posture contract', () => {
  let harness: ReturnType<typeof setupCanvasControllerHarness>;

  beforeEach(async () => {
    harness = await createHarnessWithDraft(
      buildRemoteDraftRecord({
        nodeIds: ['node_1', 'node_2'],
        nodePositions: {
          node_1: { x: 0, y: 0 },
          node_2: { x: 100, y: 0 },
        },
        edges: [{ sourceId: 'node_1', targetId: 'node_2' }],
      })
    );
  });

  afterEach(() => {
    harness.cleanup();
  });

  it('exposes source import when an authorized contribution is available', async () => {
    await harness.renderProbe();

    expect(harness.mocks.getSourceImportContributions).toHaveBeenCalled();
    expect(harness.getLatestResult()?.canOpenSourceImport).toBe(true);
  });

  it('gates source import when runtime capabilities disable the source import contribution', async () => {
    harness.mocks.useCapabilitiesQuery.mockReturnValue({
      data: {
        apiVersion: '0.1.0',
        minFrontendVersion: '0.1.0',
        plugins: {
          dbt: {
            available: false,
            reason: 'disabled for workspace',
          },
        },
      },
    });
    harness.mocks.getSourceImportContributions.mockReturnValue([]);

    await harness.renderProbe();

    expect(harness.getLatestResult()?.canOpenSourceImport).toBe(false);
  });

  it('applies draft access posture before exposing graph and execution commands', async () => {
    const projectedRemoteDraft = projectCanvasHarnessDraftReadModel(
      harness.state.remoteDraftRecord
    );

    harness.state.graphDraftQueryData = {
      ...projectedRemoteDraft,
      accessMode: 'read_only',
      capabilityReason: 'write_denied',
    };

    await harness.renderProbe();

    expect(harness.getLatestResult()?.draftAccessPosture.kind).toBe('read_only');
    expect(harness.getLatestResult()?.draftStatusState.label).toBe('Read-only draft');
    expect(harness.getLatestResult()?.userPermissions).toEqual(
      expect.objectContaining({
        canEditEdges: false,
        canPlan: false,
        canRun: false,
      })
    );
    expect(harness.getLatestResult()?.canOpenSourceImport).toBe(false);
    expect(harness.getLatestResult()?.canEditInspectorNode).toBe(false);
    expect(harness.getLatestResult()?.canStartRun).toBe(false);
    expect(harness.mocks.useCanvasExecutionActions).toHaveBeenLastCalledWith(
      expect.objectContaining({
        canPlan: false,
        canRun: false,
      })
    );
  });

  it('stops mutation and execution-selection handlers when graph edits and execution are gated', async () => {
    const userPermissions = harness.state.store.userPermissions as {
      canEditEdges: boolean;
    };
    harness.state.store.userPermissions = {
      ...userPermissions,
      canEditEdges: false,
    };
    await harness.renderProbe();

    const latestBuildNodesCall = harness.mocks.buildCanvasNodeInteractionPresentation.mock.calls.at(
      -1
    )?.[0] as
      | {
          handlers?: {
            onDuplicateNode?: unknown;
            onRemoveNode?: unknown;
            onToggleNodeSelection?: unknown;
          };
        }
      | undefined;

    expect(latestBuildNodesCall?.handlers?.onDuplicateNode).toBeUndefined();
    expect(latestBuildNodesCall?.handlers?.onRemoveNode).toBeUndefined();
    expect(latestBuildNodesCall?.handlers?.onToggleNodeSelection).toBeUndefined();
    expect(harness.state.graphHandlersResult.handleToggleNodeSelection).not.toHaveBeenCalled();
    expect(harness.mocks.useCanvasGraphHandlers).toHaveBeenCalledWith(
      expect.objectContaining({
        canEditEdges: false,
      })
    );
  });

  it('does not autosave the draft when graph edits are gated', async () => {
    const userPermissions = harness.state.store.userPermissions as {
      canPlan: boolean;
      canRun: boolean;
      canEditEdges: boolean;
      canManagePlugins: boolean;
      canManageRBAC: boolean;
    };
    harness.state.store.userPermissions = {
      ...userPermissions,
      canEditEdges: false,
    };

    await harness.renderProbe();
    await waitForAutosaveDebounce();

    expect(
      harness.state.services.workspaceGraphDraftAuthoringPort.saveGraphDraft
    ).not.toHaveBeenCalled();
  });
});
