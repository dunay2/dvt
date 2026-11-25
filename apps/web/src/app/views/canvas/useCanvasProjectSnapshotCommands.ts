/** Owned concern: expose guarded project snapshot download/upload through the existing snapshot ports. */
import { useCallback } from 'react';
import { toast } from 'sonner';
import type {
  CanvasDraftLifecycle,
  CanvasDraftLifecycleDto,
  CanvasImportProjectSnapshotCommandDto,
  DraftSaveStatus,
} from './canvasDraftLifecycle.types';
import { executeImportProjectSnapshotCommand } from './canvasProjectSnapshotImportCommand';
import { canvasProjectSnapshot } from './canvasProjectSnapshot';
import { canvasViewCopy } from './copy';

type SnapshotCommandInputs = Omit<
  CanvasImportProjectSnapshotCommandDto,
  'file' | 'canImportProjectSnapshot'
> &
  Pick<CanvasDraftLifecycleDto['projection'], 'workspaceScope'> & {
    canPersistGraphDraft: boolean;
    draftSaveStatus: DraftSaveStatus;
  };

function resolveSnapshotAvailability({
  graphDraftQuery,
  canPersistGraphDraft,
  draftSaveStatus,
}: Pick<
  SnapshotCommandInputs,
  'graphDraftQuery' | 'canPersistGraphDraft' | 'draftSaveStatus'
>): Pick<CanvasDraftLifecycle, 'canExportProjectSnapshot' | 'canImportProjectSnapshot'> {
  return {
    canExportProjectSnapshot:
      graphDraftQuery.data?.record != null &&
      !graphDraftQuery.isPending &&
      !graphDraftQuery.isError &&
      draftSaveStatus !== 'saving' &&
      draftSaveStatus !== 'failed',
    canImportProjectSnapshot:
      canPersistGraphDraft && !graphDraftQuery.isPending && !graphDraftQuery.isError,
  };
}

function downloadSnapshot(exported: ReturnType<typeof canvasProjectSnapshot.exportFile>): void {
  const url = URL.createObjectURL(new Blob([exported.contents], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = exported.fileName;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function useExportProjectSnapshotCommand({
  graphDraftQuery,
  workspaceScope,
  canExportProjectSnapshot,
}: Pick<SnapshotCommandInputs, 'graphDraftQuery' | 'workspaceScope'> &
  Pick<
    CanvasDraftLifecycle,
    'canExportProjectSnapshot'
  >): CanvasDraftLifecycle['handleExportProjectSnapshot'] {
  return useCallback<CanvasDraftLifecycle['handleExportProjectSnapshot']>(() => {
    const record = graphDraftQuery.data?.record ?? null;
    if (!canExportProjectSnapshot || record == null) {
      toast.error(canvasViewCopy.projectSnapshotExportUnavailableMessage);
      return;
    }
    downloadSnapshot(
      canvasProjectSnapshot.exportFile({
        record,
        workspaceScope,
        exportedAt: new Date().toISOString(),
      })
    );
  }, [canExportProjectSnapshot, graphDraftQuery.data?.record, workspaceScope]);
}

function useImportProjectSnapshotCommand({
  draftRepository,
  graphDraftQuery,
  draftQueryCache,
  setDraftSession,
  setDraftSaveStatus,
  refs,
  invalidateInFlightSaveAttempt,
  canImportProjectSnapshot,
}: Omit<
  CanvasImportProjectSnapshotCommandDto,
  'file'
>): CanvasDraftLifecycle['handleImportProjectSnapshotFile'] {
  return useCallback<CanvasDraftLifecycle['handleImportProjectSnapshotFile']>(
    async (file) => {
      await executeImportProjectSnapshotCommand({
        file,
        canImportProjectSnapshot,
        draftRepository,
        graphDraftQuery,
        draftQueryCache,
        setDraftSession,
        setDraftSaveStatus,
        refs,
        invalidateInFlightSaveAttempt,
      });
    },
    [
      canImportProjectSnapshot,
      draftQueryCache,
      draftRepository,
      graphDraftQuery.data?.record?.revision,
      invalidateInFlightSaveAttempt,
      refs,
      setDraftSession,
      setDraftSaveStatus,
    ]
  );
}

export function useCanvasProjectSnapshotCommands(
  inputs: SnapshotCommandInputs
): Pick<
  CanvasDraftLifecycle,
  | 'canExportProjectSnapshot'
  | 'canImportProjectSnapshot'
  | 'handleExportProjectSnapshot'
  | 'handleImportProjectSnapshotFile'
> {
  const availability = resolveSnapshotAvailability(inputs);
  const handleExportProjectSnapshot = useExportProjectSnapshotCommand({
    graphDraftQuery: inputs.graphDraftQuery,
    workspaceScope: inputs.workspaceScope,
    canExportProjectSnapshot: availability.canExportProjectSnapshot,
  });
  const handleImportProjectSnapshotFile = useImportProjectSnapshotCommand({
    ...inputs,
    canImportProjectSnapshot: availability.canImportProjectSnapshot,
  });
  return {
    ...availability,
    handleExportProjectSnapshot,
    handleImportProjectSnapshotFile,
  };
}
