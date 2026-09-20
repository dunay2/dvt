/** Owned concern: assert saved canonical documents and bind controlled samples to their revision. */
import { getE2eApiCalls, stubE2eApi } from '../e2eApiStub';

export const semanticWrites = (targetNodeId: string): ReturnType<typeof getE2eApiCalls> =>
  getE2eApiCalls('/workspace/graph/draft', 'PUT').filter((call) => {
    const body = call.body as {
      draft: { nodes: Array<{ id: string; metadata?: Record<string, unknown> }> };
    };
    return body.draft.nodes.some(
      (node) => node.id === targetNodeId && node.metadata?.transformAuthoring != null
    );
  });

export function semanticDocumentFromWrite(
  call: ReturnType<typeof getE2eApiCalls>[number],
  targetNodeId = 'join-transform'
): unknown {
  const body = call.body as {
    draft: { nodes: Array<{ id: string; metadata?: Record<string, unknown> }> };
  };
  const transform = body.draft.nodes.find((node) => node.id === targetNodeId);
  return (transform?.metadata?.transformAuthoring as { semanticDocument?: unknown } | undefined)
    ?.semanticDocument;
}

export function stubSavedWorkbenchSample(): void {
  stubE2eApi(
    'GET',
    /\/workspace\/graph\/canvases\/[^/]+\/transforms\/join-transform\/data-sample/,
    ({ url }) => {
      const lastWrite = semanticWrites('join-transform').at(-1);
      expect(lastWrite, 'preview uses an applied and saved semantic document').not.to.equal(
        undefined
      );
      const document = semanticDocumentFromWrite(lastWrite!) as {
        semanticPlan: { sha256: string };
      };
      return {
        body: {
          contractVersion: 1,
          canvasId: url.pathname.split('/')[4],
          transformNodeId: 'join-transform',
          draftRevision: 'preview-e2e-revision',
          semanticPlanSha256: document.semanticPlan.sha256,
          ...(url.searchParams.get('relationId') == null
            ? {}
            : { relationId: url.searchParams.get('relationId')! }),
          columns: [{ name: 'customer_id', type: 'string', nullable: false }],
          rows: [{ values: ['C-001'] }],
          limit: Number(url.searchParams.get('limit')),
          truncated: false,
          sampledAt: '2026-09-17T10:00:00.000Z',
        },
      };
    }
  );
}
