/** Regression proof: visual identity never grants capabilities or rewrites execution authority. */
import { describe, expect, it } from 'vitest';
import type { CanonicalNode } from '../../types/canonical';
import { resolveCanvasModelIdentity, readCanvasModelIconPreference } from './canvasModelIdentity';
import {
  applyCanvasInspectorNodeDraft,
  createCanvasInspectorNodeDraft,
  validateCanvasInspectorNodeDraft,
} from './canvasInspectorAuthoringModel';
import { WorkspaceGraphAuthoringDraftSchema } from '@dvt/contracts';
import { buildCanvasAuthoringDraft } from './canvasDraftAuthoring';
import { createCanvasNodeInstance } from './canvasNodeInstance';
import {
  outputFixture,
  sourceNode,
  projectedModel,
} from './canvasColumnOutputAuthoring.test-support';
import { canvasDraftSessionWorkingSet } from './canvasDraftSessionWorkingSet';
import { resolveCanvasDraftNodes } from './canvasDraftNodeCatalog';
import { applyCanvasInspectorNodeDraftToSession } from './canvasInspectorAuthoringCommand';
import { projectWorkspaceGraphAuthoringDraftSemanticGraph } from '../../services/workspace/workspaceGraphDraftProjection';

const model: CanonicalNode = {
  id: 'model',
  name: 'Orders',
  kind: 'dvt:transform',
  pluginId: 'dvt',
  role: 'transform',
  status: 'idle',
  tags: [],
};
const dbt: CanonicalNode = {
  ...model,
  metadata: { authority: 'dbt-project-files', dbt: { packageName: 'analytics' }, sql: 'select 1' },
};

