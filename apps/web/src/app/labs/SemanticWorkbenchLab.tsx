/** Local design lab hosts the production editor; it does not emulate query execution. */
import { useMemo, useRef, useState } from 'react';
import { CanvasRelationalTreeWorkbench } from '../views/canvas/CanvasRelationalTreeWorkbench';
import { canvasDraftSession } from '../views/canvas/canvasDraftSession';
import { applyCanvasInspectorNodeDraftToSession } from '../views/canvas/canvasInspectorAuthoringCommand';
import { resolveCanvasDraftNodes } from '../views/canvas/canvasDraftNodeCatalog';
import type { CanvasRelationalTreeAuthoringContract } from '../views/canvas/canvasRelationalTreeWorkbench.types';
import { canvasViewCopy } from '../views/canvas/copy';
import { buildSemanticWorkbenchFixture } from './semanticWorkbenchFixture';

export default function SemanticWorkbenchLab() {
  const [fixture] = useState(buildSemanticWorkbenchFixture);
  const nodesById = useMemo(
    () => new Map([...fixture.sources, fixture.transform].map((node) => [node.id, node])),
    [fixture]
  );
  const [session, setSession] = useState(() =>
    canvasDraftSession.machine.bootstrap({
      remoteDraft: null,
      canonicalNodeIds: [...nodesById.keys()],
      canonicalEdges: [...fixture.edges],
    })
  );
  const current = useRef(session);
  const nodes = resolveCanvasDraftNodes(session, nodesById);
  const transform = nodes.find((node) => node.id === fixture.transform.id)!;
  const authoring: CanvasRelationalTreeAuthoringContract = {
    canEditNode: true,
    onApplyNodeDraft: (nodeId, draft) => {
      const node = resolveCanvasDraftNodes(current.current, nodesById).find(
        (candidate) => candidate.id === nodeId
      );
      if (node == null) return { outcome: 'rejected', reason: 'node_unavailable' };
      const result = applyCanvasInspectorNodeDraftToSession({
        draftSession: current.current,
        canonicalNodesById: nodesById,
        node,
        draft,
        workspaceScope: {
          tenantId: 'semantic-lab',
          projectId: 'semantic-lab',
          environmentId: 'local',
          targetAdapter: 'temporal',
        },
      });
      if (result.outcome === 'applied') {
        current.current = result.draftSession;
        setSession(result.draftSession);
      }
      return result;
    },
  };
  return (
    <main className="flex h-screen min-h-0 flex-col bg-(--surface-panel) text-(--text-primary)">
      <header className="border-b border-(--border-default) px-4 py-2">
        <h1 className="text-sm font-semibold">Semantic Workbench Lab</h1>
        <p className="text-xs text-(--text-muted)">
          Edición local con el componente de producción. Sin conexión de ejecución ni persistencia
          remota.
        </p>
      </header>
      <section className="min-h-0 flex-1">
        <CanvasRelationalTreeWorkbench
          transformNode={transform}
          nodes={nodes}
          edges={fixture.edges}
          copy={canvasViewCopy}
          authoring={authoring}
        />
      </section>
    </main>
  );
}
