// @vitest-environment jsdom

/** Owned concern: prove retired canvas guide surfaces stay out of the graph base. */
import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createCanvasShellHarness } from './CanvasShell.testHarness';

describe('CanvasShell legacy guide retirement', () => {
  let harness: ReturnType<typeof createCanvasShellHarness>;

  beforeEach(() => {
    harness = createCanvasShellHarness();
  });

  afterEach(() => {
    harness.unmount();
  });

  it('does not render the legacy DVT flow guide over the graph base surface', async () => {
    await harness.render();

    expect(harness.container.querySelector('[data-slot="canvas-dvt-flow-guide"]')).toBeNull();
    expect(harness.container.querySelector('[data-testid="canvas-viewport"]')).not.toBeNull();
  });

  it('hides the DVT flow guide when a workbench tab panel replaces the graph viewport', async () => {
    await harness.render({
      layout: {
        workbenchTabPanel: <div data-testid="code-workbench-panel" />,
      },
      chromeState: {
        transformationValidation: {
          valid: true,
          summaryCode: 'valid',
          draftSignature: 'dvt-flow-ready',
          scopedNodeIds: ['src-orders', 'tx-orders', 'sink-orders'],
          scopedEdgeIds: ['e1', 'e2'],
          nodeRolesById: {
            'src-orders': 'source',
            'tx-orders': 'sql_transform',
            'sink-orders': 'sink',
          },
        },
      },
    });

    expect(harness.container.querySelector('[data-testid="code-workbench-panel"]')).not.toBeNull();
    expect(harness.container.querySelector('[data-slot="canvas-dvt-flow-guide"]')).toBeNull();
  });

  it('does not render the legacy DBT flow guide over the graph base surface', async () => {
    await harness.render({
      chromeState: {
        canvasAuthoringMode: 'dbt',
      },
    });

    expect(harness.container.querySelector('[data-slot="canvas-dbt-flow-guide"]')).toBeNull();
    expect(harness.container.querySelector('[data-testid="canvas-viewport"]')).not.toBeNull();
  });

  it('keeps DBT graph details out of a synthetic guide when model SQL is unavailable', async () => {
    await harness.render({
      graph: {
        nodesWithImpact: [
          {
            id: 'src-raw-orders',
            type: 'dbtNode',
            position: { x: 0, y: 0 },
            data: {
              name: 'Raw Orders',
              pluginKind: 'dbt:source',
              role: 'input',
              status: 'idle',
              tags: [],
              metadata: {
                dbt: {
                  sourceName: 'raw',
                  schemaName: 'erp',
                  tableName: 'orders',
                },
              },
            },
          },
          {
            id: 'model-fct-orders',
            type: 'dbtNode',
            position: { x: 260, y: 0 },
            data: {
              name: 'fct_orders',
              pluginKind: 'dbt:model',
              role: 'transform',
              status: 'idle',
              tags: [],
              metadata: {
                config: {
                  materialized: 'view',
                },
              },
            },
          },
        ],
        edges: [{ id: 'source-model', source: 'src-raw-orders', target: 'model-fct-orders' }],
      },
      chromeState: {
        canvasAuthoringMode: 'dbt',
        canPlanGraph: false,
        canStartRun: false,
      },
    });

    expect(harness.container.querySelector('[data-slot="canvas-dbt-flow-guide"]')).toBeNull();
    expect(harness.container.textContent).not.toContain('SQL missing');
    expect(harness.container.textContent).not.toContain(
      'select * from {{ source("raw", "orders") }}'
    );
  });
});
