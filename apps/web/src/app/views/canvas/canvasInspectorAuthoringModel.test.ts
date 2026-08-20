import { describe, expect, it } from 'vitest';

import {
  applyCanvasInspectorNodeDraft,
  areCanvasInspectorNodeDraftsEqual,
  canonicalizeCanvasInspectorNodeDraft,
  createCanvasInspectorNodeDraft,
  hasCanvasInspectorNodeDraftChanges,
  validateCanvasInspectorNodeDraft,
} from './canvasInspectorAuthoringModel';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';

function buildNode(): CanonicalNode {
  return {
    id: 'node_1',
    name: 'orders_source',
    description: 'Source table',
    pluginId: 'dvt',
    kind: 'dvt:source',
    role: 'input',
    status: 'idle',
    tags: [],
  };
}

function buildDvtNode(
  kind: 'dvt:source' | 'dvt:sql_transform' | 'dvt:sink',
  metadata?: Record<string, unknown>
): CanonicalNode {
  return {
    id: `node_${kind.replace('dvt:', '')}`,
    name: kind === 'dvt:sql_transform' ? 'Clean orders' : 'Orders',
    pluginId: 'dvt',
    kind,
    role: kind === 'dvt:source' ? 'input' : kind === 'dvt:sink' ? 'output' : 'transform',
    status: 'idle',
    tags: ['authoring'],
    metadata,
  };
}

function buildImportedWarehouseSourceNode(metadata?: Record<string, unknown>): CanonicalNode {
  return {
    id: 'src_warehouse_prod_analytics_erp_orders',
    name: 'src_warehouse_prod_analytics_erp_orders',
    description: 'Imported source for analytics.erp.orders',
    pluginId: 'dvt.warehouse-source',
    kind: 'dvt:source',
    role: 'input',
    status: 'idle',
    tags: ['source', 'erp'],
    path: 'models/sources/src_erp.yml',
    metadata: {
      sourceName: 'warehouse_prod_analytics_erp',
      tableName: 'orders',
      database: 'analytics',
      schema: 'erp',
      columns: [{ name: 'id', type: 'number', nullable: false }],
      ...(metadata ?? {}),
    },
  };
}

