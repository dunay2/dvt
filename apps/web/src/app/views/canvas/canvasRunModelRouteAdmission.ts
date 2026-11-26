/** Admit a retained Run destination and reuse its single guarded command attempt. */
import type { SessionContextPort } from '../../ports/sessionContext';
import type { CanvasInspectorCommand } from '../../stores/canvasInspectorTarget';
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasRouteState } from './canvasDraftPresentationModel';

export type RunModelAdmissionAttempt = Readonly<{
  key: string;
  result: Promise<void | boolean>;
}>;

export type RunModelAdmissionRequest = Readonly<{
  key: string;
  file: boolean;
  modelId: string;
  modelIds: ReadonlySet<string>;
  openModel: (id: string) => void;
  inspect: CanvasInspectorCommand;
}>;

export function readRunModelDestinationIdentity(params: URLSearchParams) {
  const runId = params.get('fromRun');
  const modelId = params.get('model');
  if (!runId) return null;
  if (!modelId) return null;
  return { runId, modelId };
}

export function canAdmitRunModelTarget({
  params,
  canvasId,
  state,
  scope,
  nodes,
  modelId,
  file,
}: {
  params: URLSearchParams;
  canvasId: string | null;
  state: CanvasRouteState;
  scope: ReturnType<SessionContextPort['getWorkspaceScopeSnapshot']>;
  nodes: readonly CanonicalNode[];
  modelId: string;
  file: boolean;
}): boolean {
  const admissionFacts = [
    [state, 'ready'],
    [params.get('tenant'), scope.tenantId],
    [params.get('project'), scope.projectId],
    [params.get('environment'), scope.environmentId],
    [params.get('canvasId'), canvasId],
  ] as const;
  if (!admissionFacts.every(([actual, expected]) => actual === expected)) return false;
  const target = nodes.find((node) => node.id === modelId && node.role === 'transform');
  if (target === undefined) return false;
  if (file) {
    return (
      target.metadata?.authority === 'dbt-project-files' && target.metadata.resourceType === 'model'
    );
  }
  return target.metadata?.authority !== 'dbt-project-files';
}

export function admitRunModelOnce(
  previous: RunModelAdmissionAttempt | undefined,
  request: RunModelAdmissionRequest
): RunModelAdmissionAttempt {
  if (previous?.key === request.key) return previous;
  const { key, file, modelId, modelIds, openModel, inspect } = request;
  try {
    const result =
      !file && modelIds.has(modelId)
        ? openModel(modelId)
        : inspect(modelId, file ? 'code' : 'general');
    return { key, result: Promise.resolve(result) };
  } catch {
    return { key, result: Promise.resolve(false) };
  }
}
