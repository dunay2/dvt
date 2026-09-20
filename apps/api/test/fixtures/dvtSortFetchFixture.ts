/** Canonical SortRel/FetchRel document over the real SetRel product fixture. */
import { SortField_SortDirection } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import {
  ProjectRelSchema,
  ReadRelSchema,
  ReadRel_NamedTableSchema,
  RelCommonSchema,
  RelCommon_EmitSchema,
  RelRootSchema,
  RelSchema,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import {
  PlanRelSchema,
  PlanSchema,
} from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import {
  NamedStructSchema,
  TypeSchema,
  Type_I64Schema,
  Type_Nullability,
  Type_StringSchema,
  Type_StructSchema,
} from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { create } from '@bufbuild/protobuf';
import {
  DVT_SUBSTRAIT_AUTHORING_SIDECAR_SCHEMA_VERSION,
  DVT_SUBSTRAIT_PROFILE_REF_V1,
  DVT_SUBSTRAIT_SEMANTIC_DOCUMENT_SCHEMA_VERSION,
  DvtSubstraitSemanticDocumentV1Schema,
  decodeDvtSubstraitPlanV1,
  encodeDvtSubstraitPlanV1,
  type WorkspaceGraphAuthoringDraft,
} from '@dvt/contracts';
import {
  createDvtSubstraitFetchDraft,
  createDvtSubstraitSortDraft,
} from '@dvt/postgres-projection';

import { buildDvtSetPreviewDraft } from './dvtSetPreviewFixture.js';

export function buildDvtSortFetchPreviewDraft(run = false): Readonly<{
  draft: WorkspaceGraphAuthoringDraft;
  sortRelationId: string;
  fetchRelationId: string;
}> {
  const base = buildDvtSetPreviewDraft();
  const transform = base.nodes.find((node) => node.id === 'transform-customers')!;
  const authority = transform.metadata?.['transformAuthoring'] as {
    semanticDocument: unknown;
  };
  const document = DvtSubstraitSemanticDocumentV1Schema.parse(authority.semanticDocument);
  const semanticDraft = {
    plan: decodeDvtSubstraitPlanV1(document),
    sidecar: document.sidecar,
  };
  const root = semanticDraft.plan.relations[0]?.relType;
  if (root?.case !== 'root' || root.value.input == null) throw new Error('Missing Set root.');
  const rootValue = root.value.input.relType.value as
    Readonly<{ common?: Readonly<{ relAnchor?: number }> }> | undefined;
  const rootBinding = semanticDraft.sidecar.relations.find(
    (relation) => relation.relAnchor === rootValue?.common?.relAnchor
  );
  if (rootBinding == null) throw new Error('Missing Set binding.');
  const fields = semanticDraft.sidecar.fields
    .filter((field) => field.relationId === rootBinding.relationId)
    .sort((left, right) => left.outputOrdinal - right.outputOrdinal);
  const sortRelationId = 'relation:sort-customers';
  const sorted = createDvtSubstraitSortDraft(semanticDraft, {
    relationId: sortRelationId,
    outputFieldIds: fields.map((_, index) => `field:sort:${index}`),
    keys: [
      {
        fieldId: fields[0]!.fieldId,
        direction: SortField_SortDirection.DESC_NULLS_LAST,
      },
    ],
  });
  const fetchRelationId = 'relation:fetch-customers';
  const fetched = createDvtSubstraitFetchDraft(sorted, {
    relationId: fetchRelationId,
    outputFieldIds: fields.map((_, index) => `field:fetch:${index}`),
    offset: 2n,
    count: 3n,
  });
  const semanticPlan = encodeDvtSubstraitPlanV1(fetched.plan);
  const semanticDocument = DvtSubstraitSemanticDocumentV1Schema.parse({
    ...document,
    semanticPlan,
    sidecar: { ...fetched.sidecar, semanticPlanSha256: semanticPlan.sha256 },
  });
  const nodes = base.nodes.map((node) =>
    node.id !== transform.id
      ? node
      : {
          ...node,
          metadata: {
            ...node.metadata,
            transformAuthoring: { version: 'v1', mode: 'substrait', semanticDocument },
            ...(run
              ? {
                  config: {
                    materialized: 'table',
                    resultTarget: {
                      schemaVersion: 'dvt-transform-result-target.v1',
                      connectionRef: {
                        schemaVersion: 'connection-ref.v1',
                        provider: 'postgres',
                        connectionId: 'warehouse-main',
                      },
                      schema: 'analytics',
                      relation: 'ordered_customers',
                    },
                  },
                }
              : {}),
          },
        }
  );
  return { draft: { ...base, nodes }, sortRelationId, fetchRelationId };
}

export function buildDvtSortFetchRowsDraft(): WorkspaceGraphAuthoringDraft {
  const connectionRef = {
    schemaVersion: 'connection-ref.v1',
    connectionId: 'local-postgres-proof',
    provider: 'postgres',
  } as const;
  const sourceRef = {
    schemaVersion: 'connected-source-ref.v1',
    connectionRef,
    sourceObjectId: 'raw.sort_fetch_rows',
  } as const;
  const names = ['id', 'amount', 'grp'];
  const read = create(RelSchema, {
    relType: {
      case: 'read',
      value: create(ReadRelSchema, {
        common: create(RelCommonSchema, { relAnchor: 1 }),
        baseSchema: create(NamedStructSchema, {
          names,
          struct: create(Type_StructSchema, {
            nullability: Type_Nullability.REQUIRED,
            types: [
              create(TypeSchema, {
                kind: {
                  case: 'i64',
                  value: create(Type_I64Schema, { nullability: Type_Nullability.NULLABLE }),
                },
              }),
              create(TypeSchema, {
                kind: {
                  case: 'i64',
                  value: create(Type_I64Schema, { nullability: Type_Nullability.NULLABLE }),
                },
              }),
              create(TypeSchema, {
                kind: {
                  case: 'string',
                  value: create(Type_StringSchema, { nullability: Type_Nullability.NULLABLE }),
                },
              }),
            ],
          }),
        }),
        readType: {
          case: 'namedTable',
          value: create(ReadRel_NamedTableSchema, { names: ['raw', 'sort_fetch_rows'] }),
        },
      }),
    },
  });
  const project = create(RelSchema, {
    relType: {
      case: 'project',
      value: create(ProjectRelSchema, {
        common: create(RelCommonSchema, {
          relAnchor: 2,
          emitKind: {
            case: 'emit',
            value: create(RelCommon_EmitSchema, { outputMapping: [0, 1, 2] }),
          },
        }),
        input: read,
      }),
    },
  });
  const plan = create(PlanSchema, {
    version: {
      majorNumber: 0,
      minorNumber: 101,
      patchNumber: 0,
      producer: 'dvt-sort-fetch-proof',
    },
    relations: [
      create(PlanRelSchema, {
        relType: {
          case: 'root',
          value: create(RelRootSchema, { input: project, names }),
        },
      }),
    ],
  });
  const initialPlan = encodeDvtSubstraitPlanV1(plan);
  const sourceRelationId = 'relation:sort-fetch-source';
  const projectRelationId = 'relation:sort-fetch-project';
  const sourceFields = names.map((name, outputOrdinal) => ({
    fieldId: `field:source:${name}`,
    relationId: sourceRelationId,
    outputOrdinal,
    displayName: name,
  }));
  const projectedFields = names.map((name, outputOrdinal) => ({
    fieldId: `field:project:${name}`,
    relationId: projectRelationId,
    sourceFieldId: sourceFields[outputOrdinal]!.fieldId,
    outputOrdinal,
    displayName: name,
  }));
  const base = {
    plan,
    sidecar: {
      schemaVersion: DVT_SUBSTRAIT_AUTHORING_SIDECAR_SCHEMA_VERSION,
      semanticPlanSha256: initialPlan.sha256,
      relations: [
        {
          relationId: sourceRelationId,
          relAnchor: 1,
          sourceRef,
          displayName: 'sort_fetch_rows',
        },
        { relationId: projectRelationId, relAnchor: 2 },
      ],
      fields: [...sourceFields, ...projectedFields],
    },
  };
  const sorted = createDvtSubstraitSortDraft(base, {
    relationId: 'relation:sort-fetch-sort',
    outputFieldIds: names.map((name) => `field:sort:${name}`),
    keys: [
      {
        fieldId: 'field:project:amount',
        direction: SortField_SortDirection.DESC_NULLS_LAST,
      },
      {
        fieldId: 'field:project:id',
        direction: SortField_SortDirection.ASC_NULLS_LAST,
      },
    ],
  });
  const fetched = createDvtSubstraitFetchDraft(sorted, {
    relationId: 'relation:sort-fetch-fetch',
    outputFieldIds: names.map((name) => `field:fetch:${name}`),
    offset: 2n,
    count: 3n,
  });
  const semanticPlan = encodeDvtSubstraitPlanV1(fetched.plan);
  const semanticDocument = DvtSubstraitSemanticDocumentV1Schema.parse({
    schemaVersion: DVT_SUBSTRAIT_SEMANTIC_DOCUMENT_SCHEMA_VERSION,
    profile: DVT_SUBSTRAIT_PROFILE_REF_V1,
    semanticPlan,
    sidecar: { ...fetched.sidecar, semanticPlanSha256: semanticPlan.sha256 },
  });
  const nodes = [
    {
      id: 'source-sort-fetch',
      name: 'Sort fetch rows',
      pluginId: 'dvt.warehouse-source',
      kind: 'dvt:source',
      role: 'input' as const,
      status: 'idle' as const,
      tags: [],
      metadata: {
        schema: 'raw',
        tableName: 'sort_fetch_rows',
        connectedSourceRef: sourceRef,
        columns: [
          { name: 'id', type: 'bigint', nullable: false },
          { name: 'amount', type: 'bigint', nullable: true },
          { name: 'grp', type: 'text', nullable: false },
        ],
      },
    },
    {
      id: 'transform-sort-fetch',
      name: 'Ordered rows',
      pluginId: 'dvt',
      kind: 'transform',
      role: 'transform' as const,
      status: 'idle' as const,
      tags: [],
      metadata: {
        transformAuthoring: { version: 'v1', mode: 'substrait', semanticDocument },
      },
    },
  ];
  return {
    canvas: { id: 'canvas-sort-fetch', kind: 'transformation', title: 'Sort Fetch' },
    nodeIds: nodes.map((node) => node.id),
    nodePositions: {
      'source-sort-fetch': { x: 0, y: 0 },
      'transform-sort-fetch': { x: 240, y: 0 },
    },
    nodes,
    edges: [
      {
        id: 'edge-sort-fetch',
        sourceId: 'source-sort-fetch',
        targetId: 'transform-sort-fetch',
        relation: 'lineage',
      },
    ],
  };
}
