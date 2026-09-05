// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import {
  createGraphDbtWorkspaceArtifactPublicationCommandMock,
  createPlansServiceMock,
  createRunsServiceMock,
  createWorkspaceFilesQueryMock,
  renderExecutionActionsHarness,
  resetExecutionActionsTestDoubles,
  restoreExecutionActionsTestDoubles,
} from './useCanvasExecutionActions.test.support';
import { canvasViewCopy } from './copy';

const nodes: readonly CanonicalNode[] = [
  {
    id: 'source-orders',
    name: 'Raw Orders',
    pluginId: 'dvt',
    kind: 'dvt:source',
    role: 'input',
    status: 'idle',
    tags: [],
    metadata: {
      columns: [{ name: 'order_id', type: 'bigint' }],
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
    pluginId: 'dvt',
    kind: 'dvt:transform',
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

describe('useCanvasExecutionActions graph SQL divergence', () => {
  let harness: ReturnType<typeof renderExecutionActionsHarness> | null = null;

  beforeEach(() => resetExecutionActionsTestDoubles());

  afterEach(() => {
    harness?.cleanup();
    harness = null;
    restoreExecutionActionsTestDoubles();
  });

  it('refuses to replace unmarked SQL and never starts preview', async () => {
    const plansService = createPlansServiceMock();
    const graphPublicationCommand = createGraphDbtWorkspaceArtifactPublicationCommandMock();
    const workspaceFilesQuery = createWorkspaceFilesQueryMock({
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
      workspaceFilesQuery,
    });
    await harness.render();

    await harness.clickPlan();

    expect(harness.shellFeedback.error).toHaveBeenCalledWith(
      canvasViewCopy.planGraphModelSqlDivergenceMessageTemplate.replace(
        '{path}',
        'models/orders_model.sql'
      )
    );
    expect(plansService.previewPlan).not.toHaveBeenCalled();
    expect(graphPublicationCommand.publish).not.toHaveBeenCalled();
    expect(await workspaceFilesQuery.getFileContent('models/orders_model.sql')).toMatchObject({
      content: 'select * from historical_graph_projection\n',
    });
  });
});
