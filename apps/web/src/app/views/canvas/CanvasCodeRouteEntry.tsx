/** Translate one Router entry request into an existing guarded Canvas command. */
import { createContext, useContext, useLayoutEffect, useRef, type ReactNode } from 'react';
import { useInRouterContext, useLocation, useNavigate, type Location } from 'react-router';
import type { CanvasModelView } from './canvasWorkspaceMenuContributionStore';

export const canvasCodeRouteEntryState = { canvasWorkbench: 'code' } as const;
export type CanvasWorkbenchRouteTarget = 'code' | CanvasModelView;

type Props = Readonly<{
  ownerKey: string | null;
  modelOwnerKey?: string | null;
  onOpen: (target: CanvasWorkbenchRouteTarget) => void | Promise<boolean>;
  children?: ReactNode;
}>;
type PendingEntry = Readonly<{
  ownerKey: string;
  url: string;
  sourceKey: string;
  consumedState: Record<string, unknown>;
  target: CanvasWorkbenchRouteTarget;
}>;
type EntryOwners = Readonly<Record<CanvasWorkbenchRouteTarget, string | null | undefined>>;

function readEntryTarget(state: unknown): CanvasWorkbenchRouteTarget | null {
  if (state == null) return null;
  if (typeof state !== 'object') return null;
  if (Array.isArray(state)) return null;
  if (!Object.hasOwn(state, 'canvasWorkbench')) return null;
  const target = (state as Record<string, unknown>).canvasWorkbench;
  return target === 'code' || target === 'semantic' || target === 'sql' ? target : null;
}

export function isCanvasModelRouteEntry(state: unknown): boolean {
  const target = readEntryTarget(state);
  return target != null && target !== 'code';
}

const ModelRouteEntryPending = createContext(false);

export function useCanvasModelRouteEntryPending(): boolean {
  return useContext(ModelRouteEntryPending);
}

function RouterWorkbenchRouteEntry({
  ownerKey,
  modelOwnerKey,
  onOpen,
  children,
}: Props): JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const pending = useRef<PendingEntry | null>(null);
  const attemptedEntryKey = useRef<string | null>(null);
  useLayoutEffect(() => {
    const owners = { code: ownerKey, semantic: modelOwnerKey, sql: modelOwnerKey };
    const observation = readPendingEntryObservation(pending.current, owners, location);
    if (observation.kind === 'open') {
      pending.current = null;
      // Handoff on the acknowledged commit before the fallback surface can paint.
      void dispatchWorkbenchEntry(onOpen, observation.target);
      return;
    }
    if (observation.kind === 'wait') return;
    pending.current = null;
    const entry = preparePendingEntry(location, owners, attemptedEntryKey.current);
    if (entry == null) return;
    let cancelled = false;
    // The first StrictMode effect is cleaned up before admission can invalidate its owner.
    void Promise.resolve().then(async () => {
      if (cancelled) return;
      attemptedEntryKey.current = entry.sourceKey;
      pending.current = entry;
      try {
        await navigate(entry.url, { replace: true, state: entry.consumedState });
      } catch {
        if (pending.current === entry) pending.current = null;
      }
    });
    return () => {
      cancelled = true;
    };
  }, [location, navigate, onOpen, ownerKey, modelOwnerKey]);
  return (
    <ModelRouteEntryPending.Provider
      value={modelOwnerKey != null && isCanvasModelRouteEntry(location.state)}
    >
      {children}
    </ModelRouteEntryPending.Provider>
  );
}

async function dispatchWorkbenchEntry(
  onOpen: Props['onOpen'],
  target: CanvasWorkbenchRouteTarget
): Promise<void> {
  try {
    await onOpen(target);
  } catch {
    // Admission failure cannot publish a selected tab.
  }
}

function entryUrl({ pathname, search, hash }: Location): string {
  return `${pathname}${search}${hash}`;
}

function preparePendingEntry(
  location: Location,
  owners: EntryOwners,
  attemptedKey: string | null
): PendingEntry | null {
  if (location.key === attemptedKey) return null;
  const target = readEntryTarget(location.state);
  if (target == null) return null;
  const ownerKey = owners[target];
  if (ownerKey == null) return null;
  const consumedState = { ...(location.state as Record<string, unknown>) };
  delete consumedState.canvasWorkbench;
  return { ownerKey, url: entryUrl(location), sourceKey: location.key, consumedState, target };
}

/** Observe the Router commit before dispatching; a blocked replace stays pending. */
function readPendingEntryObservation(
  request: PendingEntry | null,
  owners: EntryOwners,
  location: Location
): { kind: 'advance' | 'wait' } | { kind: 'open'; target: CanvasWorkbenchRouteTarget } {
  if (request == null) return { kind: 'advance' };
  if (request.ownerKey !== owners[request.target]) return { kind: 'advance' };
  if (request.url !== entryUrl(location)) return { kind: 'advance' };
  if (location.state === request.consumedState) return { kind: 'open', target: request.target };
  if (location.key === request.sourceKey) return { kind: 'wait' };
  return { kind: 'advance' };
}

export function CanvasCodeRouteEntry(props: Props): JSX.Element {
  return useInRouterContext() ? <RouterWorkbenchRouteEntry {...props} /> : <>{props.children}</>;
}
