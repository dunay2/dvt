/** Owned concern: adapt the observed Canvas run to backend-authoritative drawer controls. */
import { useCallback, useMemo } from 'react';

import type { OperationalDrawerRunControls } from '../../components/shell/operationalDrawerContributionStore';
import { useRunSnapshotQuery } from '../../queries/runsQueries';
import { useRunControlCommands } from '../runs/useRunControlCommands';

export function useCanvasRunControlSurface(
  workspaceLayoutKey: string,
  runId: string | null
): OperationalDrawerRunControls | null {
  const commands = useRunControlCommands();
  const snapshotQuery = useRunSnapshotQuery(workspaceLayoutKey, runId ?? undefined);
  const cancel = useCallback(() => {
    if (runId != null) commands.cancelRun(runId);
  }, [commands, runId]);
  const recover = useCallback(() => {
    if (runId != null) commands.recoverRun(runId);
  }, [commands, runId]);
  const snapshot = snapshotQuery.data;

  return useMemo(() => {
    if (runId == null || snapshot?.runId !== runId || snapshot.controls == null) {
      return null;
    }

    return {
      runId,
      availability: snapshot.controls,
      activity: commands.activity,
      outcome: commands.outcome,
      failure: commands.failure,
      onCancel: cancel,
      onRecover: recover,
    };
  }, [cancel, commands.activity, commands.failure, commands.outcome, recover, runId, snapshot]);
}
