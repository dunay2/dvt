/** Owned concern: build scoped current-definition links from retained run model identities. */
import type { RunSnapshot } from '../../ports/runs';
import {
  isCanvasInspectorScopeCurrent,
  type CanvasInspectorWorkspaceScope,
} from '../../stores/canvasInspectorTarget';
import { buildDbtProjectFileCanvasPath } from '../canvas/canvasRouteAuthority';

export function projectRunModelLinks(snapshot: RunSnapshot, scope: CanvasInspectorWorkspaceScope) {
  const { tenantId, projectId, environment, modelSelection } = snapshot;
  if (!tenantId) return [];
  if (!projectId) return [];
  if (!environment) return [];
  if (!modelSelection) return [];
  if (!isCanvasInspectorScopeCurrent({ tenantId, projectId, environmentId: environment }, scope))
    return [];
  const { binding, modelIds } = modelSelection;
  const base =
    binding.authority.kind === 'dbt-project-files'
      ? buildDbtProjectFileCanvasPath(binding)
      : '/canvas';
  const params = new URLSearchParams(base.split('?')[1]);
  params.set('canvasId', binding.canvasId);
  params.set('tenant', tenantId);
  params.set('project', projectId);
  params.set('environment', environment);
  params.set('fromRun', snapshot.runId);
  return [...new Set(modelIds)].map((modelId) => {
    params.set('model', modelId);
    return { modelId, href: '/canvas?' + params.toString() };
  });
}
