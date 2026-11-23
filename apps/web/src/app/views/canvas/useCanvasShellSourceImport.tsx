/** Owned concern: connect the current Canvas import command to its scoped dialog and provider. */
import { useEffect, useMemo, useRef } from 'react';
import { DEFAULT_SOURCE_IMPORT_ENTRY } from '../../components/sourceImportWizard/constants';
import { getSourceImportContributions, getSourceImportOptions } from '../../plugins/registry';
import type { CanvasContextMenuPosition } from './canvasInteractionCommandSurface';
import {
  type CanvasShellOpenDataRegistryCommand,
  type CanvasShellProps,
} from './canvasShell.types';
import { CanvasSourceImportDialogHost } from './CanvasSourceImportDialogHost';
import { useCanvasSourceImportDialogState } from './useCanvasSourceImportDialogState';

export function useCanvasShellSourceImport({
  activeCanvasId,
  scope,
  runtimeCapabilities,
  canOpenSourceImport,
  initialSelection,
  onInitialSelectionConsumed,
  onComplete,
}: Readonly<{
  activeCanvasId: CanvasShellProps['panels']['activeCanvasId'];
  scope: CanvasShellProps['panels']['inspectorAuthoring']['workspaceScope'];
  runtimeCapabilities: CanvasShellProps['panels']['runtimeCapabilities'];
  canOpenSourceImport: CanvasShellProps['layout']['canOpenSourceImport'];
  initialSelection: CanvasShellProps['sourceImportInitialSelection'];
  onInitialSelectionConsumed: CanvasShellProps['onSourceImportInitialSelectionConsumed'];
  onComplete: CanvasShellProps['graphCommands']['onSourceImportComplete'];
}>) {
  const options = useMemo(() => getSourceImportOptions(runtimeCapabilities), [runtimeCapabilities]);
  const contributions = useMemo(
    () => getSourceImportContributions(runtimeCapabilities),
    [runtimeCapabilities]
  );
  const available = canOpenSourceImport && contributions.length > 0;
  const ownerKey = JSON.stringify([
    scope?.tenantId,
    scope?.projectId,
    scope?.environmentId,
    activeCanvasId,
  ]);
  const dialog = useCanvasSourceImportDialogState(available, ownerKey);
  const retainedOwner = useRef({ selection: initialSelection, ownerKey });
  if (retainedOwner.current.selection !== initialSelection) {
    retainedOwner.current = { selection: initialSelection, ownerKey };
  }
  const retainedSelection =
    retainedOwner.current.ownerKey === ownerKey ? initialSelection : undefined;
  const openRequest = dialog.openCommand;

  useEffect(() => {
    if (retainedSelection != null) {
      openRequest?.({ intent: 'import-sources', initialSelection: retainedSelection });
    }
  }, [openRequest, retainedSelection]);

  const open = useMemo<CanvasShellOpenDataRegistryCommand | undefined>(() => {
    if (openRequest == null) return undefined;
    return (request = DEFAULT_SOURCE_IMPORT_ENTRY) => {
      if (request.intent === 'manage-connections') {
        openRequest(request);
        return;
      }
      openRequest({
        ...request,
        initialSelection: request.initialSelection ?? retainedSelection,
      });
    };
  }, [openRequest, retainedSelection]);

  const openFromContext =
    openRequest == null
      ? undefined
      : (position?: CanvasContextMenuPosition) =>
          openRequest({
            intent: 'import-sources',
            ...(position == null ? {} : { placement: { canvasPosition: position } }),
          });

  function completeImport(
    request: NonNullable<typeof dialog.request>,
    ...args: Parameters<typeof onComplete>
  ): void {
    if (request.intent !== 'import-sources' || !dialog.isCurrent(request)) return;
    onComplete(...args);
    if (request.initialSelection?.kind === 'dbt-source-binding') onInitialSelectionConsumed?.();
  }

  function renderTask(restoreContextFocus: () => void): JSX.Element | null {
    const request = dialog.request;
    if (activeCanvasId == null || request == null) return null;
    const isImport = request.intent === 'import-sources';
    return (
      <CanvasSourceImportDialogHost
        open
        canvasId={activeCanvasId}
        onClose={() => {
          if (dialog.isCurrent(request)) dialog.close();
        }}
        onRestoreFocus={isImport ? restoreContextFocus : () => dialog.restoreFocus(request)}
        onComplete={(result, placement) => completeImport(request, result, placement)}
        sourceImportOptions={options}
        entry={request}
        placement={isImport ? request.placement : undefined}
      />
    );
  }

  return {
    available,
    open,
    openFromContext,
    manageConnections: open == null ? undefined : () => open({ intent: 'manage-connections' }),
    renderTask,
  };
}
