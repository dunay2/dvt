import type { DvtSubstraitProjectionDraft } from '../../src/index.js';

export function canonicalDraft(provider = 'postgres'): DvtSubstraitProjectionDraft {
  return {
    plan: {
      version: { majorNumber: 0, minorNumber: 101, patchNumber: 0 },
      relations: [
        {
          relType: {
            case: 'root',
            value: {
              names: ['order_id', 'customer_name'],
              input: {
                relType: {
                  case: 'project',
                  value: {
                    common: {
                      relAnchor: 2,
                      emitKind: { case: 'emit', value: { outputMapping: [0, 1] } },
                    },
                    input: {
                      relType: {
                        case: 'read',
                        value: {
                          common: { relAnchor: 1, emitKind: { case: undefined } },
                          baseSchema: {
                            names: ['order_id', 'customer'],
                            struct: {
                              types: [
                                { kind: { case: 'unbound', value: {} } },
                                { kind: { case: 'unbound', value: {} } },
                              ],
                              nullability: 2,
                            },
                          },
                          readType: {
                            case: 'namedTable',
                            value: { names: ['raw', 'orders'] },
                          },
                        },
                      },
                    },
                    expressions: [],
                  },
                },
              },
            },
          },
        },
      ],
      extensions: [],
      extensionUrns: [],
    },
    sidecar: {
      schemaVersion: 'dvt-substrait-authoring-sidecar.v1',
      semanticPlanSha256: 'a'.repeat(64),
      relations: [
        {
          relationId: 'relation:source-orders',
          relAnchor: 1,
          sourceRef: {
            schemaVersion: 'connected-source-ref.v1',
            connectionRef: {
              schemaVersion: 'connection-ref.v1',
              connectionId: 'warehouse-main',
              provider,
            },
            sourceObjectId: 'raw.orders',
          },
        },
        { relationId: 'relation:transform-orders:project', relAnchor: 2 },
      ],
      fields: [
        {
          fieldId: 'field:source-orders:order_id',
          relationId: 'relation:source-orders',
          outputOrdinal: 0,
          displayName: 'order_id',
        },
        {
          fieldId: 'field:source-orders:customer',
          relationId: 'relation:source-orders',
          outputOrdinal: 1,
          displayName: 'customer',
        },
        {
          fieldId: 'output:order_id',
          relationId: 'relation:transform-orders:project',
          sourceFieldId: 'field:source-orders:order_id',
          outputOrdinal: 0,
          displayName: 'order_id',
        },
        {
          fieldId: 'output:customer',
          relationId: 'relation:transform-orders:project',
          sourceFieldId: 'field:source-orders:customer',
          outputOrdinal: 1,
          displayName: 'customer_name',
        },
      ],
    },
  } as DvtSubstraitProjectionDraft;
}
