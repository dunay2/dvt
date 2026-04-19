// @vitest-environment jsdom

import { sha256HexUtf8 } from '@dvt/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { IWorkspacePort } from '../../ports/workspace';
import { canvasViewCopy } from './copy';
import { buildPreviewDesignGraphArtifactContent } from './previewGraphSource';
import {
  buildCanonicalEdges,
  buildCanonicalNodes,
  createPlansServiceMock,
  createRunsServiceMock,
  createSessionContext,
  createWorkspaceServiceMock,
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

  it('adds preview provenance for temporal targets when workspace files resolve', async () => {
    const canonicalNodes = buildCanonicalNodes();
    const canonicalEdges = buildCanonicalEdges();
    const nodesWithTransformPath = canonicalNodes.map((node) =>
      node.id === 'transform-node' ? { ...node, path: 'models/transform.sql' } : node
    );
    const plansService = createPlansServiceMock();
    const workspaceService = createWorkspaceServiceMock({
      'pipelines/sales_pipeline.yaml': 'name: sales_pipeline\nsteps: []',
      'models/transform.sql': 'select * from analytics.orders',
    });

    harness = renderExecutionActionsHarness({
      plansService,
      runsService: createRunsServiceMock(),
      workspaceService,
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
    expect(workspaceService.saveFileContent).toHaveBeenCalledWith(
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
    const workspaceService = {
      ...createWorkspaceServiceMock({
        'models/transform.sql': 'select * from analytics.orders',
      }),
      saveFileContent: vi.fn(async () => {
        throw new Error('Graph artifact could not be written to the workspace.');
      }),
    } satisfies IWorkspacePort;

    harness = renderExecutionActionsHarness({
      plansService,
      runsService: createRunsServiceMock(),
      workspaceService,
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
