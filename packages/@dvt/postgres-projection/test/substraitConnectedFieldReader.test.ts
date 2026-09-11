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

function opaqueIdentityDraft(): DvtSubstraitProjectionDraft {
  const draft = canonicalDraft();
  const sourceRelationId = 'dvt_rel_opaque_source';
  const targetRelationId = 'dvt_rel_opaque_target';
  const sourceFieldIds = ['dvt_fld_opaque_order_id', 'dvt_fld_opaque_customer'];

  return {
    ...draft,
    sidecar: {
      ...draft.sidecar,
      relations: draft.sidecar.relations.map((relation) =>
        relation.relAnchor === 1
          ? { ...relation, relationId: sourceRelationId, displayName: 'shared-name' }
          : { ...relation, relationId: targetRelationId, displayName: 'shared-name' }
      ),
      fields: draft.sidecar.fields.map((field) => {
        if (field.relationId === 'relation:source-orders') {
          return {
            ...field,
            relationId: sourceRelationId,
            fieldId: sourceFieldIds[field.outputOrdinal]!,
          };
        }
        return {
          ...field,
          relationId: targetRelationId,
          sourceFieldId: sourceFieldIds[field.outputOrdinal],
        };
      }),
    },
  };
}

const NODE_BINDING = {
  sourceNodeId: 'source-orders',
  targetNodeId: 'transform-orders',
} as const;

describe('connected-field Substrait reader', () => {
  it('derives PostgreSQL SQL from the canonical semantic projection', async () => {
    const { sql } = await projectDvtConnectedFieldDraftToPostgresSql(
      canonicalDraft(),
      NODE_BINDING
    );
    expect(sql.replaceAll(/\s+/g, ' ').trim().toLowerCase()).toMatch(
      /^select order_id, customer as customer_name from raw\.orders;?$/
    );
  });

  it('projects opaque semantic identities from the protected node binding', async () => {
    const inspection = inspectDvtConnectedFieldProjection(opaqueIdentityDraft(), NODE_BINDING);
    expect(inspection).toMatchObject({
      ok: true,
      projection: {
        targetNodeId: 'transform-orders',
        source: { nodeId: 'source-orders' },
      },
    });
    await expect(
      projectDvtConnectedFieldDraftToPostgresSql(opaqueIdentityDraft(), NODE_BINDING)
    ).resolves.toMatchObject({
      sql: expect.stringMatching(/from raw\.orders/i),
    });
  });

  it.each([
    { sourceNodeId: 'node-a', targetNodeId: 'node-a' },
    { sourceNodeId: ' source-orders', targetNodeId: 'transform-orders' },
  ])('rejects an ambiguous protected node binding %#', (binding) => {
    expect(inspectDvtConnectedFieldProjection(opaqueIdentityDraft(), binding)).toEqual({
      ok: false,
    });
  });

  it('rejects a semantic projection without a governed PostgreSQL source', () => {
    expect(inspectDvtConnectedFieldProjection(canonicalDraft('snowflake'), NODE_BINDING)).toEqual({
      ok: false,
    });
  });
});
