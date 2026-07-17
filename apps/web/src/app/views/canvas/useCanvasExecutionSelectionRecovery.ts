/** Owned concern: adapt explicit execution-selection recovery commands to Canvas state and analysis refresh. */
import { useCallback, useMemo, useRef, useState } from 'react';

import type { CanvasExecutionSelectionIntent } from '../../types/canvasExecutionSelection';
import type {
  CanvasExecutionSelectionRecoveryCommands,
  CanvasExecutionSelectionRecoveryFailure,
  CanvasExecutionSelectionRecoveryReadModel,
  CanvasExecutionSelectionRecoveryReceipt,
  CanvasExecutionSelectionRecoveryStrategy,
} from '../../types/canvasExecutionSelectionRecovery';
import {
  buildCanvasExecutionSelectionRecoveryReadModel,
  recoverCanvasExecutionSelection,
} from './canvasExecutionSelectionRecovery';

type RecoveryCommandState = Readonly<{
  intentSignature: string;
  pendingStrategy: CanvasExecutionSelectionRecoveryStrategy | null;
  receipt: CanvasExecutionSelectionRecoveryReceipt | null;
  failure: CanvasExecutionSelectionRecoveryFailure | null;
}>;

type UseCanvasExecutionSelectionRecoveryArgs = Readonly<{
  enabled: boolean;
  selectionIntent: CanvasExecutionSelectionIntent;
  workspaceNodeIds: readonly string[];
  executableNodeIds: readonly string[];
  dependencyIdsByNodeId: ReadonlyMap<string, readonly string[]>;
  lastPreviewRevision: string | null;
  canRefreshAnalysis: boolean;
  setSelectionIntent: (intent: CanvasExecutionSelectionIntent) => void;
  refreshAnalysis: () => Promise<void>;
}>;

type UseCanvasExecutionSelectionRecoveryResult = Readonly<{
  model: CanvasExecutionSelectionRecoveryReadModel | null;
  commands: CanvasExecutionSelectionRecoveryCommands | null;
}>;

function buildIntentSignature(intent: CanvasExecutionSelectionIntent): string {
  return JSON.stringify({ mode: intent.mode, nodeIds: [...intent.nodeIds] });
}

function readFailureDetail(error: unknown): string | null {
  return error instanceof Error && error.message.trim().length > 0 ? error.message : null;
}

export function useCanvasExecutionSelectionRecovery({
  canRefreshAnalysis,
  dependencyIdsByNodeId,
  enabled,
  executableNodeIds,
  lastPreviewRevision,
  refreshAnalysis,
  selectionIntent,
  setSelectionIntent,
  workspaceNodeIds,
}: UseCanvasExecutionSelectionRecoveryArgs): UseCanvasExecutionSelectionRecoveryResult {
  const [commandState, setCommandState] = useState<RecoveryCommandState | null>(null);
  const refreshSequenceRef = useRef(0);
  const intentSignature = buildIntentSignature(selectionIntent);
  const baseModel = useMemo(
    () =>
      enabled
        ? buildCanvasExecutionSelectionRecoveryReadModel({
            selectionIntent,
            workspaceNodeIds,
            executableNodeIds,
            dependencyIdsByNodeId,
            lastPreviewRevision,
            canRefreshAnalysis,
          })
        : null,
    [
      canRefreshAnalysis,
      dependencyIdsByNodeId,
      enabled,
      executableNodeIds,
      lastPreviewRevision,
      selectionIntent,
      workspaceNodeIds,
    ]
  );
  const visibleCommandState =
    commandState?.intentSignature === intentSignature ? commandState : null;
  const model = useMemo<CanvasExecutionSelectionRecoveryReadModel | null>(
    () =>
      baseModel == null
        ? null
        : {
            ...baseModel,
            pendingStrategy: visibleCommandState?.pendingStrategy ?? null,
            receipt: visibleCommandState?.receipt ?? null,
            failure: visibleCommandState?.failure ?? null,
          },
    [baseModel, visibleCommandState]
  );

  const executeSelectionRecovery = useCallback(
    (strategy: Exclude<CanvasExecutionSelectionRecoveryStrategy, 'refresh_analysis'>) => {
      if (!enabled || baseModel == null) return;
      if (strategy === 'discard_unavailable' && !baseModel.canDiscardUnavailable) return;
      if (strategy === 'use_workspace_scope' && !baseModel.canUseWorkspaceScope) return;

      refreshSequenceRef.current += 1;
      const outcome = recoverCanvasExecutionSelection({
        strategy,
        selectionIntent,
        unavailableRootNodeIds: baseModel.unavailableRootNodeIds,
      });
      setSelectionIntent(outcome.nextSelectionIntent);
      setCommandState({
        intentSignature: buildIntentSignature(outcome.nextSelectionIntent),
        pendingStrategy: null,
        receipt: outcome.receipt,
        failure: null,
      });
    },
    [baseModel, enabled, selectionIntent, setSelectionIntent]
  );

  const executeRefreshAnalysis = useCallback(() => {
    if (!enabled || baseModel == null || !baseModel.canRefreshAnalysis) return;

    const refreshSequence = refreshSequenceRef.current + 1;
    refreshSequenceRef.current = refreshSequence;
    setCommandState({
      intentSignature,
      pendingStrategy: 'refresh_analysis',
      receipt: null,
      failure: null,
    });

    void Promise.resolve()
      .then(refreshAnalysis)
      .then(() => {
        if (refreshSequenceRef.current !== refreshSequence) return;
        const outcome = recoverCanvasExecutionSelection({
          strategy: 'refresh_analysis',
          selectionIntent,
          unavailableRootNodeIds: baseModel.unavailableRootNodeIds,
        });
        setCommandState({
          intentSignature,
          pendingStrategy: null,
          receipt: outcome.receipt,
          failure: null,
        });
      })
      .catch((error: unknown) => {
        if (refreshSequenceRef.current !== refreshSequence) return;
        setCommandState({
          intentSignature,
          pendingStrategy: null,
          receipt: null,
          failure: {
            rail: 'RecoverCanvasExecutionSelection',
            strategy: 'refresh_analysis',
            code: 'authority_refresh_failed',
            detail: readFailureDetail(error),
          },
        });
      });
  }, [baseModel, enabled, intentSignature, refreshAnalysis, selectionIntent]);

  const commands = useMemo<CanvasExecutionSelectionRecoveryCommands | null>(
    () =>
      enabled
        ? {
            discardUnavailable: () => executeSelectionRecovery('discard_unavailable'),
            useWorkspaceScope: () => executeSelectionRecovery('use_workspace_scope'),
            refreshAnalysis: executeRefreshAnalysis,
          }
        : null,
    [enabled, executeRefreshAnalysis, executeSelectionRecovery]
  );

  return { model, commands };
}
