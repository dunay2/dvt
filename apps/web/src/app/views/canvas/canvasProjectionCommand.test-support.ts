import {
  createDvtSubstraitProjectionDraft,
  type DvtSubstraitProjectionDraft,
} from './canvasDvtSubstraitProjection';
import {
  createDvtSubstraitProjectionOutput,
  type DvtSubstraitCreateOutputRequest,
} from './canvasDvtSubstraitCalculatedColumn';

export function connectedOrdersProjectionDraft(): DvtSubstraitProjectionDraft {
  return createDvtSubstraitProjectionDraft({
    source: {
      nodeId: 'source-orders',
      schema: 'raw',
      table: 'orders',
      sourceRef: {
        schemaVersion: 'connected-source-ref.v1',
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          connectionId: 'warehouse-main',
          provider: 'postgres',
        },
        sourceObjectId: 'raw.orders',
      },
      fields: [
        { name: 'order_id', dataType: 'integer' },
        { name: 'customer', dataType: 'text' },
        { name: 'amount', dataType: 'numeric' },
      ],
    },
    targetNodeId: 'transform-orders',
    outputs: [
      { fieldId: 'output:order_id', name: 'order_id', sourceFieldName: 'order_id' },
      { fieldId: 'output:customer', name: 'buyer', sourceFieldName: 'customer' },
      { fieldId: 'output:amount', name: 'amount', sourceFieldName: 'amount' },
    ],
  });
}

export function connectedEventsProjectionDraft(): DvtSubstraitProjectionDraft {
  return createDvtSubstraitProjectionDraft({
    source: {
      nodeId: 'source-events',
      schema: 'dvt',
      table: 'auth_audit_events',
      sourceRef: {
        schemaVersion: 'connected-source-ref.v1',
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          connectionId: 'warehouse-main',
          provider: 'postgres',
        },
        sourceObjectId: 'dvt.auth_audit_events',
      },
      fields: [{ name: 'occurred_at', dataType: 'timestamp with time zone' }],
    },
    targetNodeId: 'transform-events',
    outputs: [
      { fieldId: 'output:occurred_at', name: 'occurred_at', sourceFieldName: 'occurred_at' },
    ],
  });
}

export function connectedNamesProjectionDraft(): DvtSubstraitProjectionDraft {
  return createDvtSubstraitProjectionDraft({
    source: {
      nodeId: 'source-people',
      schema: 'raw',
      table: 'people',
      sourceRef: {
        schemaVersion: 'connected-source-ref.v1',
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          connectionId: 'warehouse-main',
          provider: 'postgres',
        },
        sourceObjectId: 'raw.people',
      },
      fields: [
        { name: 'first_name', dataType: 'text' },
        { name: 'last_name', dataType: 'text' },
      ],
    },
    targetNodeId: 'transform-people',
    outputs: [
      { fieldId: 'output:first_name', name: 'first_name', sourceFieldName: 'first_name' },
      { fieldId: 'output:last_name', name: 'last_name', sourceFieldName: 'last_name' },
    ],
  });
}

export function connectedFallbackNamesProjectionDraft(): DvtSubstraitProjectionDraft {
  return createDvtSubstraitProjectionDraft({
    source: {
      nodeId: 'source-fallback-names',
      schema: 'raw',
      table: 'fallback_names',
      sourceRef: {
        schemaVersion: 'connected-source-ref.v1',
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          connectionId: 'warehouse-main',
          provider: 'postgres',
        },
        sourceObjectId: 'raw.fallback_names',
      },
      fields: [
        { name: 'primary_name', dataType: 'text' },
        { name: 'fallback_name', dataType: 'text' },
        { name: 'last_resort_name', dataType: 'text' },
      ],
    },
    targetNodeId: 'transform-fallback-names',
    outputs: [
      { fieldId: 'output:primary_name', name: 'primary_name', sourceFieldName: 'primary_name' },
      {
        fieldId: 'output:fallback_name',
        name: 'fallback_name',
        sourceFieldName: 'fallback_name',
      },
      {
        fieldId: 'output:last_resort_name',
        name: 'last_resort_name',
        sourceFieldName: 'last_resort_name',
      },
    ],
  });
}

export function createProjectionOutput(
  draft: DvtSubstraitProjectionDraft,
  request: DvtSubstraitCreateOutputRequest,
  context?: Readonly<{ inputDataTypes: readonly string[]; provider: string }>
): DvtSubstraitProjectionDraft {
  const result = createDvtSubstraitProjectionOutput(draft, request, context);
  if (result.outcome !== 'applied') throw new Error('Expected output creation to be admitted.');
  return result.draft;
}
