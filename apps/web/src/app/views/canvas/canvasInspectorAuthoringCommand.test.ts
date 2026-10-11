import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { applyCanvasInspectorNodeDraftToSession } from './canvasInspectorAuthoringCommand';
import { createCanvasInspectorNodeDraft } from './canvasInspectorAuthoringModel';
import { canvasDraftSession } from './canvasDraftSession';
import { resolveCanvasDraftNodes } from './canvasDraftNodeCatalog';

describe('applyCanvasInspectorNodeDraftToSession', () => {
  it('edits shared source configuration through an instance while retaining its own alias', () => {
    const source: CanonicalNode = {
      id: 'source',
      name: 'Orders',
      pluginId: 'dbt',
      kind: 'dbt:source',
      role: 'input',
      status: 'idle',
      tags: [],
      metadata: {
        dbt: {
          packageName: 'analytics',
          sourceName: 'raw',
          schemaName: 'raw',
          tableName: 'orders',
        },
      },
    };
    const first = { ...source, id: 'first', sourceDefinitionId: source.id };
    const second = { ...first, id: 'second', name: 'Orders 2' };
    const nodes = new Map([source, first, second].map((node) => [node.id, node]));
    const session = canvasDraftSession.machine.bootstrap({
      remoteDraft: null,
      canonicalNodeIds: ['first', 'second'],
      canonicalEdges: [],
    });
    const original = createCanvasInspectorNodeDraft(first);
    const result = applyCanvasInspectorNodeDraftToSession({
      draftSession: session,
      canonicalNodesById: nodes,
      node: first,
      draft: { ...original, name: 'First instance', dbt: { ...original.dbt!, schemaName: 'mart' } },
      workspaceScope: {
        tenantId: 'tenant-1',
        projectId: 'project-1',
        environmentId: 'environment-1',
        targetAdapter: 'temporal',
      },
    });
    expect(result.outcome).toBe('applied');
    if (result.outcome !== 'applied') throw new Error('Expected the source configuration to apply');
    const projected = resolveCanvasDraftNodes(result.draftSession, nodes);
    expect(projected.map((node) => node.name)).toEqual(['First instance', 'Orders 2']);
    expect(projected.map((node) => createCanvasInspectorNodeDraft(node).dbt?.schemaName)).toEqual([
      'mart',
      'mart',
    ]);
    expect(result.draftSession.localNodeCatalog?.source?.name).toBe('Orders');
    expect(result.draftSession.workingSet.visibleNodeIds).toEqual(['first', 'second']);
  });

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
    expect(result.outcome).toBe('applied');
    if (result.outcome !== 'applied') throw new Error('Expected the draft command to apply');
    expect(result.draftSession.localNodeCatalog?.[model.id]?.name).toBe('Orders model renamed');
  });

  it('reports no_changes without manufacturing a new draft revision', () => {
    const model: CanonicalNode = {
      id: 'model-orders',
      name: 'Orders model',
      pluginId: 'dvt',
      kind: 'dvt:transform',
      role: 'transform',
      status: 'idle',
      tags: [],
    };
    const session = canvasDraftSession.machine.bootstrap({
      remoteDraft: null,
      canonicalNodeIds: [model.id],
      canonicalEdges: [],
    });

    const result = applyCanvasInspectorNodeDraftToSession({
      canonicalNodesById: new Map([[model.id, model]]),
      draftSession: session,
      node: model,
      draft: createCanvasInspectorNodeDraft(model),
      workspaceScope: {
        tenantId: 'tenant-1',
        projectId: 'project-1',
        environmentId: 'environment-1',
        targetAdapter: 'temporal',
      },
    });

    expect(result).toEqual({ outcome: 'no_changes' });
  });

  it('rejects invalid semantic drafts with the validation errors and leaves the session untouched', () => {
    const model: CanonicalNode = {
      id: 'model-orders',
      name: 'Orders model',
      pluginId: 'dvt',
      kind: 'dvt:transform',
      role: 'transform',
      status: 'idle',
      tags: [],
    };
    const session = canvasDraftSession.machine.bootstrap({
      remoteDraft: null,
      canonicalNodeIds: [model.id],
      canonicalEdges: [],
    });

    const result = applyCanvasInspectorNodeDraftToSession({
      canonicalNodesById: new Map([[model.id, model]]),
      draftSession: session,
      node: model,
      draft: { ...createCanvasInspectorNodeDraft(model), name: '   ' },
      workspaceScope: {
        tenantId: 'tenant-1',
        projectId: 'project-1',
        environmentId: 'environment-1',
        targetAdapter: 'temporal',
      },
    });

    expect(result).toEqual({
      outcome: 'rejected',
      reason: 'invalid_draft',
      errors: { name: 'node_name_required' },
    });
    expect(session.localNodeCatalog).toBeUndefined();
  });
});
