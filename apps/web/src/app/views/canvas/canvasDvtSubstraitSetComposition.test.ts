import {
  SetRel_SetOp,
  SortField_SortDirection,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { describe, expect, it } from 'vitest';

import { DVT_TRANSFORM_AUTHORING_MODE, type ConnectedSourceRef } from '@dvt/contracts';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import {
  applyDvtNodeAuthoringMetadata,
  createDvtNodeAuthoringMetadata,
} from './canvasDvtAuthoringModel';
import { projectCanvasNodePresentationTruth } from './canvasNodePresentationProjection';
import {
  applyDvtSubstraitUnionAllGroupedRowNumber,
  applyDvtSubstraitUnionAllGrouping,
  applyDvtSubstraitUnionAllFieldEdit,
  createDvtSubstraitUnionAllDraft,
  decodeDvtSubstraitUnionAllDocument,
  encodeDvtSubstraitUnionAllDocument,
  inspectDvtSubstraitUnionAllGroupedWindowDraft,
  inspectDvtSubstraitUnionAllGroupingDraft,
  inspectDvtSubstraitUnionAllDraft,
  removeDvtSubstraitUnionAllGroupedRowNumber,
  removeDvtSubstraitUnionAllGrouping,
  resolveDvtSubstraitUnionAllEntry,
  type DvtSubstraitUnionAllDraft,
  type DvtSubstraitUnionAllSource,
} from './canvasDvtSubstraitSetComposition';

const FIELD_NAMES = ['customer_id', 'name', 'country'] as const;

function sourceRef(connectionId: string, sourceObjectId: string): ConnectedSourceRef {
  return {
    schemaVersion: 'connected-source-ref.v1',
    connectionRef: {
      schemaVersion: 'connection-ref.v1',
      connectionId,
      provider: 'postgres',
    },
    sourceObjectId,
  };
}

function source(
  nodeId: string,
  table: string,
  connectionId = 'warehouse-main'
): DvtSubstraitUnionAllSource {
  return {
    nodeId,
    schema: 'public',
    table,
    fields: FIELD_NAMES.map((name) => ({ name, type: 'string' as const })),
    sourceRef: sourceRef(connectionId, `public.${table}`),
  };
}

function fixture(): DvtSubstraitUnionAllDraft {
  return createDvtSubstraitUnionAllDraft({
    inputs: [
      source('source-customers-north', 'customers_north'),
      source('source-customers-south', 'customers_south'),
    ],
    targetNodeId: 'transform-all-customers',
  });
}

function sourceNode(
  nodeId: string,
  table: string,
  fields: readonly string[] = FIELD_NAMES,
  connectionId = 'warehouse-main'
): CanonicalNode {
  return {
    id: nodeId,
    name: table,
    pluginId: 'dvt',
    kind: 'dvt:source',
    role: 'input',
    status: 'idle',
    tags: ['source'],
    metadata: {
      schema: 'public',
      tableName: table,
      columns: fields.map((name) => ({ name, type: 'string' })),
      connectedSourceRef: sourceRef(connectionId, `public.${table}`),
    },
  };
}

function targetNode(): CanonicalNode {
  return {
    id: 'transform-all-customers',
    name: 'All customers',
    pluginId: 'dvt',
    kind: 'dvt:transform',
    role: 'transform',
    status: 'idle',
    tags: ['authoring'],
    metadata: {},
  };
}

function inputEdge(id: string, sourceId: string): CanonicalEdge {
  return {
    id,
    sourceId,
    targetId: 'transform-all-customers',
    relation: 'lineage',
  };
}

describe('VTX2 typed Substrait UNION ALL composition', () => {
  it('represents two compatible PostgreSQL sources as one exact SetRel revision', () => {
    const draft = fixture();

    expect(inspectDvtSubstraitUnionAllDraft(draft)).toEqual({
      ok: true,
      projection: {
        inputs: [
          {
            schema: 'public',
            table: 'customers_north',
            sourceRef: sourceRef('warehouse-main', 'public.customers_north'),
          },
          {
            schema: 'public',
            table: 'customers_south',
            sourceRef: sourceRef('warehouse-main', 'public.customers_south'),
          },
        ],
        availableFields: FIELD_NAMES.map((fieldKey) => ({
          fieldKey,
          defaultName: fieldKey,
        })),
        outputs: FIELD_NAMES.map((name, outputOrdinal) => ({
          fieldKey: name,
          name,
          fieldId: `field:transform-all-customers:${name}`,
          outputOrdinal,
        })),
      },
    });
    expect(draft.plan.relations[0]?.relType.case).toBe('root');
    expect(draft.sidecar.relations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ relationId: 'relation:source-customers-north', relAnchor: 1 }),
        expect.objectContaining({ relationId: 'relation:source-customers-south', relAnchor: 2 }),
        expect.objectContaining({
          relationId: 'relation:transform-all-customers:union-all',
          relAnchor: 3,
        }),
      ])
    );
  });

  it('round-trips the canonical document without changing stable identities', () => {
    const draft = fixture();
    const encoded = encodeDvtSubstraitUnionAllDocument(draft);
    const reopened = decodeDvtSubstraitUnionAllDocument(encoded);

    expect(encodeDvtSubstraitUnionAllDocument(reopened)).toEqual(encoded);
    expect(inspectDvtSubstraitUnionAllDraft(reopened)).toEqual(
      inspectDvtSubstraitUnionAllDraft(draft)
    );

    const editedAfterReload = applyDvtSubstraitUnionAllFieldEdit(reopened, {
      kind: 'rename',
      fieldKey: 'country',
      outputName: 'region',
    });
    expect(inspectDvtSubstraitUnionAllDraft(editedAfterReload)).toMatchObject({
      ok: true,
      projection: {
        outputs: expect.arrayContaining([
          {
            fieldKey: 'country',
            name: 'region',
            fieldId: 'field:transform-all-customers:country',
            outputOrdinal: 2,
          },
        ]),
      },
    });
  });

  it('selects, renames, and reorders union fields through SetRel emit mappings', () => {
    let draft = fixture();
    draft = applyDvtSubstraitUnionAllFieldEdit(draft, {
      kind: 'rename',
      fieldKey: 'country',
      outputName: 'region',
    });
    draft = applyDvtSubstraitUnionAllFieldEdit(draft, {
      kind: 'move',
      fieldKey: 'country',
      direction: 'up',
    });
    draft = applyDvtSubstraitUnionAllFieldEdit(draft, {
      kind: 'move',
      fieldKey: 'country',
      direction: 'up',
    });
    draft = applyDvtSubstraitUnionAllFieldEdit(draft, {
      kind: 'set-selected',
      fieldKey: 'name',
      selected: false,
    });

    const reopened = decodeDvtSubstraitUnionAllDocument(encodeDvtSubstraitUnionAllDocument(draft));
    expect(inspectDvtSubstraitUnionAllDraft(reopened)).toMatchObject({
      ok: true,
      projection: {
        availableFields: [
          { fieldKey: 'customer_id', defaultName: 'customer_id' },
          { fieldKey: 'name', defaultName: 'name' },
          { fieldKey: 'country', defaultName: 'country' },
        ],
        outputs: [
          {
            fieldKey: 'country',
            name: 'region',
            fieldId: 'field:transform-all-customers:country',
            outputOrdinal: 0,
          },
          {
            fieldKey: 'customer_id',
            name: 'customer_id',
            fieldId: 'field:transform-all-customers:customer_id',
            outputOrdinal: 1,
          },
        ],
      },
    });
    const root = reopened.plan.relations[0]?.relType;
    const setRelation = root?.case === 'root' ? root.value.input?.relType : null;
    const emitKind = setRelation?.case === 'set' ? setRelation.value.common?.emitKind : null;
    expect(emitKind?.case === 'emit' ? emitKind.value.outputMapping : null).toEqual([2, 0]);
  });

  it('groups and ranks selected UNION ALL fields in the same canonical revision', () => {
    let selected = fixture();
    selected = applyDvtSubstraitUnionAllFieldEdit(selected, {
      kind: 'rename',
      fieldKey: 'country',
      outputName: 'region',
    });
    selected = applyDvtSubstraitUnionAllFieldEdit(selected, {
      kind: 'move',
      fieldKey: 'country',
      direction: 'up',
    });
    selected = applyDvtSubstraitUnionAllFieldEdit(selected, {
      kind: 'move',
      fieldKey: 'country',
      direction: 'up',
    });
    selected = applyDvtSubstraitUnionAllFieldEdit(selected, {
      kind: 'set-selected',
      fieldKey: 'name',
      selected: false,
    });

    const grouped = applyDvtSubstraitUnionAllGrouping(selected, {
      groupFieldId: 'field:transform-all-customers:country',
      countOutputName: 'customer_count',
    });
    expect(inspectDvtSubstraitUnionAllGroupingDraft(grouped)).toMatchObject({
      ok: true,
      projection: {
        groupField: {
          fieldKey: 'country',
          name: 'region',
          fieldId: 'field:transform-all-customers:country',
          inputOrdinal: 0,
        },
        measure: {
          name: 'customer_count',
          fieldId: 'field:transform-all-customers:union-all-count',
        },
        outputs: [
          {
            name: 'region',
            fieldId: 'field:transform-all-customers:country',
            outputOrdinal: 0,
          },
          {
            name: 'customer_count',
            fieldId: 'field:transform-all-customers:union-all-count',
            outputOrdinal: 1,
          },
        ],
      },
    });

    const ranked = applyDvtSubstraitUnionAllGroupedRowNumber(grouped, {
      outputName: 'count_rank',
    });
    const reopened = decodeDvtSubstraitUnionAllDocument(encodeDvtSubstraitUnionAllDocument(ranked));
    expect(inspectDvtSubstraitUnionAllGroupedWindowDraft(reopened)).toMatchObject({
      ok: true,
      projection: {
        outputs: [
          expect.objectContaining({ name: 'region', outputOrdinal: 0 }),
          expect.objectContaining({ name: 'customer_count', outputOrdinal: 1 }),
          expect.objectContaining({ name: 'count_rank', outputOrdinal: 2 }),
        ],
      },
    });

    const restoredGrouped = removeDvtSubstraitUnionAllGroupedRowNumber(reopened);
    expect(inspectDvtSubstraitUnionAllGroupingDraft(restoredGrouped).ok).toBe(true);
    const restoredSelected = removeDvtSubstraitUnionAllGrouping(restoredGrouped);
    expect(inspectDvtSubstraitUnionAllDraft(restoredSelected)).toEqual(
      inspectDvtSubstraitUnionAllDraft(selected)
    );
  });

  it('persists, reopens, and presents one Transform card from the same revision', () => {
    let draft = fixture();
    draft = applyDvtSubstraitUnionAllGrouping(draft, {
      groupFieldId: 'field:transform-all-customers:country',
      countOutputName: 'customer_count',
    });
    draft = applyDvtSubstraitUnionAllGroupedRowNumber(draft, {
      outputName: 'count_rank',
    });
    const persisted = applyDvtNodeAuthoringMetadata(targetNode(), {
      kind: 'transform',
      mode: DVT_TRANSFORM_AUTHORING_MODE.substrait,
      shape: 'union_all',
      plan: draft.plan,
      sidecar: draft.sidecar,
    });
    const reopened = createDvtNodeAuthoringMetadata(persisted);

    expect(reopened).toMatchObject({
      kind: 'transform',
      mode: DVT_TRANSFORM_AUTHORING_MODE.substrait,
      shape: 'union_all',
    });
    expect(
      projectCanvasNodePresentationTruth({ node: persisted, nodes: [persisted], edges: [] }).columns
        .visible
    ).toMatchObject([
      { name: 'country', reference: 'field:transform-all-customers:country' },
      {
        name: 'customer_count',
        reference: 'field:transform-all-customers:union-all-count',
      },
      {
        name: 'count_rank',
        reference: 'field:transform-all-customers:union-all-count-rank',
      },
    ]);
  });

  it('offers the product action only for two same-connection sources with identical schemas', () => {
    const target = targetNode();
    const north = sourceNode('source-customers-north', 'customers_north');
    const south = sourceNode('source-customers-south', 'customers_south');
    const edges = [inputEdge('south-union', south.id), inputEdge('north-union', north.id)];

    expect(
      resolveDvtSubstraitUnionAllEntry({ targetNode: target, nodes: [north, south, target], edges })
    ).toEqual({
      inputs: [
        source('source-customers-north', 'customers_north'),
        source('source-customers-south', 'customers_south'),
      ],
      targetNodeId: target.id,
    });

    const mismatched = sourceNode('source-customers-south', 'customers_south', [
      'customer_id',
      'name',
    ]);
    expect(
      resolveDvtSubstraitUnionAllEntry({
        targetNode: target,
        nodes: [north, mismatched, target],
        edges,
      })
    ).toBeNull();

    const mismatchedTypeBase = sourceNode('source-customers-south', 'customers_south');
    const mismatchedType: CanonicalNode = {
      ...mismatchedTypeBase,
      metadata: {
        ...mismatchedTypeBase.metadata,
        columns: FIELD_NAMES.map((name, index) => ({
          name,
          type: index === 0 ? 'i64' : 'string',
        })),
      },
    };
    expect(
      resolveDvtSubstraitUnionAllEntry({
        targetNode: target,
        nodes: [north, mismatchedType, target],
        edges,
      })
    ).toBeNull();
  });

  it('fails closed for mixed connections and unsupported SetRel variants', () => {
    expect(() =>
      createDvtSubstraitUnionAllDraft({
        inputs: [
          source('source-a', 'customers_north'),
          source('source-b', 'customers_south', 'warehouse-b'),
        ],
        targetNodeId: 'transform-all-customers',
      })
    ).toThrow(/same connection/i);

    const draft = fixture();
    const root = draft.plan.relations[0]?.relType;
    if (root?.case !== 'root' || root.value.input?.relType.case !== 'set') {
      throw new Error('Expected SetRel root.');
    }
    root.value.input.relType.value.op = SetRel_SetOp.UNION_DISTINCT;

    expect(inspectDvtSubstraitUnionAllDraft(draft)).toEqual({ ok: false });
    expect(() => encodeDvtSubstraitUnionAllDocument(draft)).toThrow(/unsupported/i);

    const invalidMapping = fixture();
    const invalidRoot = invalidMapping.plan.relations[0]?.relType;
    if (invalidRoot?.case !== 'root' || invalidRoot.value.input?.relType.case !== 'set') {
      throw new Error('Expected SetRel root.');
    }
    if (invalidRoot.value.input.relType.value.common?.emitKind.case !== 'emit') {
      throw new Error('Expected SetRel emit mapping.');
    }
    invalidRoot.value.input.relType.value.common.emitKind.value.outputMapping = [0, 0];
    expect(inspectDvtSubstraitUnionAllDraft(invalidMapping)).toEqual({ ok: false });
  });

  it('fails closed for invalid grouping/window semantics, stale hashes, and duplicate bindings', () => {
    const createGrouped = (): DvtSubstraitUnionAllDraft =>
      applyDvtSubstraitUnionAllGrouping(fixture(), {
        groupFieldId: 'field:transform-all-customers:country',
        countOutputName: 'customer_count',
      });

    const wrongGroupingOrdinal = createGrouped();
    const groupingRoot = wrongGroupingOrdinal.plan.relations[0]?.relType;
    const groupingExpression =
      groupingRoot?.case === 'root' && groupingRoot.value.input?.relType.case === 'aggregate'
        ? groupingRoot.value.input.relType.value.groupingExpressions[0]?.rexType
        : null;
    const directReference =
      groupingExpression?.case === 'selection' ? groupingExpression.value.referenceType : null;
    const structField =
      directReference?.case === 'directReference' ? directReference.value.referenceType : null;
    if (structField?.case !== 'structField') throw new Error('Expected grouping field reference.');
    structField.value.field = 99;
    expect(inspectDvtSubstraitUnionAllGroupingDraft(wrongGroupingOrdinal)).toEqual({ ok: false });

    const wrongWindowOrder = applyDvtSubstraitUnionAllGroupedRowNumber(createGrouped(), {
      outputName: 'count_rank',
    });
    const windowRoot = wrongWindowOrder.plan.relations[0]?.relType;
    const windowExpression =
      windowRoot?.case === 'root' && windowRoot.value.input?.relType.case === 'project'
        ? windowRoot.value.input.relType.value.expressions[0]?.rexType
        : null;
    const firstSort =
      windowExpression?.case === 'windowFunction' ? windowExpression.value.sorts[0] : null;
    if (firstSort?.sortKind.case !== 'direction') throw new Error('Expected window direction.');
    firstSort.sortKind.value = SortField_SortDirection.ASC_NULLS_LAST;
    expect(inspectDvtSubstraitUnionAllGroupedWindowDraft(wrongWindowOrder)).toEqual({ ok: false });

    const hashed = decodeDvtSubstraitUnionAllDocument(
      encodeDvtSubstraitUnionAllDocument(createGrouped())
    );
    const staleHash: DvtSubstraitUnionAllDraft = {
      ...hashed,
      sidecar: { ...hashed.sidecar, semanticPlanSha256: 'a'.repeat(64) },
    };
    expect(inspectDvtSubstraitUnionAllGroupingDraft(staleHash)).toEqual({ ok: false });

    const grouped = createGrouped();
    const unionRelationId = grouped.sidecar.relations[2]?.relationId;
    if (unionRelationId == null) throw new Error('Expected UNION ALL binding.');
    const duplicateBinding: DvtSubstraitUnionAllDraft = {
      ...grouped,
      sidecar: {
        ...grouped.sidecar,
        relations: grouped.sidecar.relations.map((relation, index) =>
          index === 3 ? { ...relation, relationId: unionRelationId } : relation
        ),
      },
    };
    expect(inspectDvtSubstraitUnionAllGroupingDraft(duplicateBinding)).toEqual({ ok: false });
  });
});
