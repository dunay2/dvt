import { describe, expect, it } from 'vitest';
import {
  DbtProjectGraphProjectionSchema,
  WorkspaceGraphAuthoringDraftSchema,
} from '@dvt/contracts';
import {
  createCanvasDbtModelDefinition,
  resolveCanvasDbtModelSignature,
} from './canvasDbtModelReference';
import { createCanvasNodeInstance } from './canvasNodeInstance';
import { buildCanvasAuthoringDraft } from './canvasDraftAuthoring';
import { projectWorkspaceGraphAuthoringDraftSemanticGraph } from '../../services/workspace/workspaceGraphDraftProjection';
import { resolveCanvasDvtCompositionInputs } from './canvasDvtCompositionInputCatalog';
import { createCanvasRelationalTreeProjectionDraft } from './canvasRelationalTreeProjectionAuthoring';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { resolveCanvasSubstraitGraphBindings } from './canvasSubstraitGraphBindings';
import { buildProtectedDvtPreviewProjection } from './canvasDvtPreviewProjection';
import { TRANSFORM } from './canvasOutputProjection.test-support';

const projection = DbtProjectGraphProjectionSchema.parse({
  schemaVersion: 'dbt-project-graph-projection.v1',
  adapterType: 'postgres',
  authorityBinding: {
    schemaVersion: 'canvas-authoring-authority-binding.v1',
    canvasId: 'file-owner',
    authority: { kind: 'dbt-project-files', projectRoot: '.' },
  },
  freshness: 'fresh',
  analysisSha256: 'a'.repeat(64),
  projectRevision: {
    projectRoot: '.',
    projectName: 'demo',
    dbtVersion: '1.10.0',
    contentSetSha256: 'b'.repeat(64),
    analyzedAt: '2026-11-04T00:00:00.000Z',
    analyzerVersion: 'native-dbt',
  },
  nodes: [
    {
      uniqueId: 'model.demo.clientes',
      name: 'clientes',
      resourceType: 'model',
      packageName: 'demo',
      originalFilePath: 'models/clientes.sql',
      columns: [{ name: 'client_id', dataType: 'text' }],
      tags: [],
      visualEditability: { status: 'code_only', reasons: ['file-authority'] },
    },
  ],
  edges: [],
  diagnostics: [],
  capabilities: { canPreview: true, canRun: true, codeOnlyResourceCount: 1 },
  executionTarget: {
    provider: 'temporal',
    adapter: 'postgres',
    targetName: 'default',
    connectionRef: {
      schemaVersion: 'connection-ref.v1',
      provider: 'postgres',
      connectionId: 'warehouse',
    },
    resolutionSource: 'environment-default',
    credentialRef: 'env:DBT_PROFILES_DIR',
  },
});

describe('native file-model definitions and instances', () => {
  it('retains one file reference across independent persisted placements without edges or copied SQL', () => {
    const definition = createCanvasDbtModelDefinition(projection, 'model.demo.clientes');
    const first = createCanvasNodeInstance(definition, new Set(), 'first');
    const second = createCanvasNodeInstance(definition, new Set([first.name]), 'second');
    const draft = buildCanvasAuthoringDraft({
      canvas: { kind: 'dvt', title: 'Canvas' },
      nodeIds: [first.id, second.id],
      nodePositions: { first: { x: 0, y: 0 }, second: { x: 250, y: 0 } },
      visibleEdges: [],
      canonicalNodes: [definition, first, second],
      canonicalEdges: [],
    });
    const saved = WorkspaceGraphAuthoringDraftSchema.parse(JSON.parse(JSON.stringify(draft)));
    expect(saved.edges).toEqual([]);
    expect(
      saved.nodes.filter((node) => node.definitionId != null).every((node) => node.metadata == null)
    ).toBe(true);
    expect(JSON.stringify(saved)).not.toContain('compiledSql');
    expect(
      saved.nodes.find((node) => node.id === definition.id)?.metadata?.transformAuthoring
    ).toBeUndefined();
    const graph = projectWorkspaceGraphAuthoringDraftSemanticGraph(saved);
    expect(
      resolveCanvasDbtModelSignature(graph.canonicalNodes.find((node) => node.id === first.id)!)
        ?.reference.fields
    ).toEqual(resolveCanvasDbtModelSignature(definition)?.reference.fields);
  });
  it('consumes the reference through existing producer Reads and protected Preview admission', () => {
    const definition = createCanvasDbtModelDefinition(projection, 'model.demo.clientes');
    const instance = createCanvasNodeInstance(definition, new Set(), 'instance');
    const consumer = { ...TRANSFORM, id: 'consumer' };
    const edge = {
      id: 'manual-dependency',
      sourceId: instance.id,
      targetId: consumer.id,
      relation: 'lineage' as const,
    };
    const input = resolveCanvasDvtCompositionInputs({
      targetNodeId: consumer.id,
      nodes: [definition, instance, consumer],
      edges: [edge],
    })[0]!;
    expect(input.fields.map((field) => field.name)).toEqual(['client_id']);
    const document = createCanvasRelationalTreeProjectionDraft({
      input,
      targetNodeId: consumer.id,
    });
    const configured = applyDvtSubstraitSemanticDocument(
      consumer,
      encodeDvtSubstraitSemanticDocument(document)
    );
    const nodes = [definition, instance, configured];
    expect(
      buildProtectedDvtPreviewProjection({
        canvasId: 'native',
        canonicalNodes: [definition, instance],
        canonicalEdges: [],
        workspaceNodeIds: [instance.id],
        selectionIntent: { mode: 'explicit', nodeIds: [instance.id] },
      }).ok
    ).toBe(false);
    expect(
      resolveCanvasSubstraitGraphBindings({ node: configured, nodes, edges: [edge] }).connection
        .connectionId
    ).toBe('warehouse');
    expect(
      buildProtectedDvtPreviewProjection({
        canvasId: 'native',
        canonicalNodes: nodes,
        canonicalEdges: [edge],
        workspaceNodeIds: [instance.id, configured.id],
        selectionIntent: { mode: 'explicit', nodeIds: [configured.id] },
      }).ok
    ).toBe(true);
    expect(() =>
      applyDvtSubstraitSemanticDocument(instance, encodeDvtSubstraitSemanticDocument(document))
    ).toThrow('dbt files');
  });
  it('does not turn stale analysis into an admitted definition', () => {
    expect(() =>
      createCanvasDbtModelDefinition(
        { ...projection, freshness: 'stale-last-valid' },
        'model.demo.clientes'
      )
    ).toThrow();
    expect(() => createCanvasDbtModelDefinition(projection, 'model.demo.missing')).toThrow();
  });
});
