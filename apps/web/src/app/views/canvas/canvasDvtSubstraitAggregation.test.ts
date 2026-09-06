import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';

import {
  createDvtSubstraitPilotDraft,
  decodeDvtSubstraitPilotDocument,
  encodeDvtSubstraitPilotDocument,
  inspectDvtSubstraitPilotDraft,
  type DvtSubstraitPilotDraft,
} from './canvasDvtSubstraitPilot';
import {
  applyDvtSubstraitPilotAggregation,
  inspectDvtSubstraitPilotAggregationDraft,
  removeDvtSubstraitPilotAggregation,
  renameDvtSubstraitPilotCountOutput,
  type DvtSubstraitPilotAggregationProjection,
} from './canvasDvtSubstraitAggregation';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { projectCanvasNodePresentationTruth } from './canvasNodePresentationProjection';

const UUID_V7 = '[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
const DVT_FIELD_ID = new RegExp(`^dvt_fld_${UUID_V7}$`, 'i');
const DVT_RELATION_ID = new RegExp(`^dvt_rel_${UUID_V7}$`, 'i');

type PilotField = Readonly<{ name: string; fieldId: string; outputOrdinal: number }>;

function pilot(): DvtSubstraitPilotDraft {
  return createDvtSubstraitPilotDraft({
    sourceNodeId: 'source-customers',
    targetNodeId: 'transform-customers',
  });
}

function requireAggregation(draft: DvtSubstraitPilotDraft): DvtSubstraitPilotAggregationProjection {
  const inspection = inspectDvtSubstraitPilotAggregationDraft(draft);
  if (!inspection.ok) throw new Error('Expected an admitted aggregation.');
  return inspection.projection;
}

function requirePilotField(draft: DvtSubstraitPilotDraft, name: string): PilotField {
  const inspection = inspectDvtSubstraitPilotDraft(draft);
  if (!inspection.ok) throw new Error('Expected the admitted pilot.');
  const field = inspection.projection.outputs.find((output) => output.name === name);
  if (field == null) throw new Error(`Expected pilot field ${name}.`);
  return field;
}

function aggregateRelationId(draft: DvtSubstraitPilotDraft): string {
  const root = draft.plan.relations[0]?.relType;
  if (root?.case !== 'root' || root.value.input?.relType.case !== 'aggregate') {
    throw new Error('Expected AggregateRel.');
  }
  const anchor = root.value.input.relType.value.common?.relAnchor;
  const binding = draft.sidecar.relations.find((relation) => relation.relAnchor === anchor);
  if (binding == null) throw new Error('Expected aggregate relation binding.');
  return binding.relationId;
}

