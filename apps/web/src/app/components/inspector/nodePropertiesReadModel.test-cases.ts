/** Owned concern: provide declarative Inspector metadata and lineage scenario fixtures. */
import type { CanonicalNode } from '../../types/canonical';
import type { buildNodePropertiesReadModel } from './nodePropertiesReadModel';

export function buildDbtMetadataProjectionFixture(): CanonicalNode {
  return {
    id: 'model-orders',
    name: 'fct_orders',
    pluginId: 'dvt',
    kind: 'dvt:transform',
    role: 'transform',
    status: 'idle',
    tags: ['mart'],
    metadata: {
      database: 'analytics',
      schema: 'mart',
      tableName: 'fct_orders',
      columns: {
        order_id: {
          data_type: 'integer',
          description: 'Primary order key',
          tests: [
            {
              not_null: {
                severity: 'error',
                selectedForExecution: true,
                lastRunStatus: 'passed',
                lastRunDurationMs: 1234,
              },
            },
            {
              unique: {
                severity: 'error',
                selectedForExecution: false,
                lastRunStatus: 'failed',
              },
            },
          ],
        },
        status: {
          data_type: 'text',
          description: 'Lifecycle status',
          tests: [{ accepted_values: { values: ['created', 'paid'], severity: 'warn' } }],
        },
        customer_id: {
          data_type: 'integer',
          description: 'Customer foreign key',
          tests: [
            {
              relationships: {
                arguments: {
                  to: "ref('dim_customers')",
                  field: 'customer_id',
                },
                severity: 'error',
              },
            },
          ],
        },
      },
    },
  };
}

export function buildTransformLineageProjectionFixture(): CanonicalNode {
  return {
    id: 'transform-partial-lineage',
    name: 'Partially sourced Transform',
    pluginId: 'dvt',
    kind: 'dvt:transform',
    role: 'transform',
    status: 'idle',
    tags: [],
    metadata: {
      columns: [
        {
          name: 'order_id',
          type: 'integer',
          primaryKey: true,
          comment: 'Sourced order key',
        },
        {
          name: 'constant_label',
          type: 'text',
          defaultValue: "'unknown'",
          comment: 'Declared constant',
        },
      ],
    },
  };
}

export function buildTransformLineagePresentationTruth(): Parameters<
  typeof buildNodePropertiesReadModel
>[0]['presentationTruth'] {
  return {
    columns: {
      declared: [
        {
          name: 'order_id',
          type: 'integer',
          provenance: 'declared',
          sourceNodeId: 'source-orders',
          sourceNodeName: 'Orders source',
          sourceReference: 'source-orders.order_id',
          reference: 'output:order_id',
        },
        {
          name: 'constant_label',
          type: 'text',
          provenance: 'declared',
          reference: 'output:constant_label',
        },
      ],
      inherited: [],
      visible: [
        {
          name: 'order_id',
          type: 'integer',
          provenance: 'declared',
          sourceNodeId: 'source-orders',
          sourceNodeName: 'Orders source',
          sourceReference: 'source-orders.order_id',
          reference: 'output:order_id',
        },
        {
          name: 'constant_label',
          type: 'text',
          provenance: 'declared',
          reference: 'output:constant_label',
        },
      ],
      declaredCount: 2,
      inheritedCount: 0,
      visibleCount: 2,
      visibleProvenance: 'declared',
    },
    code: { kind: 'unavailable' },
  };
}
