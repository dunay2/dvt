// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import {
  createGraphDbtWorkspaceArtifactPublicationCommandMock,
  createPlansServiceMock,
  createRunsServiceMock,
  createWorkspaceFilePortMocks,
  renderExecutionActionsHarness,
  resetExecutionActionsTestDoubles,
  restoreExecutionActionsTestDoubles,
} from './useCanvasExecutionActions.test.support';

const nodes: readonly CanonicalNode[] = [
  {
    id: 'source-orders',
    name: 'Raw Orders',
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
  },
  {
    id: 'model-orders',
    name: 'Orders Model',
    pluginId: 'dbt',
    kind: 'dbt:model',
    role: 'transform',
    status: 'idle',
    tags: [],
    metadata: {
      dbt: {
        packageName: 'analytics',
        materialized: 'table',
        selectedSourceId: 'source-orders',
      },
    },
  },
];

const edges: readonly CanonicalEdge[] = [
  {
    id: 'source-to-model',
    sourceId: 'source-orders',
    targetId: 'model-orders',
    relation: 'lineage',
  },
];

describe('useCanvasExecutionActions graph SQL replacement', () => {
  let harness: ReturnType<typeof renderExecutionActionsHarness> | null = null;

  beforeEach(() => resetExecutionActionsTestDoubles());

  afterEach(() => {
    harness?.cleanup();
    harness = null;
    restoreExecutionActionsTestDoubles();
  });

  it('publishes divergent pre-marker SQL only after exact user confirmation', async () => {
    const plansService = createPlansServiceMock();
    const graphPublicationCommand = createGraphDbtWorkspaceArtifactPublicationCommandMock();
    const workspacePorts = createWorkspaceFilePortMocks({
      'models/orders_model.sql': 'select * from historical_graph_projection\n',
    });

    harness = renderExecutionActionsHarness({
      plansService,
      runsService: createRunsServiceMock(),
      initialPlan: null,
      stateful: true,
      canonicalNodes: [...nodes],
      canonicalEdges: [...edges],
      executionStrategy: {
        kind: 'planner_generic_preview',
        previewProfile: 'planner-generic-v1',
        sourceFamily: 'dbt',
      },
      selectionIntent: { mode: 'explicit', nodeIds: ['model-orders'] },
      workspaceNodeIds: ['source-orders', 'model-orders'],
      graphDbtWorkspaceArtifactPublicationCommand: graphPublicationCommand,
      ...workspacePorts,
    });
    await harness.render();

    await harness.clickPlan();

    expect(harness.text('graph-sql-replacement-open')).toBe('true');
    expect(harness.text('graph-sql-replacement-paths')).toBe('models/orders_model.sql');
    expect(workspacePorts.workspaceFileContentCommand.saveFileContent).not.toHaveBeenCalled();
    expect(plansService.previewPlan).not.toHaveBeenCalled();

    await harness.clickCancelGraphSqlReplacement();

    expect(harness.text('graph-sql-replacement-open')).toBe('false');
    expect(
      await workspacePorts.workspaceFilesQuery.getFileContent('models/orders_model.sql')
    ).toMatchObject({ content: 'select * from historical_graph_projection\n' });

    await harness.clickPlan();
    await harness.clickConfirmGraphSqlReplacement();

    expect(harness.text('graph-sql-replacement-open')).toBe('false');
    expect(plansService.previewPlan).toHaveBeenCalledTimes(1);
    expect(graphPublicationCommand.publish).toHaveBeenCalledTimes(1);
    expect(graphPublicationCommand.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        artifacts: expect.arrayContaining([
          expect.objectContaining({
            path: 'models/orders_model.sql',
            content: expect.stringMatching(
              /^-- dvt:graph-draft-content-sha256=[a-f0-9]{64}\n[\s\S]*source\('raw', 'orders'\)/
            ),
          }),
        ]),
      })
    );
  });
});
