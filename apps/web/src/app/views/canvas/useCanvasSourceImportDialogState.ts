/** Owned concern: manage contextual Add Source dialog state for the Canvas shell. */
import { useCallback, useEffect, useMemo, useState } from 'react';

import type {
  CanvasShellOpenDataRegistryCommand,
  CanvasShellSourceImportPlacement,
} from './canvasShell.types';

type CanvasSourceImportDialogState = Readonly<{
  open: boolean;
  initialSelection: Parameters<CanvasShellOpenDataRegistryCommand>[0];
  placement: CanvasShellSourceImportPlacement | undefined;
  openCommand: CanvasShellOpenDataRegistryCommand | undefined;
  close: () => void;
}>;

export function useCanvasSourceImportDialogState(
  canOpenSourceImport: boolean
): CanvasSourceImportDialogState {
  const [open, setOpen] = useState(false);
  const [initialSelection, setInitialSelection] =
    useState<Parameters<CanvasShellOpenDataRegistryCommand>[0]>(undefined);
  const [placement, setPlacement] = useState<CanvasShellSourceImportPlacement | undefined>(
    undefined
  );

  const close = useCallback(() => {
    setOpen(false);
    setInitialSelection(undefined);
    setPlacement(undefined);
  }, []);

  const openCommand = useMemo<CanvasShellOpenDataRegistryCommand | undefined>(() => {
    if (!canOpenSourceImport) {
      return undefined;
    }

    return (nextInitialSelection, nextPlacement) => {
      setInitialSelection(nextInitialSelection);
      setPlacement(nextPlacement);
      setOpen(true);
    };
  }, [canOpenSourceImport]);

  useEffect(() => {
    if (!canOpenSourceImport && open) {
      close();
    }
  }, [canOpenSourceImport, close, open]);

  return {
    open,
    initialSelection,
    placement,
    openCommand,
    close,
  };
}
