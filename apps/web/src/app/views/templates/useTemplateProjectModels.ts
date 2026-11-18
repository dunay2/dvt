/** Read model identities from the same scoped graph authorities as the project explorer. */
import { useMemo } from 'react';
import { useWorkspaceGraphDraftAuthoringPort } from '../../services/AppServicesContext';
import { useCanvasDraftBaseline } from '../canvas/useCanvasDraftBaseline';
import { useWorkspaceDbtProjectContext } from '../code/useWorkspaceDbtProjectContext';
import { projectTemplateModels } from './templateProjectModels';

export function useTemplateProjectModels(workspaceLayoutKey: string) {
  const workspaceGraphDraftAuthoringPort = useWorkspaceGraphDraftAuthoringPort();
  const { graphDraftQuery } = useCanvasDraftBaseline({
    workspaceLayoutKey,
    workspaceGraphDraftAuthoringPort,
  });
  const dbt = useWorkspaceDbtProjectContext();
  const data = graphDraftQuery.data;
  const models = useMemo(
    () =>
      projectTemplateModels(
        data?.semanticGraph?.canonicalNodes ?? [],
        dbt.projection,
        data?.record?.draft.activeCanvasId ?? data?.record?.draft.canvas.id
      ),
    [data, dbt.projection]
  );
  return {
    models,
    loading: graphDraftQuery.isPending || dbt.loading,
    unavailable:
      graphDraftQuery.isError ||
      !!data?.formatError ||
      data?.accessMode === 'forbidden' ||
      dbt.unavailable,
    projectRoot: dbt.binding?.authority.projectRoot,
  };
}
