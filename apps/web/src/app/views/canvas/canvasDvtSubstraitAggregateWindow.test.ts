import { SortField_SortDirection } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import {
  createDvtSubstraitPilotDraft,
  decodeDvtSubstraitPilotDocument,
  encodeDvtSubstraitPilotDocument,
  type DvtSubstraitPilotDraft,
} from './canvasDvtSubstraitPilot';
import {
  applyDvtSubstraitPilotAggregation,
  inspectDvtSubstraitPilotAggregationDraft,
} from './canvasDvtSubstraitAggregation';
import {
  applyDvtSubstraitPilotAggregateRowNumber,
  inspectDvtSubstraitPilotAggregateWindowDraft,
  removeDvtSubstraitPilotAggregateRowNumber,
  renameDvtSubstraitPilotAggregateRowNumberOutput,
  type DvtSubstraitPilotAggregateWindowProjection,
} from './canvasDvtSubstraitAggregateWindow';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { projectCanvasNodePresentationTruth } from './canvasNodePresentationProjection';

const UUID_V7 = '[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
const DVT_FIELD_ID = new RegExp(`^dvt_fld_${UUID_V7}$`, 'i');
const DVT_RELATION_ID = new RegExp(`^dvt_rel_${UUID_V7}$`, 'i');

function groupedDraft(): DvtSubstraitPilotDraft {
  return applyDvtSubstraitPilotAggregation(
    createDvtSubstraitPilotDraft({
      sourceNodeId: 'source-customers',
      targetNodeId: 'transform-customers',
    }),
    {
      groupFieldId: 'field:transform-customers:country',
      countOutputName: 'customer_count',
    }
  );
}

function requireAggregateWindow(
  draft: DvtSubstraitPilotDraft
): DvtSubstraitPilotAggregateWindowProjection {
  const inspection = inspectDvtSubstraitPilotAggregateWindowDraft(draft);
  if (!inspection.ok) throw new Error('Expected admitted aggregate-window composition.');
  return inspection.projection;
}

function relationIdAtRootProject(draft: DvtSubstraitPilotDraft): string {
  const root = draft.plan.relations[0]?.relType;
  if (root?.case !== 'root' || root.value.input?.relType.case !== 'project') {
    throw new Error('Expected outer ProjectRel.');
  }
  const anchor = root.value.input.relType.value.common?.relAnchor;
  const binding = draft.sidecar.relations.find((relation) => relation.relAnchor === anchor);
  if (binding == null) throw new Error('Expected outer relation binding.');
  return binding.relationId;
}

function aggregateRelationId(draft: DvtSubstraitPilotDraft): string {
  const root = draft.plan.relations[0]?.relType;
  const aggregate =
    root?.case === 'root' && root.value.input?.relType.case === 'project'
      ? root.value.input.relType.value.input?.relType
      : root?.case === 'root'
        ? root.value.input?.relType
        : undefined;
  if (aggregate?.case !== 'aggregate') throw new Error('Expected AggregateRel.');
  const anchor = aggregate.value.common?.relAnchor;
  const binding = draft.sidecar.relations.find((relation) => relation.relAnchor === anchor);
  if (binding == null) throw new Error('Expected aggregate relation binding.');
  return binding.relationId;
}

