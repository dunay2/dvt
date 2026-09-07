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
import {
  applyDvtSubstraitSemanticDocument,
  readDvtTransformAuthoringAuthority,
} from './canvasDvtTransformAuthoringAuthority';
import {
  applyDvtSubstraitFilter,
  encodeDvtSubstraitFilterDocument,
  inspectDvtSubstraitFilter,
  resolveDvtSubstraitFilterCapabilities,
} from './canvasDvtSubstraitFilter';
import {
  createDvtSubstraitProjectionDraft,
  decodeDvtSubstraitProjectionDocument,
  encodeDvtSubstraitProjectionDocument,
  inspectDvtSubstraitProjectionDraft,
  resolveDvtSubstraitProjectionSource,
} from './canvasDvtSubstraitProjection';

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
  kind: 'dvt:source' | 'dvt:transform' | 'dvt:sink',
  metadata?: Record<string, unknown>
): CanonicalNode {
  return {
    id: `node_${kind.replace('dvt:', '')}`,
    name: kind === 'dvt:transform' ? 'Clean orders' : 'Orders',
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
  it('keeps repeated inspection of a connected physical Source clean without allocating semantics', () => {
    const node = buildImportedWarehouseSourceNode({
      connectedSourceRef: {
        schemaVersion: 'connected-source-ref.v1',
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          connectionId: 'warehouse-main',
          provider: 'postgres',
        },
        sourceObjectId: 'erp.orders',
      },
    });
    const first = createCanvasInspectorNodeDraft(node);
    const second = createCanvasInspectorNodeDraft(node);
    expect(first).toEqual(second);
    expect(hasCanvasInspectorNodeDraftChanges(node, first)).toBe(false);
    expect(hasCanvasInspectorNodeDraftChanges(node, second)).toBe(false);
    expect(readDvtTransformAuthoringAuthority(node)).toBeNull();
  });
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

  it('accepts DBT model metadata without a writable SQL field', () => {
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
          projectionColumns: null,
        },
      })
    ).toEqual({});
  });

  it('accepts one connected DBT model origin without duplicate selection metadata', () => {
    const source: CanonicalNode = {
      id: 'source-orders',
      name: 'Orders source',
      pluginId: 'dvt',
      kind: 'dvt:source',
      role: 'input',
      status: 'idle',
      tags: [],
      metadata: { dbt: { packageName: 'analytics', sourceName: 'raw' } },
    };
    const model: CanonicalNode = {
      id: 'model-orders',
      name: 'Orders model',
      pluginId: 'dvt',
      kind: 'dvt:transform',
      role: 'transform',
      status: 'idle',
      tags: [],
      metadata: { dbt: { packageName: 'analytics', materialized: 'view' } },
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
      pluginId: 'dvt',
      kind: 'dvt:source',
      role: 'input',
      status: 'idle',
      tags: [],
      metadata: { dbt: { packageName: 'analytics', sourceName: 'raw' } },
    };
    const secondSource: CanonicalNode = {
      ...firstSource,
      id: 'source-refunds',
      name: 'Refunds source',
    };
    const model: CanonicalNode = {
      id: 'model-orders',
      name: 'Orders model',
      pluginId: 'dvt',
      kind: 'dvt:transform',
      role: 'transform',
      status: 'idle',
      tags: [],
      metadata: { dbt: { packageName: 'analytics', materialized: 'view' } },
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
      pluginId: 'dvt',
      kind: 'dvt:transform',
      role: 'transform',
      status: 'idle',
      tags: [],
      metadata: {
        dbt: { packageName: 'analytics', materialized: 'view' },
        columns: [{ name: 'order_id', type: 'bigint' }],
      },
    };
    const secondModel: CanonicalNode = {
      ...firstModel,
      id: 'dbt-model-customers',
      name: 'Customers',
      metadata: {
        dbt: { packageName: 'analytics', materialized: 'view' },
        columns: [{ name: 'customer_id', type: 'bigint' }],
      },
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

  it('accepts a DBT test column projected through its connected generated model', () => {
    const sourceNode: CanonicalNode = {
      id: 'dbt-source-orders',
      name: 'Raw orders',
      pluginId: 'dvt',
      kind: 'dvt:source',
      role: 'input',
      status: 'idle',
      tags: [],
      metadata: {
        dbt: { packageName: 'analytics', sourceName: 'raw' },
        columns: [{ name: 'order_id', type: 'bigint' }],
      },
    };
    const modelNode: CanonicalNode = {
      id: 'dbt-model-orders',
      name: 'Orders',
      pluginId: 'dvt',
      kind: 'dvt:transform',
      role: 'transform',
      status: 'idle',
      tags: [],
      metadata: { dbt: { packageName: 'analytics', materialized: 'view' } },
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
    const edges: readonly CanonicalEdge[] = [
      {
        id: 'source-model',
        sourceId: sourceNode.id,
        targetId: modelNode.id,
        relation: 'lineage',
      },
      {
        id: 'model-test',
        sourceId: modelNode.id,
        targetId: testNode.id,
        relation: 'validation',
      },
    ];
    const draft = {
      ...createCanvasInspectorNodeDraft(testNode),
      dbtTest: {
        testType: 'not_null',
        targetModelId: modelNode.id,
        targetColumn: 'order_id',
        severity: 'error',
      },
    };

    expect(
      validateCanvasInspectorNodeDraft(draft, {
        node: testNode,
        nodes: [sourceNode, modelNode, testNode],
        edges,
      })
    ).toEqual({});
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
        projectionColumns: null,
      },
    };
    const modelNode: CanonicalNode = {
      id: 'model.orders',
      name: 'Orders Model',
      pluginId: 'dvt',
      kind: 'dvt:transform',
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

  it('roundtrips a connected-field Substrait projection through the inspector draft', () => {
    const source: CanonicalNode = {
      id: 'source_orders',
      name: 'Orders',
      pluginId: 'dvt',
      kind: 'dvt:source',
      role: 'input',
      status: 'idle',
      tags: [],
      metadata: {
        schema: 'raw',
        tableName: 'orders',
        connectedSourceRef: {
          schemaVersion: 'connected-source-ref.v1',
          connectionRef: {
            schemaVersion: 'connection-ref.v1',
            connectionId: 'warehouse-main',
            provider: 'postgres',
          },
          sourceObjectId: 'raw.orders',
        },
        columns: [{ name: 'order_id', type: 'integer' }],
      },
    };
    const projectionSource = resolveDvtSubstraitProjectionSource(source);
    if (projectionSource == null) throw new Error('Expected a connected source fixture.');
    const node = applyDvtSubstraitSemanticDocument(
      buildDvtNode('dvt:transform'),
      encodeDvtSubstraitProjectionDocument(
        createDvtSubstraitProjectionDraft({
          source: projectionSource,
          targetNodeId: 'node_transform',
          outputs: [{ fieldId: 'output:order_id', name: 'order_id', sourceFieldName: 'order_id' }],
        })
      )
    );

    const draft = createCanvasInspectorNodeDraft(node);

    expect(draft.dvt).toMatchObject({ kind: 'transform', mode: 'substrait', shape: 'projection' });
    expect(applyCanvasInspectorNodeDraft(node, draft)).toEqual(node);
  });

  it('rejects persisted legacy Source filter authority without changing physical identity', () => {
    const source = buildImportedWarehouseSourceNode({
      connectedSourceRef: {
        schemaVersion: 'connected-source-ref.v1',
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          connectionId: 'warehouse-main',
          provider: 'postgres',
        },
        sourceObjectId: 'erp.orders',
      },
      columns: [{ name: 'customer', type: 'text', nullable: false }],
    });
    const projectionSource = resolveDvtSubstraitProjectionSource(source);
    const capability = resolveDvtSubstraitFilterCapabilities({
      dataType: 'text',
      provider: 'postgres',
    })[0];
    if (projectionSource == null || capability == null) {
      throw new Error('Expected an admitted legacy Source fixture.');
    }
    const base = createDvtSubstraitProjectionDraft({
      source: projectionSource,
      targetNodeId: source.id,
      outputs: [
        { fieldId: 'legacy-output:customer', name: 'customer', sourceFieldName: 'customer' },
      ],
    });
    const filtered = applyDvtSubstraitFilter(base, {
      fieldId: 'legacy-output:customer',
      dataType: 'text',
      capabilityId: capability.capabilityId,
      value: 'Ada',
    });
    const legacySource = applyDvtSubstraitSemanticDocument(
      source,
      encodeDvtSubstraitFilterDocument(filtered)
    );

    expect(() => createCanvasInspectorNodeDraft(legacySource)).toThrow(
      'DVT Source semantic authority is not an admitted projection shape.'
    );
    expect(legacySource.metadata?.connectedSourceRef).toEqual(source.metadata?.connectedSourceRef);
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
