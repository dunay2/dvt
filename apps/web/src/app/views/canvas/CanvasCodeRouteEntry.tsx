/** Translate one Router entry request into an existing guarded Canvas command. */
import { useEffect, useRef } from 'react';
import { useInRouterContext, useLocation, useNavigate } from 'react-router';
import type { CanvasModelView } from './canvasWorkspaceMenuContributionStore';

export const canvasCodeRouteEntryState = { canvasWorkbench: 'code' } as const;
export type CanvasWorkbenchRouteTarget = 'code' | CanvasModelView;

type Props = Readonly<{
  ownerKey: string | null;
  modelOwnerKey?: string | null;
  onOpen: (target: CanvasWorkbenchRouteTarget) => void | Promise<boolean>;
}>;
type PendingEntry = Readonly<{
  ownerKey: string;
  url: string;
  sourceKey: string;
  consumedState: Record<string, unknown>;
  target: CanvasWorkbenchRouteTarget;
}>;

function readEntryTarget(state: unknown): CanvasWorkbenchRouteTarget | null {
  if (typeof state !== 'object' || state == null || Array.isArray(state)) return null;
  if (!Object.hasOwn(state, 'canvasWorkbench')) return null;
  const target = (state as Record<string, unknown>).canvasWorkbench;
  return target === 'code' || target === 'semantic' || target === 'sql' ? target : null;
}

function RouterWorkbenchRouteEntry({ ownerKey, modelOwnerKey, onOpen }: Props): null {
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
        const url = `${location.pathname}${location.search}${location.hash}`;
        const request = pending.current;
        const ownerFor = (target: CanvasWorkbenchRouteTarget) =>
          target === 'code' ? ownerKey : modelOwnerKey;
        if (request != null) {
          if (request.ownerKey === ownerFor(request.target) && request.url === url) {
            // Observe our actual Router commit; a blocked replace never reaches this state.
            if (location.state === request.consumedState) {
              pending.current = null;
              await onOpen(request.target);
              return;
            }
            if (location.key === request.sourceKey) return;
          }
          pending.current = null;
        }
        const state: unknown = location.state;
        const target = readEntryTarget(state);
        if (target == null || location.key === attemptedEntryKey.current) return;
        const entryOwner = ownerFor(target);
        if (entryOwner == null) return;
        const consumedState = { ...(state as Record<string, unknown>) };
        delete consumedState.canvasWorkbench;
        const entry = { ownerKey: entryOwner, url, sourceKey: location.key, consumedState, target };
        attemptedEntryKey.current = location.key;
        pending.current = entry;
        try {
          await navigate(url, { replace: true, state: consumedState });
        } catch {
          if (pending.current === entry) pending.current = null;
        }
      })
      .catch(() => {
        // Admission failure cannot publish a selected tab.
      });
    return () => {
      cancelled = true;
    };
  }, [location, navigate, onOpen, ownerKey, modelOwnerKey]);
  return null;
}

export function CanvasCodeRouteEntry(props: Props): JSX.Element | null {
  return useInRouterContext() ? <RouterWorkbenchRouteEntry {...props} /> : null;
}