describe('model identity admission', () => {
  it('offers dbt only through the existing compatibility authority, never a name or tag', () => {
    expect(resolveCanvasModelIdentity(dbt)).toMatchObject({
      icon: 'dbt',
      choices: ['model', 'dbt', 'sql'],
    });
    const misleading: CanonicalNode = { ...model, name: 'dbt.sql', tags: ['dbt'] };
    expect(resolveCanvasModelIdentity(misleading)).toMatchObject({
      icon: 'substrait',
      choices: ['model', 'substrait'],
    });
    expect(
      validateCanvasInspectorNodeDraft(
        { ...createCanvasInspectorNodeDraft(model), modelIcon: 'dbt' },
        { node: model, nodes: [model], edges: [] }
      )
    ).toMatchObject({ modelIcon: 'node_icon_incompatible' });
  });

  it('uses provider identity only from a valid connection and preserves other plugin icons', () => {
    const source: CanonicalNode = {
      ...model,
      role: 'input',
      kind: 'dvt:source',
      metadata: {
        connectedSourceRef: {
          schemaVersion: 'connected-source-ref.v1',
          connectionRef: {
            schemaVersion: 'connection-ref.v1',
            connectionId: 'warehouse',
            provider: 'postgres',
          },
          sourceObjectId: 'raw.orders',
        },
      },
    };
    expect(resolveCanvasModelIdentity(source)).toMatchObject({
      icon: 'postgres',
      choices: ['model', 'postgres', 'sql'],
    });
    expect(
      resolveCanvasModelIdentity({ ...source, metadata: { provider: 'postgres' } })?.icon
    ).toBe('model');
    expect(resolveCanvasModelIdentity({ ...model, kind: 'custom:operation' })).toBeNull();
    const api: CanonicalNode = {
      ...model,
      kind: 'dvt:http_json_acquisition',
      pluginId: 'dvt.http-json',
      role: 'input',
    };
    expect(resolveCanvasModelIdentity(api)?.icon).toBe('api');
  });

  it('does not display an incompatible or unknown saved override as a technology claim', () => {
    for (const modelIcon of ['dbt', 'untrusted']) {
      const node = { ...model, metadata: { modelIcon } };
      expect(readCanvasModelIconPreference(node)).toBe('auto');
      expect(resolveCanvasModelIdentity(node)?.icon).toBe('substrait');
    }
  });

  it('recognizes a persisted dbt file reference without copying SQL into the model', () => {
    const referenced = {
      ...model,
      metadata: {
        dbtModelReference: {
          schemaVersion: 'workspace-dbt-model-reference.v1',
          canvasId: 'canvas',
          uniqueId: 'model.project.orders',
          relationId: 'orders',
          connectionRef: {
            schemaVersion: 'connection-ref.v1',
            connectionId: 'warehouse',
            provider: 'postgres',
          },
          fields: [{ fieldId: 'id', name: 'id', dataType: 'int', nullable: true }],
        },
      },
    };
    expect(resolveCanvasModelIdentity(referenced)?.icon).toBe('dbt');
    expect(
      resolveCanvasModelIdentity({ ...referenced, metadata: { dbtModelReference: {} } })?.icon
    ).toBe('model');
    const saved = applyCanvasInspectorNodeDraft(referenced, {
      ...createCanvasInspectorNodeDraft(referenced),
      modelIcon: 'sql',
    });
    expect(saved.metadata).toEqual({ ...referenced.metadata, modelIcon: 'sql' });
  });

  it('changes and resets the preference without rewriting imported dbt execution metadata', () => {
    const updated = applyCanvasInspectorNodeDraft(dbt, {
      ...createCanvasInspectorNodeDraft(dbt),
      modelIcon: 'sql',
    });
    expect(updated.metadata).toEqual({ ...dbt.metadata, modelIcon: 'sql' });
    expect(createCanvasInspectorNodeDraft(updated).modelIcon).toBe('sql');
    const reset = applyCanvasInspectorNodeDraft(updated, {
      ...createCanvasInspectorNodeDraft(updated),
      modelIcon: 'auto',
    });
    expect(reset.metadata).toEqual(dbt.metadata);
    expect(resolveCanvasModelIdentity(reset)?.icon).toBe('dbt');
  });

  it('saves one preference on the definition and restores it on every instance without changing Substrait', () => {
    const source = sourceNode();
    const definition = projectedModel(source, ['order_id']);
    const instance = createCanvasNodeInstance(definition, new Set(), 'instance');
    const fixture = outputFixture(source, definition);
    const draftSession = canvasDraftSessionWorkingSet.addExplicitNode(
      fixture.draftSession,
      instance
    );
    const inspected = resolveCanvasDraftNodes(draftSession, fixture.canonicalNodesById).find(
      (node) => node.id === instance.id
    )!;
    const result = applyCanvasInspectorNodeDraftToSession({
      ...fixture,
      draftSession,
      node: inspected,
      draft: { ...createCanvasInspectorNodeDraft(inspected), modelIcon: 'model' },
      workspaceScope: {
        tenantId: 'tenant',
        projectId: 'project',
        environmentId: 'dev',
        targetAdapter: 'temporal',
      },
    });
    expect(result.outcome).toBe('applied');
    if (result.outcome !== 'applied') throw new Error('Expected identity edit');
    const nodes = resolveCanvasDraftNodes(result.draftSession, fixture.canonicalNodesById);
    const draft = buildCanvasAuthoringDraft({
      canvas: { kind: 'dvt', title: 'Canvas' },
      nodeIds: nodes.map((node) => node.id),
      nodePositions: Object.fromEntries(nodes.map((node) => [node.id, { x: 0, y: 0 }])),
      visibleEdges: [],
      canonicalNodes: nodes,
      canonicalEdges: [],
    });
    const saved = WorkspaceGraphAuthoringDraftSchema.parse(JSON.parse(JSON.stringify(draft)));
    expect(saved.nodes.find((node) => node.id === instance.id)?.metadata).toBeUndefined();
    const reloaded = projectWorkspaceGraphAuthoringDraftSemanticGraph(saved);
    for (const id of [definition.id, instance.id]) {
      const node = reloaded.canonicalNodes.find((item) => item.id === id)!;
      expect(node.metadata).toEqual({ ...definition.metadata, modelIcon: 'model' });
      expect(resolveCanvasModelIdentity(node)?.icon).toBe('model');
    }
  });

  it('rejects a forged technology through the real command without changing the draft session', () => {
    const source = sourceNode();
    const definition = projectedModel(source, ['order_id']);
    const fixture = outputFixture(source, definition);
    const before = structuredClone(fixture.draftSession);
    const result = applyCanvasInspectorNodeDraftToSession({
      ...fixture,
      node: definition,
      draft: { ...createCanvasInspectorNodeDraft(definition), modelIcon: 'dbt' },
      workspaceScope: {
        tenantId: 'tenant',
        projectId: 'project',
        environmentId: 'dev',
        targetAdapter: 'temporal',
      },
    });
    expect(result).toMatchObject({
      outcome: 'rejected',
      reason: 'invalid_draft',
      errors: { modelIcon: 'node_icon_incompatible' },
    });
    expect(fixture.draftSession).toEqual(before);
  });
});