describe('VTX2 typed Substrait grouping and count', () => {
  it('allocates opaque aggregate/count identities and persists them unchanged', () => {
    const initial = pilot();
    const country = requirePilotField(initial, 'country');

    const grouped = applyDvtSubstraitPilotAggregation(initial, {
      groupFieldId: country.fieldId,
      countOutputName: 'customer_count',
    });
    const projection = requireAggregation(grouped);
    expect(aggregateRelationId(grouped)).toMatch(DVT_RELATION_ID);
    expect(projection.measure.fieldId).toMatch(DVT_FIELD_ID);
    expect(projection.measure.fieldId).not.toBe(country.fieldId);

    const persisted = encodeDvtSubstraitPilotDocument(grouped);
    const reopened = decodeDvtSubstraitPilotDocument(persisted);
    expect(requireAggregation(reopened)).toEqual(projection);
    expect(persisted.sidecar.semanticPlanSha256).toBe(persisted.semanticPlan.sha256);
    expect(reopened.plan.relations[0]?.relType.case).toBe('root');
    const root = reopened.plan.relations[0]?.relType;
    expect(root?.case === 'root' ? root.value.input?.relType.case : null).toBe('aggregate');
  });

  it('renames the count output without changing its FieldId or aggregate RelationId', () => {
    const initial = pilot();
    const email = requirePilotField(initial, 'email');

    const grouped = applyDvtSubstraitPilotAggregation(initial, {
      groupFieldId: email.fieldId,
      countOutputName: 'row_count',
    });
    const before = requireAggregation(grouped);
    const relationId = aggregateRelationId(grouped);
    const renamed = renameDvtSubstraitPilotCountOutput(grouped, 'email_count');
    const after = requireAggregation(renamed);
    expect(after.measure).toMatchObject({ name: 'email_count', fieldId: before.measure.fieldId });
    expect(aggregateRelationId(renamed)).toBe(relationId);

    const restored = removeDvtSubstraitPilotAggregation(renamed);
    expect(inspectDvtSubstraitPilotDraft(restored)).toMatchObject({
      ok: true,
      projection: {
        outputs: expect.arrayContaining([
          { name: 'email', fieldId: email.fieldId, outputOrdinal: 1 },
        ]),
      },
    });
  });

  it('treats persisted legacy aggregate/count IDs as opaque values', () => {
    const initial = pilot();
    const country = requirePilotField(initial, 'country');
    const grouped = applyDvtSubstraitPilotAggregation(initial, {
      groupFieldId: country.fieldId,
      countOutputName: 'customer_count',
    });
    const current = requireAggregation(grouped);
    const currentRelationId = aggregateRelationId(grouped);
    const legacyRelationId = 'relation:transform-customers:aggregate';
    const legacyMeasureId = 'field:transform-customers:count';
    const legacy: DvtSubstraitPilotDraft = {
      plan: grouped.plan,
      sidecar: {
        ...grouped.sidecar,
        relations: grouped.sidecar.relations.map((relation) =>
          relation.relationId === currentRelationId
            ? { ...relation, relationId: legacyRelationId }
            : relation
        ),
        fields: grouped.sidecar.fields.map((field) => ({
          ...field,
          relationId: field.relationId === currentRelationId ? legacyRelationId : field.relationId,
          fieldId: field.fieldId === current.measure.fieldId ? legacyMeasureId : field.fieldId,
        })),
      },
    };

    expect(requireAggregation(legacy).measure.fieldId).toBe(legacyMeasureId);
    const renamed = renameDvtSubstraitPilotCountOutput(legacy, 'renamed_count');
    expect(requireAggregation(renamed).measure).toMatchObject({
      name: 'renamed_count',
      fieldId: legacyMeasureId,
    });
    expect(aggregateRelationId(renamed)).toBe(legacyRelationId);
    expect(inspectDvtSubstraitPilotDraft(removeDvtSubstraitPilotAggregation(renamed)).ok).toBe(
      true
    );
  });

  it('fails closed for an unadmitted grouping-set shape', () => {
    const initial = pilot();
    const country = requirePilotField(initial, 'country');
    const grouped = applyDvtSubstraitPilotAggregation(initial, {
      groupFieldId: country.fieldId,
      countOutputName: 'customer_count',
    });
    const root = grouped.plan.relations[0]?.relType;
    if (root?.case !== 'root' || root.value.input?.relType.case !== 'aggregate') {
      throw new Error('Expected AggregateRel.');
    }
    root.value.input.relType.value.groupings.push(root.value.input.relType.value.groupings[0]!);

    expect(inspectDvtSubstraitPilotAggregationDraft(grouped)).toEqual({ ok: false });
    expect(removeDvtSubstraitPilotAggregation(grouped)).toBe(grouped);
  });

  it('projects aggregate outputs on the Transform card from the persisted Plan', () => {
    const initial = pilot();
    const country = requirePilotField(initial, 'country');
    const grouped = applyDvtSubstraitPilotAggregation(initial, {
      groupFieldId: country.fieldId,
      countOutputName: 'customer_count',
    });
    const projection = requireAggregation(grouped);
    const transform = applyDvtSubstraitSemanticDocument(
      {
        id: 'transform-customers',
        name: 'Customers summary',
        pluginId: 'dvt',
        kind: 'dvt:transform',
        role: 'transform',
        status: 'idle',
        tags: ['authoring'],
        metadata: {},
      },
      encodeDvtSubstraitPilotDocument(grouped)
    );
    const source: CanonicalNode = {
      id: 'source-customers',
      name: 'customers',
      pluginId: 'dvt',
      kind: 'dvt:source',
      role: 'input',
      status: 'idle',
      tags: [],
      metadata: {
        columns: ['name', 'email', 'country'].map((name) => ({ name, type: 'string' })),
      },
    };

    const truth = projectCanvasNodePresentationTruth({
      node: transform,
      nodes: [source, transform],
      edges: [{ sourceId: source.id, targetId: transform.id }],
    });
    expect(truth.columns.visible.map((column) => [column.name, column.reference])).toEqual([
      ['country', projection.groupField.fieldId],
      ['customer_count', projection.measure.fieldId],
    ]);
  });
});
