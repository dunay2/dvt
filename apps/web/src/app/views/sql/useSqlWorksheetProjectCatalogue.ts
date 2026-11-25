/** Read protected canonical definitions without acquiring or mutating a Canvas session. */
import { useMemo } from 'react';
import { useWorkspaceGraphDraftAuthoringPort } from '../../services/AppServicesContext';
import type { CanonicalNode } from '../../types/canonical';
import { useCanvasDraftBaseline } from '../canvas/useCanvasDraftBaseline';
import { resolveActiveProjectCanvasId } from '../canvas/canvasProjectCanvasLifecycle';
import { projectCanvasExplorerModels } from '../canvas/explorer/canvasExplorerItems';
import { projectCanvasExplorerFileModels } from '../canvas/explorer/canvasExplorerItems';
import { createCanvasDbtModelDefinition } from '../canvas/canvasDbtModelReference';
import { useDbtProjectGraphQuery } from '../../queries/dbtProjectQueries';
import type { DbtProjectFilesAuthorityBinding } from '../../ports/dbtProjectGraph';
import type { CanvasAuthoringDraftReadModel } from '../canvas/canvasDraftReadModel';
import type { DbtProjectGraphProjection } from '@dvt/contracts';

const NO_NODES: readonly CanonicalNode[] = [];

function fileAuthority(
  readModel: CanvasAuthoringDraftReadModel | undefined
): DbtProjectFilesAuthorityBinding | undefined {
  const authority = readModel?.authoringAuthority;
  if (authority?.kind !== 'resolved') return undefined;
  const binding = authority.binding;
  if (binding.authority.kind !== 'dbt-project-files') return undefined;
  return { ...binding, authority: binding.authority };
}

function mergePublishedFileDefinitions(
  retained: readonly CanonicalNode[],
  project: DbtProjectGraphProjection | undefined
): CanonicalNode[] {
  const result = new Map(retained.map((node) => [node.id, node]));
  if (project == null) return [...result.values()];
  for (const model of project.nodes) {
    if (model.resourceType !== 'model') continue;
    try {
      const node = createCanvasDbtModelDefinition(project, model.uniqueId);
      if (!result.has(node.id)) result.set(node.id, node);
    } catch {
      /* Keep unavailable file Models visible without an insertion affordance. */
    }
  }
  return [...result.values()];
}

export function useSqlWorksheetProjectCatalogue(scopeKey: string) {
  const draftPort = useWorkspaceGraphDraftAuthoringPort();
  const { graphDraftQuery } = useCanvasDraftBaseline({
    workspaceGraphDraftAuthoringPort: draftPort,
    workspaceLayoutKey: scopeKey,
  });
  const record = graphDraftQuery.data?.record ?? null;
  const retained = graphDraftQuery.data?.semanticGraph?.canonicalNodes ?? NO_NODES;
  const binding = fileAuthority(graphDraftQuery.data);
  const project = useDbtProjectGraphQuery(binding, { enabled: binding != null });
  const canvasId = resolveActiveProjectCanvasId(record?.draft);
  const nodes = useMemo(
    () => mergePublishedFileDefinitions(retained, project.data),
    [retained, project.data]
  );
  const items = useMemo(() => {
    const result = new Map(
      projectCanvasExplorerModels(nodes, canvasId ?? undefined).map((item) => [item.id, item])
    );
    for (const item of project.data == null ? [] : projectCanvasExplorerFileModels(project.data))
      result.set(item.id, item);
    return [...result.values()];
  }, [nodes, canvasId, project.data]);
  return { record, nodes, canvasId, items, fileProject: project.data };
}
