/** Owned concern: manage contextual Add Source dialog state for the Canvas shell. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type {
  CanvasShellOpenDataRegistryCommand,
  CanvasShellDataRegistryRequest,
} from './canvasShell.types';

type CanvasSourceImportDialogState = Readonly<{
  open: boolean;
  request: CanvasShellDataRegistryRequest | null;
  isCurrent: (request: CanvasShellDataRegistryRequest) => boolean;
  restoreFocus: (request: CanvasShellDataRegistryRequest) => void;
  openCommand: CanvasShellOpenDataRegistryCommand | undefined;
  close: () => void;
}>;

export function useCanvasSourceImportDialogState(
  canOpenSourceImport: boolean,
  ownerKey: string
): CanvasSourceImportDialogState {
  const owner = useMemo(() => ({ key: ownerKey }), [ownerKey]);
  const currentOwner = useRef(owner);
  currentOwner.current = owner;
  const [session, setSession] = useState<{
    owner: typeof owner;
    request: CanvasShellDataRegistryRequest;
  } | null>(null);
  const request = session?.owner === owner ? session.request : null;
  const currentRequest = useRef(session);
  const opener = useRef<{
    owner: typeof owner;
    request: CanvasShellDataRegistryRequest;
    element: HTMLElement;
  } | null>(null);
  const allowed = useRef(canOpenSourceImport);
  allowed.current = canOpenSourceImport;
  const isCurrent = useCallback(
    (candidate: CanvasShellDataRegistryRequest): boolean =>
      allowed.current &&
      currentRequest.current?.owner === currentOwner.current &&
      currentRequest.current?.request === candidate,
    []
  );
  const restoreFocus = useCallback((candidate: CanvasShellDataRegistryRequest): void => {
    const target = opener.current;
    if (
      target?.owner === currentOwner.current &&
      target.request === candidate &&
      target.element.isConnected
    )
      target.element.focus({ preventScroll: true });
  }, []);

  const close = useCallback(() => {
    if (currentOwner.current !== owner) return;
    currentRequest.current = null;
    setSession(null);
  }, [owner]);

  const openCommand = useMemo<CanvasShellOpenDataRegistryCommand | undefined>(() => {
    if (!canOpenSourceImport) {
      return undefined;
    }

    return (next = { intent: 'import-sources' }) => {
      if (currentOwner.current !== owner) return;
      const nextRequest: CanvasShellDataRegistryRequest =
        next.intent === 'manage-connections' ? { intent: 'manage-connections' } : { ...next };
      const nextSession = { owner, request: nextRequest };
      const element = document.activeElement;
      opener.current =
        element instanceof HTMLElement && element !== document.body
          ? { ...nextSession, element }
          : null;
      currentRequest.current = nextSession;
      setSession(nextSession);
    };
  }, [canOpenSourceImport, owner]);

  useEffect(() => {
    if (!canOpenSourceImport && request != null) {
      close();
    }
  }, [canOpenSourceImport, close, request]);

  return {
    open: canOpenSourceImport && request != null,
    request: canOpenSourceImport ? request : null,
    isCurrent,
    restoreFocus,
    openCommand,
    close,
  };
}
