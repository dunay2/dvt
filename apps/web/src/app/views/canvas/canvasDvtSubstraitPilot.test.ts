import { create } from '@bufbuild/protobuf';
import {
  ExpressionSchema,
  Expression_FieldReferenceSchema,
  Expression_FieldReference_RootReferenceSchema,
  Expression_ReferenceSegmentSchema,
  Expression_ReferenceSegment_StructFieldSchema,
  ProjectRelSchema,
  ReadRelSchema,
  ReadRel_NamedTableSchema,
  RelCommonSchema,
  RelCommon_EmitSchema,
  RelRootSchema,
  RelSchema,
  type Expression,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import {
  ExecutionBehaviorSchema,
  ExecutionBehavior_VariableEvaluationMode,
  PlanRelSchema,
  PlanSchema,
} from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import {
  NamedStructSchema,
  TypeSchema,
  Type_Nullability,
  Type_StringSchema,
  Type_StructSchema,
  type Type,
} from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { WorkspaceGraphAuthoringDraftSchema } from '@dvt/contracts';
import {
  DVT_SUBSTRAIT_AUTHORING_SIDECAR_SCHEMA_VERSION,
  type DvtSubstraitAuthoringSidecarV1,
} from '@dvt/contracts/substrait';
import { describe, expect, it } from 'vitest';

import { projectWorkspaceGraphAuthoringDraftSemanticGraph } from '../../services/workspace/workspaceGraphDraftProjection';
import type { CanonicalNode } from '../../types/canonical';
import { projectCanonicalNodeToAuthoringNode } from './canvasDraftAuthoring';
import {
  applyCanvasInspectorNodeDraft,
  createCanvasInspectorNodeDraft,
} from './canvasInspectorAuthoringModel';
import {
  applyDvtSubstraitSemanticDocument,
  readDvtTransformAuthoringAuthority,
} from './canvasDvtTransformAuthoringAuthority';
import {
  applyDvtSubstraitPilotFunction,
  decodeDvtSubstraitPilotDocument,
  encodeDvtSubstraitPilotDocument,
  inspectDvtSubstraitPilotDraft,
  renameDvtSubstraitPilotOutput,
  type DvtSubstraitPilotDraft,
} from './canvasDvtSubstraitPilot';
import { projectCanvasNodePresentationTruth } from './canvasNodePresentationProjection';
import { resolveExecutableSqlText } from './canvasTransformationSqlMirror';

const ZERO_SHA256 = '0'.repeat(64);
const OUTPUT_FIELD_ID = 'field:customer-name';
const PILOT_OUTPUTS = [
  { name: 'name', fieldId: OUTPUT_FIELD_ID, outputOrdinal: 0 },
  { name: 'email', fieldId: 'field:email', outputOrdinal: 1 },
  { name: 'country', fieldId: 'field:country', outputOrdinal: 2 },
] as const;

function stringType(): Type {
  return create(TypeSchema, {
    kind: {
      case: 'string',
      value: create(Type_StringSchema, { nullability: Type_Nullability.NULLABLE }),
    },
  });
}

function fieldRef(ordinal: number): Expression {
  return create(ExpressionSchema, {
    rexType: {
      case: 'selection',
      value: create(Expression_FieldReferenceSchema, {
        referenceType: {
          case: 'directReference',
          value: create(Expression_ReferenceSegmentSchema, {
            referenceType: {
              case: 'structField',
              value: create(Expression_ReferenceSegment_StructFieldSchema, { field: ordinal }),
            },
          }),
        },
        rootType: {
          case: 'rootReference',
          value: create(Expression_FieldReference_RootReferenceSchema, {}),
        },
      }),
    },
  });
}

function buildPilotDraft(): DvtSubstraitPilotDraft {
  const read = create(RelSchema, {
    relType: {
      case: 'read',
      value: create(ReadRelSchema, {
        common: create(RelCommonSchema, { relAnchor: 1 }),
        baseSchema: create(NamedStructSchema, {
          names: ['name', 'email', 'country'],
          struct: create(Type_StructSchema, {
            types: [stringType(), stringType(), stringType()],
            nullability: Type_Nullability.REQUIRED,
          }),
        }),
        readType: {
          case: 'namedTable',
          value: create(ReadRel_NamedTableSchema, { names: ['customers'] }),
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
            value: create(RelCommon_EmitSchema, { outputMapping: [3, 1, 2] }),
          },
        }),
        input: read,
        expressions: [fieldRef(0)],
      }),
    },
  });
  const plan = create(PlanSchema, {
    version: {
      majorNumber: 0,
      minorNumber: 101,
      patchNumber: 0,
      producer: 'dvt-vtx2-card-pilot-test',
    },
    relations: [
      create(PlanRelSchema, {
        relType: {
          case: 'root',
          value: create(RelRootSchema, {
            input: project,
            names: ['name', 'email', 'country'],
          }),
        },
      }),
    ],
    executionBehavior: create(ExecutionBehaviorSchema, {
      variableEvalMode: ExecutionBehavior_VariableEvaluationMode.PER_PLAN,
    }),
  });
  const sidecar: DvtSubstraitAuthoringSidecarV1 = {
    schemaVersion: DVT_SUBSTRAIT_AUTHORING_SIDECAR_SCHEMA_VERSION,
    semanticPlanSha256: ZERO_SHA256,
    relations: [
      { relationId: 'relation:customers', relAnchor: 1, displayName: 'customers' },
      { relationId: 'relation:customer-project', relAnchor: 2, displayName: 'customers' },
    ],
    fields: [
      {
        fieldId: OUTPUT_FIELD_ID,
        relationId: 'relation:customer-project',
        outputOrdinal: 0,
        displayName: 'name',
      },
      {
        fieldId: 'field:email',
        relationId: 'relation:customer-project',
        outputOrdinal: 1,
        displayName: 'email',
      },
      {
        fieldId: 'field:country',
        relationId: 'relation:customer-project',
        outputOrdinal: 2,
        displayName: 'country',
      },
    ],
  };
  return { plan, sidecar };
}

