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

function typedCanonicalDraft(): DvtSubstraitProjectionDraft {
  const draft = canonicalDraft();
  const root = draft.plan.relations[0]?.relType;
  const project = root?.case === 'root' ? root.value.input?.relType : undefined;
  const read = project?.case === 'project' ? project.value.input?.relType : undefined;
  if (read?.case !== 'read' || read.value.baseSchema?.struct == null) {
    throw new Error('Expected canonical ReadRel schema.');
  }
  read.value.baseSchema.struct.types = read.value.baseSchema.struct.types.map(() => ({
    kind: {
      case: 'string',
      value: { typeVariationReference: 0, nullability: 1 },
    },
  }));
  return draft;
}

function unaryFunctionProjectionDraft(): DvtSubstraitProjectionDraft {
  const draft = typedCanonicalDraft();
  const root = draft.plan.relations[0]?.relType;
  const project = root?.case === 'root' ? root.value.input?.relType : undefined;
  if (root?.case !== 'root' || project?.case !== 'project') {
    throw new Error('Expected canonical ProjectRel.');
  }

  const field = {
    rexType: {
      case: 'selection' as const,
      value: {
        rootType: { case: 'rootReference' as const, value: {} },
        referenceType: {
          case: 'directReference' as const,
          value: {
            referenceType: {
              case: 'structField' as const,
              value: { field: 1 },
            },
          },
        },
      },
    },
  };
  const nullableString = {
    kind: {
      case: 'string' as const,
      value: { typeVariationReference: 0, nullability: 1 },
    },
  };
  const scalar = (functionReference: number, argument: object) => ({
    rexType: {
      case: 'scalarFunction' as const,
      value: {
        functionReference,
        arguments: [{ argType: { case: 'value' as const, value: argument } }],
        options: [],
        outputType: nullableString,
      },
    },
  });
  const trimmed = scalar(1, field);
  const retrimmed = scalar(1, trimmed);
  const upperRetrimmed = scalar(2, retrimmed);

  draft.plan.extensionUrns = [
    { extensionUrnAnchor: 1, urn: 'extension:io.substrait:functions_string' },
  ];
  draft.plan.extensions = [
    {
      mappingType: {
        case: 'extensionFunction',
        value: { extensionUrnReference: 1, functionAnchor: 1, name: 'trim:str' },
      },
    },
    {
      mappingType: {
        case: 'extensionFunction',
        value: { extensionUrnReference: 1, functionAnchor: 2, name: 'upper:str' },
      },
    },
  ];
  project.value.expressions = [trimmed, upperRetrimmed];
  project.value.common!.emitKind = {
    case: 'emit',
    value: { outputMapping: [0, 2, 3] },
  };
  root.value.names = ['order_id', 'customer_trimmed', 'customer_upper'];

  const targetRelation = draft.sidecar.relations.find((relation) => relation.relAnchor === 2)!;
  draft.sidecar.fields = [
    ...draft.sidecar.fields.filter(
      (candidate) => candidate.relationId !== targetRelation.relationId
    ),
    {
      fieldId: 'output:order_id',
      relationId: targetRelation.relationId,
      sourceFieldId: 'field:source-orders:order_id',
      outputOrdinal: 0,
      displayName: 'order_id',
    },
    {
      fieldId: 'output:customer-trimmed',
      relationId: targetRelation.relationId,
      outputOrdinal: 1,
      displayName: 'customer_trimmed',
    },
    {
      fieldId: 'output:customer-upper',
      relationId: targetRelation.relationId,
      outputOrdinal: 2,
      displayName: 'customer_upper',
    },
  ];
  return draft;
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

  it('preserves typed source fields in projected outputs', () => {
    const inspection = inspectDvtConnectedFieldProjection(typedCanonicalDraft(), NODE_BINDING);

    expect(inspection).toMatchObject({
      ok: true,
      projection: {
        outputs: [
          { name: 'order_id', dataType: 'string' },
          { name: 'customer_name', dataType: 'string' },
        ],
      },
    });
  });

  it('projects aliases with an arbitrary unary function chain from Substrait semantics', async () => {
    const projected = await projectDvtConnectedFieldDraftToPostgresSql(
      unaryFunctionProjectionDraft(),
      NODE_BINDING
    );

    expect(projected.projection.outputs).toMatchObject([
      { name: 'order_id', sourceFieldName: 'order_id' },
      { name: 'customer_trimmed', sourceFieldName: 'customer', operations: ['trim'] },
      {
        name: 'customer_upper',
        sourceFieldName: 'customer',
        operations: ['trim', 'trim', 'upper'],
      },
    ]);
    expect(projected.sql.replaceAll(/\s+/g, ' ').trim().toLowerCase()).toMatch(
      /^select order_id, trim\(customer\) as customer_trimmed, upper\(trim\(trim\(customer\)\)\) as customer_upper from raw\.orders;?$/
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