describe('VTX2 typed Substrait aggregate and window composition', () => {
  it('allocates opaque outer relation/result identities and persists the full composition', () => {
    const grouped = groupedDraft();
    const groupedInspection = inspectDvtSubstraitPilotAggregationDraft(grouped);
    if (!groupedInspection.ok) throw new Error('Expected grouped draft.');
    expect(groupedInspection.projection.measure.fieldId).toMatch(DVT_FIELD_ID);
    expect(aggregateRelationId(grouped)).toMatch(DVT_RELATION_ID);

    const ranked = applyDvtSubstraitPilotAggregateRowNumber(grouped, {
      outputName: 'count_rank',
    });
    const projection = requireAggregateWindow(ranked);
    expect(relationIdAtRootProject(ranked)).toMatch(DVT_RELATION_ID);
    expect(projection.result.fieldId).toMatch(DVT_FIELD_ID);
    expect(projection.measure.fieldId).toBe(groupedInspection.projection.measure.fieldId);

    const reopened = decodeDvtSubstraitPilotDocument(encodeDvtSubstraitPilotDocument(ranked));
    expect(requireAggregateWindow(reopened)).toEqual(projection);

    const root = reopened.plan.relations[0]?.relType;
    expect(root?.case === 'root' ? root.value.input?.relType.case : null).toBe('project');
    const outerProject = root?.case === 'root' ? root.value.input?.relType : null;
    expect(outerProject?.case === 'project' ? outerProject.value.input?.relType.case : null).toBe(
      'aggregate'
    );
    const expression =
      outerProject?.case === 'project' ? outerProject.value.expressions[0]?.rexType : null;
    expect(
      expression?.case === 'windowFunction'
        ? expression.value.sorts.map((sort) => ({
            ordinal:
              sort.expr?.rexType.case === 'selection' &&
              sort.expr.rexType.value.referenceType.case === 'directReference' &&
              sort.expr.rexType.value.referenceType.value.referenceType.case === 'structField'
                ? sort.expr.rexType.value.referenceType.value.referenceType.value.field
                : null,
            direction: sort.sortKind.case === 'direction' ? sort.sortKind.value : null,
          }))
        : null
    ).toEqual([
      { ordinal: 1, direction: SortField_SortDirection.DESC_NULLS_LAST },
      { ordinal: 0, direction: SortField_SortDirection.ASC_NULLS_LAST },
    ]);
  });

  it('renames and removes only the window while preserving grouped and result identities', () => {
    const grouped = groupedDraft();
    const ranked = applyDvtSubstraitPilotAggregateRowNumber(grouped, {
      outputName: 'count_rank',
    });
    const before = requireAggregateWindow(ranked);
    const outerRelationId = relationIdAtRootProject(ranked);
    const renamed = renameDvtSubstraitPilotAggregateRowNumberOutput(ranked, 'country_rank');
    const after = requireAggregateWindow(renamed);

    expect(after.result).toMatchObject({
      name: 'country_rank',
      fieldId: before.result.fieldId,
    });
    expect(relationIdAtRootProject(renamed)).toBe(outerRelationId);
    expect(
      encodeDvtSubstraitPilotDocument(removeDvtSubstraitPilotAggregateRowNumber(renamed))
    ).toEqual(encodeDvtSubstraitPilotDocument(grouped));
  });

  it('can compose over legacy aggregate/count identities without parsing their strings', () => {
    const grouped = groupedDraft();
    const groupedInspection = inspectDvtSubstraitPilotAggregationDraft(grouped);
    if (!groupedInspection.ok) throw new Error('Expected grouped draft.');
    const currentAggregateId = aggregateRelationId(grouped);
    const legacyAggregateId = 'relation:transform-customers:aggregate';
    const legacyCountId = 'field:transform-customers:count';
    const legacyGrouped: DvtSubstraitPilotDraft = {
      plan: grouped.plan,
      sidecar: {
        ...grouped.sidecar,
        relations: grouped.sidecar.relations.map((relation) =>
          relation.relationId === currentAggregateId
            ? { ...relation, relationId: legacyAggregateId }
            : relation
        ),
        fields: grouped.sidecar.fields.map((field) => ({
          ...field,
          relationId:
            field.relationId === currentAggregateId ? legacyAggregateId : field.relationId,
          fieldId:
            field.fieldId === groupedInspection.projection.measure.fieldId
              ? legacyCountId
              : field.fieldId,
        })),
      },
    };
    const legacyInspection = inspectDvtSubstraitPilotAggregationDraft(legacyGrouped);
    expect(legacyInspection.ok).toBe(true);

    const ranked = applyDvtSubstraitPilotAggregateRowNumber(legacyGrouped, {
      outputName: 'count_rank',
    });
    const projection = requireAggregateWindow(ranked);
    expect(projection.measure.fieldId).toBe(legacyCountId);
    expect(projection.result.fieldId).toMatch(DVT_FIELD_ID);
    expect(relationIdAtRootProject(ranked)).toMatch(DVT_RELATION_ID);
    expect(aggregateRelationId(ranked)).toBe(legacyAggregateId);
  });

  it('projects grain, count and rank fields on the Transform card from the same Plan', () => {
    const ranked = applyDvtSubstraitPilotAggregateRowNumber(groupedDraft(), {
      outputName: 'count_rank',
    });
    const projection = requireAggregateWindow(ranked);
    const transform = applyDvtSubstraitSemanticDocument(
      {
        id: 'transform-customers',
        name: 'Customers ranked summary',
        pluginId: 'dvt',
        kind: 'dvt:transform',
        role: 'transform',
        status: 'idle',
        tags: ['authoring'],
        metadata: {},
      },
      encodeDvtSubstraitPilotDocument(ranked)
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
      ['count_rank', projection.result.fieldId],
    ]);
  });

  it('fails closed for partitioned or wrongly ordered post-aggregate windows', () => {
    const ranked = applyDvtSubstraitPilotAggregateRowNumber(groupedDraft(), {
      outputName: 'count_rank',
    });
    const root = ranked.plan.relations[0]?.relType;
    if (root?.case !== 'root' || root.value.input?.relType.case !== 'project') {
      throw new Error('Expected the outer ProjectRel.');
    }
    const expression = root.value.input.relType.value.expressions[0]?.rexType;
    if (expression?.case !== 'windowFunction') throw new Error('Expected WindowFunction.');

    expression.value.partitions.push(expression.value.sorts[0]!.expr!);
    expect(inspectDvtSubstraitPilotAggregateWindowDraft(ranked)).toEqual({ ok: false });

    expression.value.partitions = [];
    expression.value.sorts[0]!.sortKind = {
      case: 'direction',
      value: SortField_SortDirection.ASC_NULLS_LAST,
    };
    expect(inspectDvtSubstraitPilotAggregateWindowDraft(ranked)).toEqual({ ok: false });

    expression.value.sorts[0]!.sortKind = {
      case: 'direction',
      value: SortField_SortDirection.DESC_NULLS_LAST,
    };
    expression.value.sorts.pop();
    expect(inspectDvtSubstraitPilotAggregateWindowDraft(ranked)).toEqual({ ok: false });
    expect(removeDvtSubstraitPilotAggregateRowNumber(ranked)).toBe(ranked);
  });

  it('fails closed for stale sidecar bindings and malformed outer emit mappings', () => {
    const staleBinding = applyDvtSubstraitPilotAggregateRowNumber(groupedDraft(), {
      outputName: 'count_rank',
    });
    const staleProjection = requireAggregateWindow(staleBinding);
    const resultBinding = staleBinding.sidecar.fields.find(
      (field) => field.fieldId === staleProjection.result.fieldId
    );
    if (resultBinding == null) throw new Error('Expected the rank field binding.');
    resultBinding.relationId = aggregateRelationId(staleBinding);
    expect(inspectDvtSubstraitPilotAggregateWindowDraft(staleBinding)).toEqual({ ok: false });

    const malformedEmit = applyDvtSubstraitPilotAggregateRowNumber(groupedDraft(), {
      outputName: 'count_rank',
    });
    const root = malformedEmit.plan.relations[0]?.relType;
    if (
      root?.case !== 'root' ||
      root.value.input?.relType.case !== 'project' ||
      root.value.input.relType.value.common?.emitKind.case !== 'emit'
    ) {
      throw new Error('Expected the outer ProjectRel emit mapping.');
    }
    root.value.input.relType.value.common.emitKind.value.outputMapping = [0, 2, 1];
    expect(inspectDvtSubstraitPilotAggregateWindowDraft(malformedEmit)).toEqual({ ok: false });
  });
});