function buildTransformNode(metadata: CanonicalNode['metadata'] = {}): CanonicalNode {
  return {
    id: 'transform-customers',
    name: 'Customers',
    pluginId: 'dvt',
    kind: 'dvt:sql_transform',
    role: 'transform',
    status: 'idle',
    tags: ['authoring'],
    metadata,
  };
}

function buildSourceNode(): CanonicalNode {
  return {
    id: 'source-customers',
    name: 'customers',
    pluginId: 'dvt',
    kind: 'dvt:source',
    role: 'input',
    status: 'idle',
    tags: ['authoring'],
    metadata: {
      columns: [
        { name: 'name', type: 'string' },
        { name: 'email', type: 'string' },
        { name: 'country', type: 'string' },
      ],
    },
  };
}

function editPilotDraft(draft: DvtSubstraitPilotDraft): DvtSubstraitPilotDraft {
  const trimmed = applyDvtSubstraitPilotFunction(draft, 'trim');
  const upper = applyDvtSubstraitPilotFunction(trimmed, 'upper');
  return renameDvtSubstraitPilotOutput(upper, 'customer_name');
}

describe('typed Substrait DVT card pilot', () => {
  it('edits the real Plan, preserves FieldId, and reopens the exact semantic recipe', () => {
    const initialDocument = encodeDvtSubstraitPilotDocument(buildPilotDraft());
    const initialDraft = decodeDvtSubstraitPilotDocument(initialDocument);

    expect(inspectDvtSubstraitPilotDraft(initialDraft)).toEqual({
      ok: true,
      projection: {
        sourceName: 'customers',
        inputFieldName: 'name',
        outputName: 'name',
        fieldId: OUTPUT_FIELD_ID,
        operations: [],
        outputs: PILOT_OUTPUTS,
      },
    });

    const edited = editPilotDraft(initialDraft);
    const persisted = encodeDvtSubstraitPilotDocument(edited);
    const reopened = decodeDvtSubstraitPilotDocument(persisted);
    const reopenedInspection = inspectDvtSubstraitPilotDraft(reopened);

    expect(reopenedInspection).toEqual({
      ok: true,
      projection: {
        sourceName: 'customers',
        inputFieldName: 'name',
        outputName: 'customer_name',
        fieldId: OUTPUT_FIELD_ID,
        operations: ['trim', 'upper'],
        outputs: [
          { name: 'customer_name', fieldId: OUTPUT_FIELD_ID, outputOrdinal: 0 },
          { name: 'email', fieldId: 'field:email', outputOrdinal: 1 },
          { name: 'country', fieldId: 'field:country', outputOrdinal: 2 },
        ],
      },
    });
    expect(persisted.sidecar.semanticPlanSha256).toBe(persisted.semanticPlan.sha256);
    expect(persisted.sidecar.fields.find((field) => field.outputOrdinal === 0)?.fieldId).toBe(
      OUTPUT_FIELD_ID
    );
    expect(
      reopened.plan.extensions.map((entry) =>
        entry.mappingType.case === 'extensionFunction' ? entry.mappingType.value.name : ''
      )
    ).toEqual(['trim:str', 'upper:str']);
  });

  it('uses existing Apply, card projection, and Graph Draft reload without a second store', () => {
    const initialDocument = encodeDvtSubstraitPilotDocument(buildPilotDraft());
    const node = applyDvtSubstraitSemanticDocument(buildTransformNode(), initialDocument);
    const originalAuthority = readDvtTransformAuthoringAuthority(node);
    const inspectorDraft = createCanvasInspectorNodeDraft(node);

    expect(inspectorDraft.dvt?.kind).toBe('sql_transform');
    if (inspectorDraft.dvt?.kind !== 'sql_transform' || inspectorDraft.dvt.mode !== 'substrait') {
      throw new Error('Expected Substrait Inspector draft.');
    }

    const edited = editPilotDraft({ plan: inspectorDraft.dvt.plan, sidecar: inspectorDraft.dvt.sidecar });
    const editedInspectorDraft = {
      ...inspectorDraft,
      dvt: { ...inspectorDraft.dvt, plan: edited.plan, sidecar: edited.sidecar },
    };

    // Cancel means not applying the transient Inspector draft: semantic authority stays untouched.
    expect(readDvtTransformAuthoringAuthority(node)).toEqual(originalAuthority);

    const appliedNode = applyCanvasInspectorNodeDraft(node, editedInspectorDraft);
    const appliedAuthority = readDvtTransformAuthoringAuthority(appliedNode);
    expect(appliedAuthority.mode).toBe('substrait');

    const sourceNode = buildSourceNode();
    const presentation = projectCanvasNodePresentationTruth({
      node: appliedNode,
      nodes: [sourceNode, appliedNode],
      edges: [{ sourceId: sourceNode.id, targetId: appliedNode.id }],
    });
    expect(presentation.columns.visible.map((column) => column.name)).toEqual([
      'customer_name',
      'email',
      'country',
    ]);
    expect(presentation.columns.visible.map((column) => column.reference)).toEqual([
      OUTPUT_FIELD_ID,
      'field:email',
      'field:country',
    ]);

    const graphDraft = WorkspaceGraphAuthoringDraftSchema.parse({
      canvas: { id: 'canvas-1', kind: 'transformation', title: 'Transformation' },
      nodeIds: [appliedNode.id],
      nodePositions: { [appliedNode.id]: { x: 40, y: 80 } },
      nodes: [projectCanonicalNodeToAuthoringNode(appliedNode)],
      edges: [],
    });
    const reopenedNode = projectWorkspaceGraphAuthoringDraftSemanticGraph(graphDraft).canonicalNodes[0];
    if (reopenedNode == null) throw new Error('Expected reopened Substrait node.');
    const reopenedAuthority = readDvtTransformAuthoringAuthority(reopenedNode);
    if (reopenedAuthority.mode !== 'substrait') throw new Error('Expected Substrait authority.');

    expect(
      inspectDvtSubstraitPilotDraft(decodeDvtSubstraitPilotDocument(reopenedAuthority.semanticDocument))
    ).toEqual({
      ok: true,
      projection: {
        sourceName: 'customers',
        inputFieldName: 'name',
        outputName: 'customer_name',
        fieldId: OUTPUT_FIELD_ID,
        operations: ['trim', 'upper'],
        outputs: [
          { name: 'customer_name', fieldId: OUTPUT_FIELD_ID, outputOrdinal: 0 },
          { name: 'email', fieldId: 'field:email', outputOrdinal: 1 },
          { name: 'country', fieldId: 'field:country', outputOrdinal: 2 },
        ],
      },
    });
  });

  it('fails closed outside the pilot shape and while SQL projection is not implemented', () => {
    const initialDocument = encodeDvtSubstraitPilotDocument(buildPilotDraft());
    const node = applyDvtSubstraitSemanticDocument(buildTransformNode(), initialDocument);
    const unsupported = decodeDvtSubstraitPilotDocument(initialDocument);
    unsupported.plan.relations = [];

    expect(inspectDvtSubstraitPilotDraft(unsupported)).toEqual({ ok: false });
    expect(applyDvtSubstraitPilotFunction(unsupported, 'trim')).toBe(unsupported);
    expect(resolveExecutableSqlText(node)).toEqual({
      ok: false,
      message:
        'SQL projection is not available yet for Substrait-authored transform node transform-customers.',
    });
  });
});
