/**
 * Owned concern: resolve a run's model link after the destination Canvas loads.
 * Corner: URL identities must match the active workspace, Canvas and authoritative node.
 */
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { useInRouterContext, useLocation, useNavigate, useSearchParams } from 'react-router';
import { useSessionContext } from '../../services/AppServicesContext';
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasInspectorCommand } from '../../stores/canvasInspectorTarget';
import type { CanvasRouteState } from './canvasDraftPresentationModel';
import {
  admitRunModelOnce,
  canAdmitRunModelTarget,
  readRunModelDestinationIdentity,
  type RunModelAdmissionAttempt,
} from './canvasRunModelRouteAdmission';

const WAITING_FOR_CANVAS = new Set<CanvasRouteState>(['loading_backend', 'loading_graph']);

type Props = Readonly<{
  canvasId: string | null;
  state: CanvasRouteState;
  nodes: readonly CanonicalNode[];
  modelIds: ReadonlySet<string>;
  openModel: (id: string) => void;
  inspect: CanvasInspectorCommand;
}>;
function ResolveRunModel({
  params,
  canvasId,
  state,
  nodes,
  modelIds,
  openModel,
  inspect,
}: Props & { params: URLSearchParams }) {
  const session = useSessionContext();
  const scope = useSyncExternalStore(
    session.subscribeWorkspaceScope,
    session.getWorkspaceScopeSnapshot,
    session.getWorkspaceScopeSnapshot
  );
  const { key } = useLocation();
  const navigate = useNavigate();
  const attempt = useRef<RunModelAdmissionAttempt>();
  useEffect(() => {
    if (WAITING_FOR_CANVAS.has(state)) return;
    const identity = readRunModelDestinationIdentity(params);
    if (identity === null) return;
    const { runId, modelId } = identity;
    const file = params.get('authority') === 'dbt-project-files';
    const admissible = canAdmitRunModelTarget({
      params,
      canvasId,
      state,
      scope,
      nodes,
      modelId,
      file,
    });
    const unavailable = () =>
      navigate('/runs/' + encodeURIComponent(runId) + '?tab=models&unavailable=1', {
        replace: true,
      });
    let active = true;
    // Defer admission past StrictMode cleanup. Later effect instances observe the
    // same command promise rather than repeating it or losing its rejection.
    void Promise.resolve()
      .then(async () => {
        if (!active) return;
        if (!admissible) {
          void unavailable();
          return;
        }
        attempt.current = admitRunModelOnce(attempt.current, {
          key,
          file,
          modelId,
          modelIds,
          openModel,
          inspect,
        });
        if ((await attempt.current.result) === false && active) void unavailable();
      })
      .catch(() => {
        if (active) void unavailable();
      });
    return () => {
      active = false;
    };
  }, [params, key, state, canvasId, nodes, scope, modelIds, openModel, inspect, navigate]);
  return null;
}
function RoutedRunModel(props: Props) {
  const [params] = useSearchParams();
  return params.has('fromRun') && params.has('model') ? (
    <ResolveRunModel {...props} params={params} />
  ) : null;
}
export function CanvasRunModelRouteEntry(props: Props) {
  return useInRouterContext() ? <RoutedRunModel {...props} /> : null;
}
