import { SetRel_SetOp } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { describe, expect, it } from 'vitest';

import { DVT_TRANSFORM_AUTHORING_MODE, type ConnectedSourceRef } from '@dvt/contracts';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import {
  applyDvtNodeAuthoringMetadata,
  createDvtNodeAuthoringMetadata,
} from './canvasDvtAuthoringModel';
import { projectCanvasColumnLineage } from './canvasColumnLineageProjection';
import { projectCanvasNodePresentationTruth } from './canvasNodePresentationProjection';
import {
  applyDvtSubstraitUnionAllFieldEdit,
  applyDvtSubstraitUnionAllGroupedRowNumber,
  applyDvtSubstraitUnionAllGrouping,
  createDvtSubstraitUnionAllDraft,
  decodeDvtSubstraitUnionAllDocument,
  encodeDvtSubstraitUnionAllDocument,
  inspectDvtSubstraitUnionAllDraft,
  inspectDvtSubstraitUnionAllGroupedWindowDraft,
  inspectDvtSubstraitUnionAllGroupingDraft,
  removeDvtSubstraitUnionAllGroupedRowNumber,
  removeDvtSubstraitUnionAllGrouping,
  renameDvtSubstraitUnionAllCountOutput,
  renameDvtSubstraitUnionAllGroupedRowNumberOutput,
  resolveDvtSubstraitUnionAllEntry,
  type DvtSubstraitUnionAllDraft,
  type DvtSubstraitUnionAllProjection,
  type DvtSubstraitUnionAllSource,
} from './canvasDvtSubstraitSetComposition';

