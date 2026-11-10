/** Translate one Router entry request into the existing guarded Code command. */
import { useEffect, useRef } from 'react';
import { useInRouterContext, useLocation, useNavigate } from 'react-router';

export const canvasCodeRouteEntryState = { canvasWorkbench: 'code' } as const;

type Props = Readonly<{
  ownerKey: string | null;
  onOpen: () => Promise<boolean>;
}>;
type PendingEntry = Readonly<{
  ownerKey: string;
  url: string;
  sourceKey: string;
  consumedState: Record<string, unknown>;
}>;

function RouterCodeRouteEntry({ ownerKey, onOpen }: Props): null {
  const location = useLocation();
  const navigate = useNavigate();
  const pending = useRef<PendingEntry | null>(null);
  const attemptedEntryKey = useRef<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    // The first StrictMode effect is cleaned up before admission can invalidate its owner.
    void Promise.resolve()
      .then(async () => {
        if (cancelled) return;
        if (ownerKey == null) {
          pending.current = null;
          return;
        }
        const url = `${location.pathname}${location.search}${location.hash}`;
        const request = pending.current;
        if (request != null) {
          if (request.ownerKey === ownerKey && request.url === url) {
            // Observe our actual Router commit; a blocked replace never reaches this state.
            if (location.state === request.consumedState) {
              pending.current = null;
              await onOpen();
              return;
            }
            if (location.key === request.sourceKey) return;
          }
          pending.current = null;
        }
        const state: unknown = location.state;
        if (
          location.key === attemptedEntryKey.current ||
          typeof state !== 'object' ||
          state == null ||
          Array.isArray(state) ||
          !Object.hasOwn(state, 'canvasWorkbench') ||
          (state as Record<string, unknown>).canvasWorkbench !== 'code'
        )
          return;
        const consumedState = { ...state } as Record<string, unknown>;
        delete consumedState.canvasWorkbench;
        const entry = { ownerKey, url, sourceKey: location.key, consumedState };
        attemptedEntryKey.current = location.key;
        pending.current = entry;
        try {
          await navigate(url, { replace: true, state: consumedState });
        } catch {
          if (pending.current === entry) pending.current = null;
        }
      })
      .catch(() => {
        // Admission failure cannot publish a selected tab; that state belongs to the Code owner.
      });
    return () => {
      cancelled = true;
    };
  }, [location, navigate, onOpen, ownerKey]);
  return null;
}

export function CanvasCodeRouteEntry(props: Props): JSX.Element | null {
  return useInRouterContext() ? <RouterCodeRouteEntry {...props} /> : null;
}
