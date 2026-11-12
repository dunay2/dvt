/** Owned concern: prove one authority is selected and protected/DVT routes remain independent. */
import { parseExecutionSelection } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import {
  MODEL_ID,
  GRAPH_SOURCE,
  PROVENANCE,
  buildContext,
  buildProjection,
  buildService,
} from './resolveAuthorizedPreviewSelection.fixtures.js';

describe('ResolveAuthorizedPreviewSelectionService authority routing', () => {
  it('canonicalizes graph IDs independently of locale without mutating caller order', async () => {
    const orderedIds = ['10', '2', 'Z', '_', 'a', 'e\u0301', '\u00e9'].map(
      (suffix) => `model.analytics.${suffix}`
    );
    const selectedIds = Object.freeze([...orderedIds].reverse());
    const template = buildProjection().nodes.find((node) => node.resourceType === 'model')!;
    const projection = buildProjection({
      nodes: selectedIds.map((uniqueId) => ({ ...template, uniqueId })),
      edges: [],
      capabilities: { canPreview: true, canRun: true, codeOnlyResourceCount: selectedIds.length },
    });
    Object.freeze(projection.nodes);
    const { service } = buildService(projection);
    const graphSource = {
      ...GRAPH_SOURCE,
      nodes: Object.freeze(selectedIds.map((nodeId) => ({ ...GRAPH_SOURCE.nodes[0]!, nodeId }))),
    };
    const result = await service.execute(
      {
        selection: parseExecutionSelection({ mode: 'explicit', nodeIds: selectedIds }),
        graphSource,
        provenance: { ...PROVENANCE, selectedUniqueIds: orderedIds },
      },
      buildContext()
    );

    if (!result.ok) throw new Error(result.rejection.cause);
    expect(result.value.graphSource.nodes.map((node) => node.nodeId)).toEqual(orderedIds);
    expect(graphSource.nodes.map((node) => node.nodeId)).toEqual(selectedIds);
    expect(projection.nodes.map((node) => node.uniqueId)).toEqual(selectedIds);
  });

  it('delegates protected DVT Preview without accepting a browser graph', async () => {
    const { service, dvtPreview, graphDraftResolver, projectGraph, dbtCompilation } =
      buildService();
    const selection = parseExecutionSelection({ mode: 'upstream', nodeIds: ['transform-a'] });
    const resolution = {
      ok: true as const,
      value: {
        graphSource: {
          kind: 'generic-graph-v1' as const,
          sourceFamily: 'dvt-operational-workloads',
          sourceVersion: '1.0',
          nodes: [
            {
              nodeId: 'transform-a',
              stepKind: 'DVT_POSTGRES_OPERATIONAL_WORKLOAD',
              dependsOn: [],
            },
          ],
        },
        nodeIds: ['transform-a'],
        decisionScopeNodeIds: ['transform-a'],
        requestedRootNodeIds: ['transform-a'],
      },
    };
    dvtPreview.execute.mockResolvedValue(resolution);

    await expect(
      service.execute(
        {
          selection,
          provenance: {
            kind: 'dvt-protected-workspace-graph',
            canvasId: 'canvas-a',
          },
        },
        buildContext()
      )
    ).resolves.toEqual(resolution);
    expect(dvtPreview.execute).toHaveBeenCalledWith(
      {
        selection,
        provenance: {
          kind: 'dvt-protected-workspace-graph',
          canvasId: 'canvas-a',
        },
      },
      buildContext()
    );
    expect(graphDraftResolver.execute).not.toHaveBeenCalled();
    expect(projectGraph.execute).not.toHaveBeenCalled();
    expect(dbtCompilation.execute).not.toHaveBeenCalled();
  });

  it('re-resolves dbt file Preview from the bound server projection without reading graph draft', async () => {
    const { service, projectGraph, graphDraftResolver } = buildService();
    const selection = parseExecutionSelection({ mode: 'explicit', nodeIds: [MODEL_ID] });

    await expect(
      service.execute(
        { selection, graphSource: GRAPH_SOURCE, provenance: PROVENANCE },
        buildContext()
      )
    ).resolves.toEqual({
      ok: true,
      value: {
        graphSource: GRAPH_SOURCE,
        nodeIds: [MODEL_ID],
        decisionScopeNodeIds: [MODEL_ID],
        requestedRootNodeIds: [MODEL_ID],
      },
    });
    expect(projectGraph.execute).toHaveBeenCalledWith({
      canvasId: 'analytics-canvas',
      scope: { tenantId: 'tenant-a', projectId: 'project-a', environmentId: 'env-a' },
    });
    expect(graphDraftResolver.execute).not.toHaveBeenCalled();
  });

  it('delegates non-file Preview to protected graph-draft selection resolution', async () => {
    const graphDraftResult = {
      ok: true as const,
      value: {
        selection: parseExecutionSelection({ mode: 'explicit', nodeIds: ['transform'] }),
        nodeIds: ['transform'],
        decisionScopeNodeIds: ['transform'],
        edgeIds: [],
        executable: true,
        diagnostics: [],
      },
    };
    const { service, graphDraftResolver, dbtCompilation, projectGraph, dvtPreview } =
      buildService();
    graphDraftResolver.execute.mockResolvedValue(graphDraftResult);
    const input = {
      selection: parseExecutionSelection({ mode: 'explicit', nodeIds: ['transform'] }),
      graphSource: {
        kind: 'generic-graph-v1' as const,
        sourceFamily: 'dvt-substrait',
        sourceVersion: 'substrait-v1',
        nodes: [{ nodeId: 'transform', stepKind: 'DBT_MODEL', dependsOn: [] }],
      },
    };

    await expect(service.execute(input, buildContext())).resolves.toEqual({
      ok: true,
      value: {
        graphSource: input.graphSource,
        nodeIds: ['transform'],
        decisionScopeNodeIds: ['transform'],
        requestedRootNodeIds: ['transform'],
      },
    });
    expect(graphDraftResolver.execute).toHaveBeenCalledWith(input, buildContext());
    expect(dbtCompilation.execute).not.toHaveBeenCalled();
    expect(projectGraph.execute).not.toHaveBeenCalled();
    expect(dvtPreview.execute).not.toHaveBeenCalled();
  });
});
