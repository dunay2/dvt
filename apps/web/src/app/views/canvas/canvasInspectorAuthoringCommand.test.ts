import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { applyCanvasInspectorNodeDraftToSession } from './canvasInspectorAuthoringCommand';
import { createCanvasInspectorNodeDraft } from './canvasInspectorAuthoringModel';
import { canvasDraftSession } from './canvasDraftSession';

describe('applyCanvasInspectorNodeDraftToSession', () => {
  it('validates a connected model against baseline nodes when the local catalog is empty', () => {
    const source: CanonicalNode = {
      id: 'source-orders',
      name: 'Orders source',
      pluginId: 'dvt',
      kind: 'dvt:source',
      role: 'input',
      status: 'idle',
      tags: [],
      metadata: { dbt: { packageName: 'analytics', sourceName: 'raw' } },
    };
    const model: CanonicalNode = {
      id: 'model-orders',
      name: 'Orders model',
      pluginId: 'dvt',
      kind: 'dvt:transform',
      role: 'transform',
      status: 'idle',
      tags: [],
      metadata: { dbt: { packageName: 'analytics', materialized: 'view' } },
    };
    const session = canvasDraftSession.machine.bootstrap({
      remoteDraft: null,
      canonicalNodeIds: [source.id, model.id],
      canonicalEdges: [{ sourceId: source.id, targetId: model.id }],
    });

    const result = applyCanvasInspectorNodeDraftToSession({
      canonicalNodesById: new Map([
        [source.id, source],
        [model.id, model],
      ]),
      draftSession: session,
      node: model,
      draft: { ...createCanvasInspectorNodeDraft(model), name: 'Orders model renamed' },
      workspaceScope: {
        tenantId: 'tenant-1',
        projectId: 'project-1',
        environmentId: 'environment-1',
        targetAdapter: 'temporal',
      },
    });

    expect(session.localNodeCatalog).toBeUndefined();
    expect(result.localNodeCatalog?.[model.id]?.name).toBe('Orders model renamed');
  });
});
