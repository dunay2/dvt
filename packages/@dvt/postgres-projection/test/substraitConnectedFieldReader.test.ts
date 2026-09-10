import { describe, expect, it } from 'vitest';

import {
  inspectDvtConnectedFieldProjection,
  projectDvtConnectedFieldDraftToPostgresSql,
  type DvtSubstraitProjectionDraft,
} from '../src/index.js';

function canonicalDraft(provider = 'postgres'): DvtSubstraitProjectionDraft {
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
          outputOrdinal: 0,
          displayName: 'order_id',
        },
        {
          fieldId: 'output:customer',
          relationId: 'relation:transform-orders:project',
          outputOrdinal: 1,
          displayName: 'customer_name',
        },
      ],
    },
  } as DvtSubstraitProjectionDraft;
}

describe('connected-field Substrait reader', () => {
  it('derives PostgreSQL SQL from the canonical semantic projection', async () => {
    const { sql } = await projectDvtConnectedFieldDraftToPostgresSql(canonicalDraft());
    expect(sql.replaceAll(/\s+/g, ' ').trim().toLowerCase()).toMatch(
      /^select order_id, customer as customer_name from raw\.orders;?$/
    );
  });

  it('rejects a semantic projection without a governed PostgreSQL source', () => {
    expect(inspectDvtConnectedFieldProjection(canonicalDraft('snowflake'))).toEqual({ ok: false });
  });
});
