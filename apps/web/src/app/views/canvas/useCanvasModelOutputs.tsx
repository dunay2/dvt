/** Compose requested model projections into the existing operational drawer. */
import { useEffect, useMemo, useState } from 'react';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { CanvasOperationPreviewPorts } from './CanvasOperationDataPreview';
import {
  useOperationalDrawerContributionStore,
  type OperationalDrawerTab,
} from '../../components/shell/operationalDrawerContributionStore';
import { useUiLayoutStore } from '../../stores/uiLayoutStore';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
import { CanvasModelSqlView } from './CanvasModelSqlView';
import { CanvasModelDataView } from './CanvasModelDataView';
import { projectCanvasRelationalTree } from './canvasRelationalTreeProjection';
import { projectCanvasRelationalTreeCatalogue } from './canvasRelationalTreeWorkbenchModel';

export function useCanvasModelOutputs({
  canvasId,
  model,
  nodes,
  edges,
  preview,
  canEditModel,
  enabled,
}: Readonly<{
  canvasId: string | null;
  model: CanonicalNode | null;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  preview: Pick<CanvasOperationPreviewPorts, 'query' | 'preparePreview'>;
  canEditModel: boolean;
  enabled: boolean;
}>) {
  const copy = resolveCanvasSemanticEditorCopy(
    useApplicationLanguageStore((state) => state.language)
  );
  const [operationDataHost, setOperationDataHost] = useState<HTMLDivElement | null>(null);
  const owner = canvasId != null && model != null ? `${canvasId}:${model.id}` : null;
  const [requested, setRequested] = useState<{
    owner: string;
    views: readonly ('sql' | 'data')[];
    active: 'sql' | 'data';
  } | null>(null);
  const select = useOperationalDrawerContributionStore((state) => state.selectOperationalDrawerTab);
  const show = useUiLayoutStore((state) => state.showBottomDrawer);
  const reveal = (id: OperationalDrawerTab['id']) => {
    select(id);
    show(Math.max(260, useUiLayoutStore.getState().bottomDrawerHeight));
  };
  useEffect(() => {
    if (enabled && requested != null && requested.owner === owner) {
      select(`${requested.active}:${owner}`);
      show(Math.max(260, useUiLayoutStore.getState().bottomDrawerHeight));
    }
  }, [requested, enabled, owner, select, show]);
  const projection = useMemo(
    () => (model == null ? null : projectCanvasRelationalTree({ node: model, nodes, edges })),
    [model, nodes, edges]
  );
  const tabs = useMemo<readonly OperationalDrawerTab[]>(() => {
    if (!enabled || model == null || canvasId == null) return [];
    const views = requested?.owner === owner ? requested.views : [];
    const unresolvedInputs = projection?.ok
      ? projectCanvasRelationalTreeCatalogue({ ...projection.projection, nodes }).flatMap(
          (input) =>
            input.state === 'participating' ? [] : [{ label: input.label, state: input.state }]
        )
      : [];
    return [
      {
        id: 'data:operation',
        label: copy.operationData,
        count: null,
        content: (
          <div
            ref={setOperationDataHost}
            data-slot="canvas-operation-data-host"
            className="h-full min-h-0 min-w-0"
          >
            <p className="p-4 text-sm text-(--text-muted)">{copy.selectOperation}</p>
          </div>
        ),
      },
      ...views.map((view): OperationalDrawerTab => ({
        id: `${view}:${owner}`,
        label: `${view === 'sql' ? copy.sql : copy.data} · ${model.name}`,
        count: null,
        content:
          view === 'sql' ? (
            <CanvasModelSqlView transformNode={model} nodes={nodes} edges={edges} copy={copy} />
          ) : (
            <CanvasModelDataView
              canvasId={canvasId}
              nodeId={model.id}
              nodeName={model.name}
              semanticDigest={projection?.ok ? projection.projection.semanticDigest : null}
              canEditModel={canEditModel}
              query={preview.query}
              preparePreview={preview.preparePreview}
              copy={copy}
              unresolvedInputs={unresolvedInputs}
            />
          ),
      })),
    ];
  }, [
    enabled,
    model,
    canvasId,
    owner,
    requested,
    projection,
    nodes,
    edges,
    copy,
    canEditModel,
    preview.query,
    preview.preparePreview,
  ]);
  const open = (view: 'sql' | 'data') => {
    if (!enabled || owner == null) return;
    setRequested((current) => ({
      owner,
      active: view,
      views: current?.owner === owner ? [...new Set([...current.views, view])] : [view],
    }));
  };
  return {
    tabs,
    operationDataHost,
    onOpenOperationData: enabled ? () => reveal('data:operation') : undefined,
    onOpenSql: enabled ? () => open('sql') : undefined,
    onOpenData: enabled ? () => open('data') : undefined,
  };
}
