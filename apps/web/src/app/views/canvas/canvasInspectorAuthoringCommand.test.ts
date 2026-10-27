import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import {
  applyCanvasInspectorNodeDraftToSession,
  applyCanvasInspectorNodeDraftWithInputsToSession,
} from './canvasInspectorAuthoringCommand';
import { createCanvasInspectorNodeDraft } from './canvasInspectorAuthoringModel';
import { canvasDraftSession } from './canvasDraftSession';
import { resolveCanvasDraftNodes } from './canvasDraftNodeCatalog';
import {
  createModelOutputDependencyFixture,
  selectModelDependencyOutputs,
} from './canvasModelOutputDependency.test-support';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { applySelectedRelationWindow } from './canvasSelectedRelationWindow';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { SOURCE, buildCanonicalTransform } from './canvasOutputProjection.test-support';

describe('applyCanvasInspectorNodeDraftToSession', () => {
  it.each(['order_id', 'amount'])(
    'rejects removal of producer output %s used by a connected model',
    async (removed) => {
      const fixture = await createModelOutputDependencyFixture();
      const candidate = await selectModelDependencyOutputs(
        fixture.producer,
        ['order_id', 'customer', 'amount'].filter((name) => name !== removed)
      );
      const before = structuredClone(fixture.draftSession);
      const result = applyCanvasInspectorNodeDraftToSession({
        ...fixture,
        node: fixture.producer,
        draft: createCanvasInspectorNodeDraft(candidate),
        workspaceScope: {
          tenantId: 'tenant-1',
          projectId: 'project-1',
          environmentId: 'environment-1',
          targetAdapter: 'temporal',
        },
      });
      expect(result).toMatchObject({ outcome: 'rejected', reason: 'model_output_required' });
      expect(fixture.draftSession).toEqual(before);
      expect(fixture.draftSession.localNodeCatalog).toBeUndefined();
    }
  );

  it('uses the latest local consumer authority when an unused field is removed', async () => {
    const fixture = await createModelOutputDependencyFixture();
    const consumer = await selectModelDependencyOutputs(fixture.consumer, ['customer', 'country']);
    const candidate = await selectModelDependencyOutputs(fixture.producer, [
      'order_id',
      'customer',
    ]);
    const result = applyCanvasInspectorNodeDraftToSession({
      ...fixture,
      draftSession: { ...fixture.draftSession, localNodeCatalog: { [consumer.id]: consumer } },
      node: fixture.producer,
      draft: createCanvasInspectorNodeDraft(candidate),
      workspaceScope: {
        tenantId: 'tenant-1',
        projectId: 'project-1',
        environmentId: 'environment-1',
        targetAdapter: 'temporal',
      },
    });
    expect(result.outcome).toBe('applied');
    if (result.outcome !== 'applied') throw new Error('Expected unused removal');
    expect(result.draftSession.localNodeCatalog?.[consumer.id]).toBe(consumer);
  });

  it('retains a hidden Window dependency after the generated field is excluded from Output', async () => {
    const fixture = await createModelOutputDependencyFixture();
    const session = new CanvasRelationAnalysisSession(fixture.consumer.id);
    try {
      session.receive(fixture.consumerDocument);
      const fields = (await session.query(null)).bindings;
      const ordered = fields.find((field) => field.displayName === 'amount')!;
      const document = await applySelectedRelationWindow(session, {
        relationId: session.rootId,
        expectedRevision: session.revision,
        intent: 'insert',
        fieldId: ordered.fieldId,
        alias: 'rank',
      });
      const windowModel = applyDvtSubstraitSemanticDocument(
        fixture.consumer,
        encodeDvtSubstraitSemanticDocument(document)
      );
      const consumer = await selectModelDependencyOutputs(windowModel, ['customer', 'country']);
      const candidate = await selectModelDependencyOutputs(fixture.producer, [
        'order_id',
        'customer',
      ]);
      const result = applyCanvasInspectorNodeDraftToSession({
        ...fixture,
        draftSession: { ...fixture.draftSession, localNodeCatalog: { [consumer.id]: consumer } },
        node: fixture.producer,
        draft: createCanvasInspectorNodeDraft(candidate),
        workspaceScope: {
          tenantId: 'tenant-1',
          projectId: 'project-1',
          environmentId: 'environment-1',
          targetAdapter: 'temporal',
        },
      });
      expect(result).toMatchObject({
        outcome: 'rejected',
        reason: 'model_output_required',
        fields: [{ name: 'amount' }],
      });
    } finally {
      session.dispose();
    }
  });

  it('checks every connected consumer rather than only the first edge', async () => {
    const fixture = await createModelOutputDependencyFixture();
    const first = await selectModelDependencyOutputs(fixture.consumer, ['customer', 'country']);
    const secondFixture = await createModelOutputDependencyFixture();
    const second = { ...secondFixture.consumer, id: 'model3', name: 'Model 3' };
    const nodes = [fixture.source, fixture.producer, fixture.right, first, second];
    const draftSession = {
      ...fixture.draftSession,
      workingSet: {
        ...fixture.draftSession.workingSet,
        visibleNodeIds: nodes.map((node) => node.id),
        visibleEdges: [
          ...fixture.draftSession.workingSet.visibleEdges,
          { sourceId: fixture.producer.id, targetId: second.id },
        ],
      },
    };
    const candidate = await selectModelDependencyOutputs(fixture.producer, [
      'order_id',
      'customer',
    ]);
    expect(
      applyCanvasInspectorNodeDraftToSession({
        ...fixture,
        draftSession,
        canonicalNodesById: new Map(nodes.map((node) => [node.id, node])),
        node: fixture.producer,
        draft: createCanvasInspectorNodeDraft(candidate),
        workspaceScope: {
          tenantId: 'tenant-1',
          projectId: 'project-1',
          environmentId: 'environment-1',
          targetAdapter: 'temporal',
        },
      })
    ).toMatchObject({
      outcome: 'rejected',
      reason: 'model_output_required',
      consumer: { nodeId: second.id, name: 'Model 3' },
    });
  });

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

describe('atomic Inspector Input additions', () => {
  const workspaceScope = {
    tenantId: 'tenant-1',
    projectId: 'project-1',
    environmentId: 'dev',
    targetAdapter: 'temporal' as const,
  };
  function fixture(): Parameters<typeof applyCanvasInspectorNodeDraftWithInputsToSession>[0] {
    const node = buildCanonicalTransform();
    const canonicalNodesById = new Map([SOURCE, node].map((item) => [item.id, item]));
    const draftSession = canvasDraftSession.workingSet.replaceEdges(
      canvasDraftSession.machine.bootstrap({
        remoteDraft: null,
        canonicalNodeIds: [SOURCE.id, node.id],
        canonicalEdges: [{ sourceId: SOURCE.id, targetId: node.id }],
      }),
      [
        {
          sourceId: SOURCE.id,
          targetId: node.id,
          inputBindings: {
            version: 'v1',
            fields: [{ inputId: `input:${SOURCE.id}:order_id`, producerFieldId: 'order_id' }],
          },
        },
      ]
    );
    return {
      node,
      canonicalNodesById,
      draftSession,
      workspaceScope,
      editable: true,
      draft: createCanvasInspectorNodeDraft(node),
      changes: { inputAdditions: [{ nodeId: SOURCE.id, columnId: 'customer' }] },
    };
  }

  it('adds the missing published Input while preserving an unchanged semantic document', async () => {
    const args = fixture();
    const before = structuredClone(args.draftSession);
    const nodeBefore = structuredClone(args.node);
    const result = await applyCanvasInspectorNodeDraftWithInputsToSession({
      ...args,
      changes: { inputAdditions: [...args.changes.inputAdditions, ...args.changes.inputAdditions] },
    });
    expect(result.outcome).toBe('applied');
    if (result.outcome !== 'applied') throw new Error('Expected atomic Input recovery');
    expect(result.draftSession.workingSet.visibleEdges[0]?.inputBindings?.fields).toEqual([
      { inputId: `input:${SOURCE.id}:order_id`, producerFieldId: 'order_id' },
      { inputId: `input:${SOURCE.id}:customer`, producerFieldId: 'customer' },
    ]);
    expect(result.draftSession.localNodeCatalog).toBeUndefined();
    expect(args.node).toEqual(nodeBefore);
    expect(args.draftSession).toEqual(before);
    expect(
      await applyCanvasInspectorNodeDraftWithInputsToSession({
        ...args,
        draftSession: result.draftSession,
      })
    ).toEqual({ outcome: 'no_changes' });
  });

  it('returns both Input and node changes without changing producer or Read authority', async () => {
    const args = fixture();
    const sourceBefore = structuredClone(SOURCE);
    const semanticBefore = structuredClone(args.node.metadata?.transformAuthoring);
    const result = await applyCanvasInspectorNodeDraftWithInputsToSession({
      ...args,
      draft: { ...args.draft, name: 'Recovered model' },
    });
    expect(result.outcome).toBe('applied');
    if (result.outcome !== 'applied') throw new Error('Expected atomic Model change');
    expect(result.draftSession.localNodeCatalog?.[args.node.id]?.name).toBe('Recovered model');
    expect(
      result.draftSession.localNodeCatalog?.[args.node.id]?.metadata?.transformAuthoring
    ).toEqual(semanticBefore);
    expect(result.draftSession.localNodeCatalog?.[SOURCE.id]).toBeUndefined();
    expect(SOURCE).toEqual(sourceBefore);
    expect(result.draftSession.workingSet.visibleEdges[0]?.inputBindings?.fields).toHaveLength(2);
  });

  it.each(['binding', 'semantic'] as const)(
    'discards the entire candidate after %s rejection',
    async (kind) => {
      const args = fixture();
      const before = structuredClone(args.draftSession);
      const result = await applyCanvasInspectorNodeDraftWithInputsToSession({
        ...args,
        draft: kind === 'semantic' ? { ...args.draft, name: ' ' } : args.draft,
        changes: {
          inputAdditions: [
            ...args.changes.inputAdditions,
            ...(kind === 'binding' ? [{ nodeId: SOURCE.id, columnId: 'missing' }] : []),
          ],
        },
      });
      expect(result).toMatchObject({ outcome: 'rejected', reason: 'invalid_draft' });
      expect(args.draftSession).toEqual(before);
      expect(args.draftSession.localNodeCatalog).toBeUndefined();
    }
  );

  it('does not create a missing dependency or accept read-only recovery', async () => {
    const args = fixture();
    const disconnected = canvasDraftSession.workingSet.replaceEdges(args.draftSession, []);
    expect(
      await applyCanvasInspectorNodeDraftWithInputsToSession({
        ...args,
        draftSession: disconnected,
      })
    ).toMatchObject({ outcome: 'rejected', reason: 'invalid_draft' });
    expect(disconnected.workingSet.visibleEdges).toEqual([]);
    expect(
      await applyCanvasInspectorNodeDraftWithInputsToSession({ ...args, editable: false })
    ).toEqual({ outcome: 'rejected', reason: 'node_unavailable' });
    expect(
      await applyCanvasInspectorNodeDraftWithInputsToSession({
        ...args,
        changes: { inputAdditions: [] },
      })
    ).toEqual({ outcome: 'no_changes' });
  });
});