const FIELD_NAMES = ['customer_id', 'name', 'country'] as const;
const OPAQUE_RELATION_ID =
  /^dvt_rel_[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const OPAQUE_FIELD_ID =
  /^dvt_fld_[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

function inspectBase(draft: DvtSubstraitUnionAllDraft): DvtSubstraitUnionAllProjection {
  const inspection = inspectDvtSubstraitUnionAllDraft(draft);
  if (!inspection.ok) throw new Error('Expected inspectable UNION ALL.');
  return inspection.projection;
}

function outputByKey(
  projection: DvtSubstraitUnionAllProjection,
  fieldKey: string
): DvtSubstraitUnionAllProjection['outputs'][number] {
  const output = projection.outputs.find((candidate) => candidate.fieldKey === fieldKey);
  if (output == null) throw new Error(`Expected UNION ALL output ${fieldKey}.`);
  return output;
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

function expectOpaqueIdentity(draft: DvtSubstraitUnionAllDraft): void {
  draft.sidecar.relations.forEach((relation) =>
    expect(relation.relationId).toMatch(OPAQUE_RELATION_ID)
  );
  draft.sidecar.fields.forEach((field) => expect(field.fieldId).toMatch(OPAQUE_FIELD_ID));
  expect(new Set(draft.sidecar.relations.map((relation) => relation.relationId)).size).toBe(
    draft.sidecar.relations.length
  );
  expect(new Set(draft.sidecar.fields.map((field) => field.fieldId)).size).toBe(
    draft.sidecar.fields.length
  );
}

function legacyDraft(draft: DvtSubstraitUnionAllDraft): DvtSubstraitUnionAllDraft {
  const projection = inspectBase(draft);
  const relationMap = new Map<string, string>();
  projection.inputs.forEach((input, index) =>
    relationMap.set(input.relationId, `relation:legacy-source-${index + 1}`)
  );
  relationMap.set(projection.resultRelationId, 'relation:legacy-transform:union-all');
  const fieldMap = new Map<string, string>();
  projection.inputs.forEach((input, inputIndex) =>
    input.fields.forEach((field) =>
      fieldMap.set(field.fieldId, `field:legacy-source-${inputIndex + 1}:${field.name}`)
    )
  );
  projection.outputs.forEach((output) =>
    fieldMap.set(output.fieldId, `field:legacy-transform:${output.fieldKey}`)
  );
  return {
    plan: draft.plan,
    sidecar: {
      ...draft.sidecar,
      relations: draft.sidecar.relations.map((relation) => ({
        ...relation,
        relationId: relationMap.get(relation.relationId) ?? relation.relationId,
      })),
      fields: draft.sidecar.fields.map((field) => ({
        ...field,
        fieldId: fieldMap.get(field.fieldId) ?? field.fieldId,
        relationId: relationMap.get(field.relationId) ?? field.relationId,
        ...(field.sourceFieldId == null
          ? {}
          : { sourceFieldId: fieldMap.get(field.sourceFieldId) ?? field.sourceFieldId }),
      })),
    },
  };
}

describe('VTX2 Substrait UNION ALL identity', () => {
  it('allocates opaque persisted identity while SetRel semantics stay positional', () => {
    const draft = fixture();
    const projection = inspectBase(draft);

    expectOpaqueIdentity(draft);
    expect(projection.inputs.map((input) => `${input.schema}.${input.table}`)).toEqual([
      'public.customers_north',
      'public.customers_south',
    ]);
    expect(projection.inputs.every((input) => OPAQUE_RELATION_ID.test(input.relationId))).toBe(
      true
    );
    expect(projection.inputs.map((input) => input.fields.map((field) => field.name))).toEqual([
      [...FIELD_NAMES],
      [...FIELD_NAMES],
    ]);
    expect(projection.outputs.map((output) => output.fieldKey)).toEqual([...FIELD_NAMES]);
    expect(projection.resultRelationId).toMatch(OPAQUE_RELATION_ID);

    const root = draft.plan.relations[0]?.relType;
    const set = root?.case === 'root' ? root.value.input?.relType : undefined;
    expect(set?.case).toBe('set');
    if (set?.case === 'set') {
      expect(set.value.op).toBe(SetRel_SetOp.UNION_ALL);
      expect(
        set.value.common?.emitKind.case === 'emit'
          ? set.value.common.emitKind.value.outputMapping
          : []
      ).toEqual([0, 1, 2]);
    }
  });

  it('keeps semantic plan determinism separate from fresh sidecar identity allocation', () => {
    const first = encodeDvtSubstraitUnionAllDocument(fixture());
    const second = encodeDvtSubstraitUnionAllDocument(fixture());

    expect(first.semanticPlan.sha256).toBe(second.semanticPlan.sha256);
    expect(first.sidecar.relations.map((relation) => relation.relationId)).not.toEqual(
      second.sidecar.relations.map((relation) => relation.relationId)
    );
    expect(first.sidecar.fields.map((field) => field.fieldId)).not.toEqual(
      second.sidecar.fields.map((field) => field.fieldId)
    );
  });

  it('round-trips one persisted revision without changing identity', () => {
    const draft = fixture();
    const encoded = encodeDvtSubstraitUnionAllDocument(draft);
    const reopened = decodeDvtSubstraitUnionAllDocument(encoded);

    expect(reopened.sidecar.relations).toEqual(encoded.sidecar.relations);
    expect(reopened.sidecar.fields).toEqual(encoded.sidecar.fields);
    expect(encodeDvtSubstraitUnionAllDocument(reopened)).toEqual(encoded);
  });

  it('preserves FieldIds through rename/reorder and allocates fresh identity on delete+recreate', () => {
    const draft = fixture();
    const before = inspectBase(draft);
    const countryId = outputByKey(before, 'country').fieldId;
    const nameId = outputByKey(before, 'name').fieldId;

    let edited = applyDvtSubstraitUnionAllFieldEdit(draft, {
      kind: 'rename',
      fieldKey: 'country',
      outputName: 'region',
    });
    edited = applyDvtSubstraitUnionAllFieldEdit(edited, {
      kind: 'move',
      fieldKey: 'country',
      direction: 'up',
    });
    const moved = inspectBase(edited);
    expect(outputByKey(moved, 'country').fieldId).toBe(countryId);
    expect(outputByKey(moved, 'country').name).toBe('region');
    expect(outputByKey(moved, 'name').fieldId).toBe(nameId);

    const removed = applyDvtSubstraitUnionAllFieldEdit(edited, {
      kind: 'set-selected',
      fieldKey: 'name',
      selected: false,
    });
    const recreated = applyDvtSubstraitUnionAllFieldEdit(removed, {
      kind: 'set-selected',
      fieldKey: 'name',
      selected: true,
    });
    const after = inspectBase(recreated);
    expect(outputByKey(after, 'name').fieldId).toMatch(OPAQUE_FIELD_ID);
    expect(outputByKey(after, 'name').fieldId).not.toBe(nameId);
    expect(outputByKey(after, 'country').fieldId).toBe(countryId);
  });

  it('supports N inputs without turning Canvas node IDs into semantic identity', () => {
    const draft = createDvtSubstraitUnionAllDraft({
      inputs: [
        source('source-customers-north', 'customers_north'),
        source('source-customers-south', 'customers_south'),
        source('source-customers-west', 'customers_west'),
      ],
      targetNodeId: 'transform-all-customers',
    });
    const projection = inspectBase(draft);

    expect(projection.inputs).toHaveLength(3);
    expect(projection.inputs.map((input) => input.table)).toEqual([
      'customers_north',
      'customers_south',
      'customers_west',
    ]);
    expect(JSON.stringify(draft.sidecar)).not.toContain('source-customers-north');
    expect(JSON.stringify(draft.sidecar)).not.toContain('source-customers-south');
    expect(JSON.stringify(draft.sidecar)).not.toContain('transform-all-customers');
  });

  it('allocates aggregate/count and window/rank identities while preserving surviving outputs', () => {
    const draft = fixture();
    const base = inspectBase(draft);
    const grain = outputByKey(base, 'country');
    const resultRelationId = base.resultRelationId;

    const grouped = applyDvtSubstraitUnionAllGrouping(draft, {
      groupFieldId: grain.fieldId,
      countOutputName: 'customer_count',
    });
    const grouping = inspectDvtSubstraitUnionAllGroupingDraft(grouped);
    if (!grouping.ok) throw new Error('Expected UNION ALL grouping.');
    const countId = grouping.projection.measure.fieldId;
    expect(grouping.projection.groupField.fieldId).toBe(grain.fieldId);
    expect(countId).toMatch(OPAQUE_FIELD_ID);
    const aggregateRelation = grouped.sidecar.relations.find(
      (relation) =>
        !draft.sidecar.relations.some((before) => before.relationId === relation.relationId)
    );
    expect(aggregateRelation?.relationId).toMatch(OPAQUE_RELATION_ID);

    const renamedCount = renameDvtSubstraitUnionAllCountOutput(grouped, 'rows_total');
    const renamedGrouping = inspectDvtSubstraitUnionAllGroupingDraft(renamedCount);
    expect(renamedGrouping.ok && renamedGrouping.projection.measure.fieldId).toBe(countId);

    const ranked = applyDvtSubstraitUnionAllGroupedRowNumber(renamedCount, {
      outputName: 'count_rank',
    });
    const window = inspectDvtSubstraitUnionAllGroupedWindowDraft(ranked);
    if (!window.ok) throw new Error('Expected UNION ALL grouped window.');
    const rankId = window.projection.result.fieldId;
    expect(rankId).toMatch(OPAQUE_FIELD_ID);
    expect(rankId).not.toBe(countId);
    const renamedRank = renameDvtSubstraitUnionAllGroupedRowNumberOutput(ranked, 'ranked_group');
    const renamedWindow = inspectDvtSubstraitUnionAllGroupedWindowDraft(renamedRank);
    expect(renamedWindow.ok && renamedWindow.projection.result.fieldId).toBe(rankId);

    const restoredGrouped = removeDvtSubstraitUnionAllGroupedRowNumber(ranked);
    const restoredGrouping = inspectDvtSubstraitUnionAllGroupingDraft(restoredGrouped);
    expect(restoredGrouping.ok && restoredGrouping.projection.measure.fieldId).toBe(countId);
    const restoredBase = removeDvtSubstraitUnionAllGrouping(restoredGrouped);
    const restoredProjection = inspectBase(restoredBase);
    expect(outputByKey(restoredProjection, 'country').fieldId).toBe(grain.fieldId);
    expect(restoredProjection.resultRelationId).toBe(resultRelationId);
  });

  it('accepts old-format persisted IDs as opaque values and preserves them through edit/reload', () => {
    const legacy = legacyDraft(fixture());
    const before = inspectBase(legacy);
    const countryId = outputByKey(before, 'country').fieldId;

    const renamed = applyDvtSubstraitUnionAllFieldEdit(legacy, {
      kind: 'rename',
      fieldKey: 'country',
      outputName: 'region',
    });
    const renamedProjection = inspectBase(renamed);
    expect(outputByKey(renamedProjection, 'country').fieldId).toBe(countryId);

    const reopened = decodeDvtSubstraitUnionAllDocument(
      encodeDvtSubstraitUnionAllDocument(renamed)
    );
    expect(outputByKey(inspectBase(reopened), 'country').fieldId).toBe(countryId);
    expect(
      reopened.sidecar.relations.some((relation) =>
        relation.relationId.startsWith('relation:legacy-')
      )
    ).toBe(true);
  });

  it('resolves persisted semantic inputs from graph context without reading node IDs from RelationId', () => {
    const north = sourceNode('north-node', 'customers_north');
    const south = sourceNode('south-node', 'customers_south');
    const draft = fixture();
    const target = applyDvtNodeAuthoringMetadata(targetNode(), {
      kind: 'transform',
      mode: DVT_TRANSFORM_AUTHORING_MODE.substrait,
      shape: 'union_all',
      plan: draft.plan,
      sidecar: draft.sidecar,
    });
    const edges = [inputEdge('south-union', south.id), inputEdge('north-union', north.id)];

    const entry = resolveDvtSubstraitUnionAllEntry({
      targetNode: target,
      nodes: [north, south, target],
      edges,
      requirePersistedAuthority: true,
    });
    expect(entry?.inputs.map((input) => input.nodeId)).toEqual(['north-node', 'south-node']);
    expect(entry?.targetNodeId).toBe(target.id);
  });

  it('fails closed on incompatible graph sources, duplicate sidecar identity, and stale hashes', () => {
    expect(() =>
      createDvtSubstraitUnionAllDraft({
        inputs: [
          source('north', 'customers_north', 'warehouse-a'),
          source('south', 'customers_south', 'warehouse-b'),
        ],
        targetNodeId: 'transform-all-customers',
      })
    ).toThrow();

    const draft = fixture();
    const duplicateField: DvtSubstraitUnionAllDraft = {
      ...draft,
      sidecar: {
        ...draft.sidecar,
        fields: draft.sidecar.fields.map((field, index) =>
          index === 1 ? { ...field, fieldId: draft.sidecar.fields[0]!.fieldId } : field
        ),
      },
    };
    expect(inspectDvtSubstraitUnionAllDraft(duplicateField).ok).toBe(false);

    const encoded = encodeDvtSubstraitUnionAllDocument(draft);
    expect(() =>
      decodeDvtSubstraitUnionAllDocument({
        ...encoded,
        sidecar: { ...encoded.sidecar, semanticPlanSha256: 'f'.repeat(64) },
      })
    ).toThrow();
  });

  it('presents the actual allocated output IDs instead of reconstructing names', () => {
    let draft = fixture();
    const base = inspectBase(draft);
    const countryId = outputByKey(base, 'country').fieldId;
    draft = applyDvtSubstraitUnionAllGrouping(draft, {
      groupFieldId: countryId,
      countOutputName: 'customer_count',
    });
    const grouping = inspectDvtSubstraitUnionAllGroupingDraft(draft);
    if (!grouping.ok) throw new Error('Expected grouping.');
    const countId = grouping.projection.measure.fieldId;
    draft = applyDvtSubstraitUnionAllGroupedRowNumber(draft, { outputName: 'count_rank' });
    const window = inspectDvtSubstraitUnionAllGroupedWindowDraft(draft);
    if (!window.ok) throw new Error('Expected grouped window.');
    const rankId = window.projection.result.fieldId;

    const persisted = applyDvtNodeAuthoringMetadata(targetNode(), {
      kind: 'transform',
      mode: DVT_TRANSFORM_AUTHORING_MODE.substrait,
      shape: 'union_all',
      plan: draft.plan,
      sidecar: draft.sidecar,
    });
    expect(createDvtNodeAuthoringMetadata(persisted)).toMatchObject({
      kind: 'transform',
      mode: DVT_TRANSFORM_AUTHORING_MODE.substrait,
      shape: 'union_all',
    });
    expect(
      projectCanvasNodePresentationTruth({ node: persisted, nodes: [persisted], edges: [] }).columns
        .visible
    ).toMatchObject([
      { name: 'country', reference: countryId },
      { name: 'customer_count', reference: countId },
      { name: 'count_rank', reference: rankId },
    ]);
  });
});

describe('UNION ALL reference-backed Canvas lineage', () => {
  it.each(['base', 'grouping', 'window'] as const)(
    'projects every input for %s and rejects disconnected or ambiguous provenance',
    (shape) => {
      const base = fixture();
      const baseProjection = inspectBase(base);
      const country = outputByKey(baseProjection, 'country');
      const grouped = applyDvtSubstraitUnionAllGrouping(base, {
        groupFieldId: country.fieldId,
        countOutputName: 'customer_count',
      });
      const draft =
        shape === 'base'
          ? base
          : shape === 'grouping'
            ? grouped
            : applyDvtSubstraitUnionAllGroupedRowNumber(grouped, { outputName: 'row_number' });
      const north = sourceNode('north-node', 'customers_north');
      const south = sourceNode('south-node', 'customers_south');
      const target = applyDvtNodeAuthoringMetadata(targetNode(), {
        kind: 'transform',
        mode: DVT_TRANSFORM_AUTHORING_MODE.substrait,
        shape: 'union_all',
        plan: draft.plan,
        sidecar: draft.sidecar,
      });
      const nodes = [north, south, target];
      const edges = [inputEdge('south-union', south.id), inputEdge('north-union', north.id)];
      const expandedNodeIds = new Set(nodes.map((node) => node.id));
      const lineage = projectCanvasColumnLineage({ nodes, edges, expandedNodeIds });
      const outputs = shape === 'base' ? baseProjection.outputs : [country];
      expect(lineage).toHaveLength(outputs.length * 2);
      for (const [index, source] of [north, south].entries()) {
        for (const output of outputs) {
          expect(lineage).toContainEqual(
            expect.objectContaining({
              source: source.id,
              target: target.id,
              data: expect.objectContaining({
                sourceFieldId: baseProjection.inputs[index]!.fields.find(
                  (field) => field.name === output.fieldKey
                )!.fieldId,
                outputId: output.fieldId,
              }),
            })
          );
        }
      }
      expect(projectCanvasColumnLineage({ nodes, edges: edges.slice(1), expandedNodeIds })).toEqual(
        []
      );
      const duplicate = { ...north, id: 'ambiguous-north' };
      expect(
        projectCanvasColumnLineage({
          nodes: [...nodes, duplicate],
          edges: [...edges, inputEdge('duplicate-union', duplicate.id)],
          expandedNodeIds: new Set([...expandedNodeIds, duplicate.id]),
        })
      ).toEqual([]);
    }
  );
});
