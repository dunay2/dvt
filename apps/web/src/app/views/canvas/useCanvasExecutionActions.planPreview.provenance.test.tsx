// @vitest-environment jsdom

import { sha256HexUtf8 } from '@dvt/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { canvasViewCopy } from './copy';
import { buildPreviewDesignGraphArtifactContent } from './previewGraphSource';
import {
  buildCanonicalEdges,
  buildCanonicalNodes,
  createPlansServiceMock,
  createRunsServiceMock,
  createSessionContext,
  createWorkspaceFilePortMocks,
  DEFAULT_PREVIEW_PROVENANCE_CONFIG,
  renderExecutionActionsHarness,
  resetExecutionActionsTestDoubles,
  restoreExecutionActionsTestDoubles,
} from './useCanvasExecutionActions.test.support';

describe('useCanvasExecutionActions plan preview provenance', () => {
  let harness: ReturnType<typeof renderExecutionActionsHarness> | null = null;

  beforeEach(() => {
    resetExecutionActionsTestDoubles();
  });

  afterEach(() => {
    harness?.cleanup();
    harness = null;
    restoreExecutionActionsTestDoubles();
  });

  it('projects canvas-authored transformation nodes into workspace artifacts before preview', async () => {
    const plansService = createPlansServiceMock();
    const authoringNodes: CanonicalNode[] = [
      {
        id: 'source-2',
        name: 'Source 2',
        pluginId: 'dvt',
        kind: 'dvt:source',
        role: 'input' as const,
        status: 'idle' as const,
        tags: ['authoring'],
        metadata: { typeLabel: 'Source' },
      },
      {
        id: 'dvt-sql-transform-1',
        name: 'SQL transform 1',
        pluginId: 'dvt',
        kind: 'dvt:sql_transform',
        role: 'transform' as const,
        status: 'idle' as const,
        tags: ['authoring'],
        metadata: { typeLabel: 'SQL transform' },
      },
      {
        id: 'sink-1',
        name: 'Sink 1',
        pluginId: 'dvt',
        kind: 'dvt:sink',
        role: 'output' as const,
        status: 'idle' as const,
        tags: ['authoring'],
        metadata: { typeLabel: 'Sink' },
      },
    ];
    const authoringEdges: CanonicalEdge[] = [
      {
        id: 'edge-source-transform',
        sourceId: 'source-2',
        targetId: 'dvt-sql-transform-1',
        relation: 'lineage' as const,
      },
      {
        id: 'edge-transform-sink',
        sourceId: 'dvt-sql-transform-1',
        targetId: 'sink-1',
        relation: 'lineage' as const,
      },
    ];
    const workspaceFilePorts = createWorkspaceFilePortMocks({});

    harness = renderExecutionActionsHarness({
      plansService,
      runsService: createRunsServiceMock(),
      ...workspaceFilePorts,
      canonicalNodes: authoringNodes,
      canonicalEdges: authoringEdges,
      previewProvenanceConfig: {
        gitBranch: 'detached',
        gitSha: 'unknown',
      },
    });
    await harness.render();

    await harness.clickPlan();

    expect(workspaceFilePorts.workspaceFileContentCommand.saveFileContent).toHaveBeenCalledWith(
      'models/dvt-sql-transform-1.sql',
      'select *\nfrom public.source_2;\n'
    );
    expect(workspaceFilePorts.workspaceFileContentCommand.saveFileContent).toHaveBeenCalledWith(
      'pipelines/project-transformation-preview.yaml',
      expect.stringContaining('entrypoint: "models/dvt-sql-transform-1.sql"')
    );
    expect(plansService.previewPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        previewProfile: 'transformation-sql-first-v1',
        graphSource: expect.objectContaining({
          nodes: expect.arrayContaining([
            expect.objectContaining({
              nodeId: 'source-2',
              stepTypeConfig: expect.objectContaining({
                sourceSchema: 'public',
                sourceTable: 'source_2',
                sourceAlias: 'source_2',
              }),
            }),
            expect.objectContaining({
              nodeId: 'dvt-sql-transform-1',
              stepTypeConfig: expect.objectContaining({
                entrypoint: 'models/dvt-sql-transform-1.sql',
                sql: 'select *\nfrom public.source_2;\n',
              }),
            }),
            expect.objectContaining({
              nodeId: 'sink-1',
              stepTypeConfig: expect.objectContaining({
                sinkSchema: 'public',
                sinkTable: 'sink_1',
                materialization: 'table',
                writeMode: 'replace',
              }),
            }),
          ]),
        }),
        provenance: {
          graphArtifact: expect.objectContaining({
            repo: 'workspace://tenant/project',
            path: 'pipelines/project-transformation-preview.yaml',
            ref: 'workspace/env',
            commitSha: 'workspace-draft',
          }),
          sqlArtifact: expect.objectContaining({
            repo: 'workspace://tenant/project',
            path: 'models/dvt-sql-transform-1.sql',
            ref: 'workspace/env',
            commitSha: 'workspace-draft',
          }),
        },
      })
    );
    expect(harness.shellFeedback.success).toHaveBeenCalledWith(canvasViewCopy.planCreatedMessage);
  });

  it('adds preview provenance for temporal targets when workspace files resolve', async () => {
    const canonicalNodes = buildCanonicalNodes();
    const canonicalEdges = buildCanonicalEdges();
    const nodesWithTransformPath = canonicalNodes.map((node) =>
      node.id === 'transform-node' ? { ...node, path: 'models/transform.sql' } : node
    );
    const plansService = createPlansServiceMock();
    const workspaceFilePorts = createWorkspaceFilePortMocks({
      'pipelines/sales_pipeline.yaml': 'name: sales_pipeline\nsteps: []',
      'models/transform.sql': 'select * from analytics.orders',
    });

    harness = renderExecutionActionsHarness({
      plansService,
      runsService: createRunsServiceMock(),
      ...workspaceFilePorts,
      sessionContext: createSessionContext('temporal'),
      canonicalNodes: nodesWithTransformPath,
      canonicalEdges,
      previewProvenanceConfig: {
        gitBranch: 'main',
        gitSha: 'abc123',
        gitRepo: 'dunay2/dvt',
        graphArtifactPath: 'pipelines/sales_pipeline.yaml',
      },
    });
    await harness.render();

    await harness.clickPlan();

    const expectedGraphArtifactContent = buildPreviewDesignGraphArtifactContent({
      nodes: nodesWithTransformPath,
      edges: canonicalEdges,
      scopedNodeIds: ['source-node', 'transform-node', 'sink-node'],
      sqlArtifact: {
        repo: 'dunay2/dvt',
        path: 'models/transform.sql',
        ref: 'refs/heads/main',
        commitSha: 'abc123',
        contentSha256: sha256HexUtf8('select * from analytics.orders'),
      },
      context: {
        tenantId: 'tenant',
        projectId: 'project',
        environmentId: 'env',
      },
    });

    expect(plansService.previewPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        previewProfile: 'transformation-sql-first-v1',
        provenance: {
          graphArtifact: {
            repo: 'dunay2/dvt',
            path: 'pipelines/sales_pipeline.yaml',
            ref: 'refs/heads/main',
            commitSha: 'abc123',
            contentSha256: sha256HexUtf8(expectedGraphArtifactContent),
          },
          sqlArtifact: {
            repo: 'dunay2/dvt',
            path: 'models/transform.sql',
            ref: 'refs/heads/main',
            commitSha: 'abc123',
            contentSha256: sha256HexUtf8('select * from analytics.orders'),
          },
        },
      })
    );
    expect(workspaceFilePorts.workspaceFileContentCommand.saveFileContent).toHaveBeenCalledWith(
      'pipelines/sales_pipeline.yaml',
      expectedGraphArtifactContent
    );
  });

  it('fails closed when the graph artifact cannot be persisted before preview', async () => {
    const canonicalNodes = buildCanonicalNodes();
    const canonicalEdges = buildCanonicalEdges();
    const nodesWithTransformPath = canonicalNodes.map((node) =>
      node.id === 'transform-node' ? { ...node, path: 'models/transform.sql' } : node
    );
    const plansService = createPlansServiceMock();
    const workspaceFilePorts = createWorkspaceFilePortMocks({
      'models/transform.sql': 'select * from analytics.orders',
    });
    const workspaceFileContentCommand = {
      saveFileContent: vi.fn(async () => {
        throw new Error('Graph artifact could not be written to the workspace.');
      }),
    };

    harness = renderExecutionActionsHarness({
      plansService,
      runsService: createRunsServiceMock(),
      workspaceFilesQuery: workspaceFilePorts.workspaceFilesQuery,
      workspaceFileContentCommand,
      canonicalNodes: nodesWithTransformPath,
      canonicalEdges,
    });
    await harness.render();

    await harness.clickPlan();

    expect(plansService.previewPlan).not.toHaveBeenCalled();
    expect(harness.shellFeedback.error).toHaveBeenCalledWith(
      'Graph artifact could not be written to the workspace.'
    );
  });

  it('fails closed when source or sink authoring payload is missing for the graph artifact', async () => {
    const canonicalEdges = buildCanonicalEdges();
    const invalidNodes = buildCanonicalNodes().map((node) =>
      node.id === 'sink-node'
        ? {
            ...node,
            metadata: {
              config: {
                schema: 'analytics',
                materialization: 'table',
                writeMode: 'replace',
              },
            },
          }
        : node
    );
    const plansService = createPlansServiceMock();

    harness = renderExecutionActionsHarness({
      plansService,
      runsService: createRunsServiceMock(),
      canonicalNodes: invalidNodes,
      canonicalEdges,
    });
    await harness.render();

    await harness.clickPlan();

    expect(plansService.previewPlan).not.toHaveBeenCalled();
    expect(harness.shellFeedback.error).toHaveBeenCalledWith(
      'Preview graph artifact requires sink node sink-node to define metadata.config.schema, table, materialization, and writeMode.'
    );
  });

  it('fails closed for temporal targets when preview provenance is not configured', async () => {
    const canonicalEdges = buildCanonicalEdges();
    const nodesWithTransformPath = buildCanonicalNodes().map((node) =>
      node.id === 'transform-node' ? { ...node, path: 'models/transform.sql' } : node
    );
    const plansService = createPlansServiceMock();

    harness = renderExecutionActionsHarness({
      plansService,
      runsService: createRunsServiceMock(),
      sessionContext: createSessionContext('temporal'),
      canonicalNodes: nodesWithTransformPath,
      canonicalEdges,
      previewProvenanceConfig: {
        gitBranch: 'main',
        gitSha: 'abc123',
      },
    });
    await harness.render();

    await harness.clickPlan();

    expect(plansService.previewPlan).not.toHaveBeenCalled();
    expect(harness.shellFeedback.error).toHaveBeenCalledWith(
      canvasViewCopy.previewProvenanceWorkspaceNotConfiguredMessage
    );
  });

  it('fails closed when preview provenance still uses placeholder Git revision data', async () => {
    const plansService = createPlansServiceMock();

    harness = renderExecutionActionsHarness({
      plansService,
      runsService: createRunsServiceMock(),
      canonicalNodes: buildCanonicalNodes(),
      canonicalEdges: buildCanonicalEdges(),
      previewProvenanceConfig: {
        ...DEFAULT_PREVIEW_PROVENANCE_CONFIG,
        gitBranch: 'detached',
        gitSha: 'unknown',
      },
    });
    await harness.render();

    await harness.clickPlan();

    expect(plansService.previewPlan).not.toHaveBeenCalled();
    expect(harness.shellFeedback.error).toHaveBeenCalledWith(
      canvasViewCopy.previewProvenanceExplicitGitRevisionRequiredMessage
    );
  });
});
