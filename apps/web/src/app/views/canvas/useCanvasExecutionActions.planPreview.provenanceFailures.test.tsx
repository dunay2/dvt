// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { canvasViewCopy } from './copy';
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

describe('useCanvasExecutionActions plan preview provenance failures', () => {
  let harness: ReturnType<typeof renderExecutionActionsHarness> | null = null;

  beforeEach(() => {
    resetExecutionActionsTestDoubles();
  });

  afterEach(() => {
    harness?.cleanup();
    harness = null;
    restoreExecutionActionsTestDoubles();
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
      'pipelines/sales_pipeline.yaml': 'name: sales_pipeline\nsteps: []',
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
      canonicalEdges: buildCanonicalEdges(),
    });
    await harness.render();

    await harness.clickPlan();

    expect(plansService.previewPlan).not.toHaveBeenCalled();
    expect(harness.shellFeedback.error).toHaveBeenCalledWith(
      'Preview graph artifact requires sink node sink-node to define metadata.config.schema, table, materialization, and writeMode.'
    );
  });

  it('fails closed for temporal targets when preview provenance is not configured', async () => {
    const nodesWithTransformPath = buildCanonicalNodes().map((node) =>
      node.id === 'transform-node' ? { ...node, path: 'models/transform.sql' } : node
    );
    const plansService = createPlansServiceMock();

    harness = renderExecutionActionsHarness({
      plansService,
      runsService: createRunsServiceMock(),
      sessionContext: createSessionContext('temporal'),
      canonicalNodes: nodesWithTransformPath,
      canonicalEdges: buildCanonicalEdges(),
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