describe('canvasInspectorAuthoringModel', () => {
  it('creates a semantic inspector draft from the selected canonical node', () => {
    expect(createCanvasInspectorNodeDraft(buildNode())).toEqual({
      name: 'orders_source',
      description: 'Source table',
      tags: [],
      dvt: {
        kind: 'source',
        schema: 'public',
        table: 'orders_source',
        alias: 'orders_source',
      },
    });
  });

  it('rejects blank node names', () => {
    expect(
      validateCanvasInspectorNodeDraft({
        name: '   ',
        description: '',
        tags: [],
      })
    ).toEqual({
      name: 'node_name_required',
    });
  });

  it('rejects blank required fields for a DVT source', () => {
    expect(
      validateCanvasInspectorNodeDraft({
        name: 'Orders',
        description: '',
        tags: [],
        dvt: {
          kind: 'source',
          schema: '   ',
          table: '',
          alias: ' ',
        },
      })
    ).toEqual({
      dvt: {
        schema: 'dvt_schema_required',
        table: 'dvt_table_required',
        alias: 'dvt_alias_required',
        connectionRef: 'dvt_connection_required',
      },
    });
  });

  it('tracks dirty state and applies the edited fields back into the canonical node', () => {
    const node = buildNode();
    const draft = {
      name: 'orders_source_v2',
      description: 'Renamed in inspector',
      tags: ['finance', 'critical'],
    };

    expect(hasCanvasInspectorNodeDraftChanges(node, draft)).toBe(true);
    expect(applyCanvasInspectorNodeDraft(node, draft)).toEqual({
      ...node,
      name: 'orders_source_v2',
      description: 'Renamed in inspector',
      tags: ['finance', 'critical'],
    });
  });

  it('normalizes empty descriptions back to undefined', () => {
    expect(
      applyCanvasInspectorNodeDraft(buildNode(), {
        name: 'orders_source',
        description: '   ',
        tags: [],
      }).description
    ).toBeUndefined();
  });

  it('normalizes tag edits before applying them to the canonical node', () => {
    expect(
      applyCanvasInspectorNodeDraft(buildNode(), {
        name: 'orders_source',
        description: 'Source table',
        tags: [' finance ', 'critical', 'finance', ''],
      }).tags
    ).toEqual(['finance', 'critical']);
  });

  it('accepts the plugin-owned DBT model SQL field through the shared inspector draft', () => {
    expect(
      validateCanvasInspectorNodeDraft({
        name: 'Orders Model',
        description: '',
        tags: [],
        dbt: {
          packageName: 'analytics',
          sourceName: 'raw',
          schemaName: 'raw',
          tableName: 'orders',
          materialized: 'view',
          selectedSourceId: 'source-orders',
          modelSql: null,
        },
      })
    ).toEqual({});
  });

  it('accepts one connected DBT model origin without duplicate selection metadata', () => {
    const source: CanonicalNode = {
      id: 'source-orders',
      name: 'Orders source',
      pluginId: 'dbt',
      kind: 'dbt:source',
      role: 'input',
      status: 'idle',
      tags: [],
    };
    const model: CanonicalNode = {
      id: 'model-orders',
      name: 'Orders model',
      pluginId: 'dbt',
      kind: 'dbt:model',
      role: 'transform',
      status: 'idle',
      tags: [],
    };
    const edges: readonly CanonicalEdge[] = [
      {
        id: 'source-orders-model-orders',
        sourceId: source.id,
        targetId: model.id,
        relation: 'lineage',
      },
    ];
    const draft = {
      ...createCanvasInspectorNodeDraft(model),
      dbt: {
        ...createCanvasInspectorNodeDraft(model).dbt!,
        selectedSourceId: '',
      },
    };
    const context = { node: model, nodes: [source, model], edges };

    expect(validateCanvasInspectorNodeDraft(draft, context)).toEqual({});
    expect(
      validateCanvasInspectorNodeDraft(
        { ...draft, dbt: { ...draft.dbt, selectedSourceId: 'detached-source' } },
        context
      )
    ).toEqual({ dbt: { selectedSourceId: 'dbt_source_required' } });
    expect(
      validateCanvasInspectorNodeDraft(
        { ...draft, dbt: { ...draft.dbt, selectedSourceId: source.id } },
        context
      )
    ).toEqual({});
  });

  it('rejects a blank DBT model origin when connected origins are ambiguous', () => {
    const firstSource: CanonicalNode = {
      id: 'source-orders',
      name: 'Orders source',
      pluginId: 'dbt',
      kind: 'dbt:source',
      role: 'input',
      status: 'idle',
      tags: [],
    };
    const secondSource: CanonicalNode = {
      ...firstSource,
      id: 'source-refunds',
      name: 'Refunds source',
    };
    const model: CanonicalNode = {
      id: 'model-orders',
      name: 'Orders model',
      pluginId: 'dbt',
      kind: 'dbt:model',
      role: 'transform',
      status: 'idle',
      tags: [],
    };
    const draft = createCanvasInspectorNodeDraft(model);
    const edges: readonly CanonicalEdge[] = [firstSource, secondSource].map((source) => ({
      id: `${source.id}-${model.id}`,
      sourceId: source.id,
      targetId: model.id,
      relation: 'lineage',
    }));

    expect(
      validateCanvasInspectorNodeDraft(draft, {
        node: model,
        nodes: [firstSource, secondSource, model],
        edges,
      })
    ).toEqual({ dbt: { selectedSourceId: 'dbt_source_required' } });
  });

  it('uses a dedicated DBT test draft without irrelevant source or model fields', () => {
    const node: CanonicalNode = {
      id: 'dbt-test-1',
      name: 'Orders key required',
      pluginId: 'dbt',
      kind: 'dbt:test',
      role: 'check',
      status: 'idle',
      tags: [],
      metadata: {
        dbtTest: {
          testType: 'not_null',
          targetModelId: 'dbt-model-1',
          targetColumn: 'order_id',
          severity: 'error',
        },
      },
    };

    const draft = createCanvasInspectorNodeDraft(node);

    expect(draft.dbt).toBeUndefined();
    expect(draft.dbtTest).toEqual({
      testType: 'not_null',
      targetModelId: 'dbt-model-1',
      targetColumn: 'order_id',
      severity: 'error',
    });
    expect(validateCanvasInspectorNodeDraft(draft)).toEqual({});
    expect(applyCanvasInspectorNodeDraft(node, draft)).toEqual(node);
  });

  it('binds a DBT test target and column to the connected model graph', () => {
    const firstModel: CanonicalNode = {
      id: 'dbt-model-orders',
      name: 'Orders',
      pluginId: 'dbt',
      kind: 'dbt:model',
      role: 'transform',
      status: 'idle',
      tags: [],
      metadata: { columns: [{ name: 'order_id', type: 'bigint' }] },
    };
    const secondModel: CanonicalNode = {
      ...firstModel,
      id: 'dbt-model-customers',
      name: 'Customers',
      metadata: { columns: [{ name: 'customer_id', type: 'bigint' }] },
    };
    const testNode: CanonicalNode = {
      id: 'dbt-test-key',
      name: 'Key required',
      pluginId: 'dbt',
      kind: 'dbt:test',
      role: 'check',
      status: 'idle',
      tags: [],
    };
    const edges: readonly CanonicalEdge[] = [firstModel, secondModel].map((model) => ({
      id: `${model.id}-${testNode.id}`,
      sourceId: model.id,
      targetId: testNode.id,
      relation: 'validation',
    }));
    const context = { node: testNode, nodes: [firstModel, secondModel, testNode], edges };
    const draft = {
      ...createCanvasInspectorNodeDraft(testNode),
      dbtTest: {
        testType: 'not_null',
        targetModelId: firstModel.id,
        targetColumn: 'order_id',
        severity: 'error',
      },
    };

    expect(validateCanvasInspectorNodeDraft(draft, context)).toEqual({});
    expect(
      validateCanvasInspectorNodeDraft(
        { ...draft, dbtTest: { ...draft.dbtTest, targetModelId: 'detached-model' } },
        context
      )
    ).toEqual({ dbtTest: { targetModelId: 'dbt_test_target_required' } });
    expect(
      validateCanvasInspectorNodeDraft(
        { ...draft, dbtTest: { ...draft.dbtTest, targetModelId: secondModel.id } },
        context
      )
    ).toEqual({ dbtTest: { targetColumn: 'dbt_test_column_not_declared' } });
  });

  it('projects a submitted draft through the same canonical rules as the authoring command', () => {
    const explicitEmptyDraft = {
      name: '  Orders Model  ',
      description: '  Governed model  ',
      tags: [' mart ', 'daily', 'mart'],
      dbt: {
        packageName: '  finance  ',
        sourceName: ' Raw Orders ',
        schemaName: '  curated  ',
        tableName: ' Order Lines ',
        materialized: 'view',
        selectedSourceId: '  source.orders  ',
        modelSql: '',
      },
    };
    const modelNode: CanonicalNode = {
      id: 'model.orders',
      name: 'Orders Model',
      pluginId: 'dbt',
      kind: 'dbt:model',
      role: 'transform',
      status: 'idle',
      tags: [],
    };

    expect(
      areCanvasInspectorNodeDraftsEqual(explicitEmptyDraft, {
        ...explicitEmptyDraft,
      })
    ).toBe(true);
    expect(canonicalizeCanvasInspectorNodeDraft(modelNode, explicitEmptyDraft)).toMatchObject({
      name: 'Orders Model',
      description: 'Governed model',
      tags: ['mart', 'daily'],
      dbt: {
        packageName: 'finance',
        sourceName: 'raw_orders',
        schemaName: 'curated',
        tableName: 'order_lines',
        selectedSourceId: 'source.orders',
        modelSql: null,
      },
    });
  });

  it('creates DVT source authoring metadata from existing node config', () => {
    expect(
      createCanvasInspectorNodeDraft(
        buildDvtNode('dvt:source', {
          config: {
            schema: 'analytics',
            table: 'orders',
            alias: 'raw_orders',
          },
        })
      )
    ).toEqual({
      name: 'Orders',
      description: '',
      tags: ['authoring'],
      dvt: {
        kind: 'source',
        schema: 'analytics',
        table: 'orders',
        alias: 'raw_orders',
      },
    });
  });

  it('creates DVT source authoring metadata from imported warehouse source metadata', () => {
    expect(createCanvasInspectorNodeDraft(buildImportedWarehouseSourceNode())).toEqual({
      name: 'src_warehouse_prod_analytics_erp_orders',
      description: 'Imported source for analytics.erp.orders',
      tags: ['source', 'erp'],
      dvt: {
        kind: 'source',
        schema: 'erp',
        table: 'orders',
        alias: 'warehouse_prod_analytics_erp',
      },
    });
  });

  it('applies imported warehouse source edits without changing its physical identity', () => {
    const node = buildImportedWarehouseSourceNode();
    const draft = {
      name: 'Warehouse Orders',
      description: 'Curated source',
      tags: ['source', 'finance'],
      dvt: {
        kind: 'source' as const,
        schema: 'warehouse_raw',
        table: 'orders_final',
        alias: 'orders_src',
      },
    };

    expect(applyCanvasInspectorNodeDraft(node, draft)).toEqual({
      ...node,
      name: 'Warehouse Orders',
      description: 'Curated source',
      tags: ['source', 'finance'],
      metadata: {
        ...node.metadata,
        config: {
          alias: 'orders_src',
        },
      },
    });
  });

  it('preserves historical DVT source database metadata when editing supported fields', () => {
    const node = buildDvtNode('dvt:source', {
      config: {
        owner: 'finance',
        database: 'analytics_prod',
        schema: 'raw',
        table: 'orders',
        alias: 'orders',
      },
    });
    const draft = {
      name: 'Orders source',
      description: '',
      tags: ['authoring'],
      dvt: {
        kind: 'source' as const,
        schema: 'raw',
        table: 'orders',
        alias: 'orders',
      },
    };

    expect(applyCanvasInspectorNodeDraft(node, draft)).toEqual({
      ...node,
      name: 'Orders source',
      description: undefined,
      tags: ['authoring'],
      metadata: {
        config: {
          owner: 'finance',
          database: 'analytics_prod',
          schema: 'raw',
          table: 'orders',
          alias: 'orders',
        },
      },
    });
  });

  it('applies DVT sink metadata into metadata.config without dropping existing config', () => {
    const node = buildDvtNode('dvt:sink', {
      config: {
        owner: 'finance',
      },
    });
    const draft = {
      name: 'orders_sink',
      description: '',
      tags: ['published'],
      dvt: {
        kind: 'sink' as const,
        schema: 'marts',
        table: 'fct_orders',
        materialization: 'table',
        writeMode: 'replace',
      },
    };

    expect(applyCanvasInspectorNodeDraft(node, draft)).toEqual({
      ...node,
      name: 'orders_sink',
      description: undefined,
      tags: ['published'],
      metadata: {
        config: {
          owner: 'finance',
          schema: 'marts',
          table: 'fct_orders',
          materialization: 'table',
          writeMode: 'replace',
        },
      },
    });
  });

  it('preserves historical DVT target metadata when editing supported fields', () => {
    const node = buildDvtNode('dvt:sink', {
      config: {
        owner: 'finance',
        database: 'analytics_prod',
        schema: 'marts',
        table: 'fct_orders',
        materialization: 'table',
        writeMode: 'replace',
        partitionStrategy: 'daily_by_order_date',
      },
    });
    const draft = {
      name: 'orders_sink',
      description: '',
      tags: ['published'],
      dvt: {
        kind: 'sink' as const,
        schema: 'marts',
        table: 'fct_orders',
        materialization: 'table',
        writeMode: 'replace',
      },
    };

    expect(applyCanvasInspectorNodeDraft(node, draft)).toEqual({
      ...node,
      name: 'orders_sink',
      description: undefined,
      tags: ['published'],
      metadata: {
        config: {
          owner: 'finance',
          database: 'analytics_prod',
          schema: 'marts',
          table: 'fct_orders',
          materialization: 'table',
          writeMode: 'replace',
          partitionStrategy: 'daily_by_order_date',
        },
      },
    });
  });

  it('clears stale compiled SQL when applying DVT SQL transform edits', () => {
    const node = buildDvtNode('dvt:sql_transform', {
      sql: 'select stale_column from old_orders',
      compiledSql: 'select stale_column from old_orders',
      config: {
        dialect: 'postgres',
        sql: 'select stale_column from old_orders',
      },
    });
    const draft = {
      name: 'Clean orders',
      description: '',
      tags: ['authoring'],
      dvt: {
        kind: 'sql_transform' as const,
        mode: 'sql' as const,
        sql: 'select order_id from raw.orders',
      },
    };

    expect(applyCanvasInspectorNodeDraft(node, draft)).toEqual({
      ...node,
      description: undefined,
      metadata: {
        config: {
          dialect: 'postgres',
          sql: 'select order_id from raw.orders',
        },
        sql: 'select order_id from raw.orders',
      },
    });
  });

  it('preserves historical DVT selected columns when editing SQL', () => {
    const node = buildDvtNode('dvt:sql_transform', {
      config: {
        dialect: 'postgres',
        sql: 'select * from raw.orders',
        selectedColumns: ['stale-source.legacy_id'],
      },
    });
    const draft = {
      name: 'Clean orders',
      description: '',
      tags: ['authoring'],
      dvt: {
        kind: 'sql_transform' as const,
        mode: 'sql' as const,
        sql: 'select order_id, customer from raw.orders',
      },
    };

    expect(applyCanvasInspectorNodeDraft(node, draft)).toEqual({
      ...node,
      description: undefined,
      metadata: {
        config: {
          dialect: 'postgres',
          sql: 'select order_id, customer from raw.orders',
          selectedColumns: ['stale-source.legacy_id'],
        },
        sql: 'select order_id, customer from raw.orders',
      },
    });
  });

  it('projects and applies the existing visual recipe through the inspector draft', () => {
    const recipe = {
      version: 'v1' as const,
      outputs: [
        {
          id: 'output:customer_name',
          name: 'customer_name',
          dataType: 'text',
          expression: {
            inputs: [{ nodeId: 'source_orders', columnName: 'customer' }],
            operations: [
              { kind: 'passthrough' as const },
              { kind: 'function' as const, functionId: 'trim' as const, args: [] },
            ],
          },
        },
      ],
      filters: [],
    };
    const node = buildDvtNode('dvt:sql_transform', {
      transformAuthoring: { version: 'v1', mode: 'visual', recipe },
    });

    const draft = createCanvasInspectorNodeDraft(node);

    expect(draft.dvt).toEqual({ kind: 'sql_transform', mode: 'visual', recipe });
    expect(applyCanvasInspectorNodeDraft(node, draft)).toEqual(node);
  });

  it('rejects an invalid visual recipe before the inspector can apply it', () => {
    const node = buildDvtNode('dvt:sql_transform', {
      transformAuthoring: {
        version: 'v1',
        mode: 'visual',
        recipe: {
          version: 'v1',
          outputs: [
            {
              id: 'output:id',
              name: 'id',
              expression: {
                inputs: [{ nodeId: 'source_orders', columnName: 'id' }],
                operations: [{ kind: 'passthrough' }],
              },
            },
          ],
          filters: [],
        },
      },
    });
    const draft = createCanvasInspectorNodeDraft(node);
    if (draft.dvt?.kind !== 'sql_transform' || draft.dvt.mode !== 'visual') {
      throw new Error('Expected a visual transform draft.');
    }

    expect(
      validateCanvasInspectorNodeDraft({
        ...draft,
        dvt: {
          ...draft.dvt,
          recipe: {
            ...draft.dvt.recipe,
            outputs: [{ ...draft.dvt.recipe.outputs[0]!, name: '   ' }],
          },
        },
      })
    ).toEqual({ dvt: { recipe: 'dvt_visual_recipe_invalid' } });
  });

  it('routes object-file load drafts through their plugin-owned authoring model', () => {
    const node: CanonicalNode = {
      id: 'load-orders',
      name: 'Load orders',
      pluginId: 'dvt.object-file-postgres',
      kind: 'dvt:object_file_load',
      role: 'input',
      status: 'idle',
      tags: ['authoring'],
    };
    const draft = createCanvasInspectorNodeDraft(node);

    expect(draft.objectFilePostgres).toEqual(
      expect.objectContaining({
        format: 'csv',
        columns: [expect.objectContaining({ dataType: 'text' })],
      })
    );
    expect(validateCanvasInspectorNodeDraft(draft)).toEqual({
      objectFilePostgres: expect.objectContaining({
        storageUri: 'object_file_storage_uri_invalid',
      }),
    });
  });
});
