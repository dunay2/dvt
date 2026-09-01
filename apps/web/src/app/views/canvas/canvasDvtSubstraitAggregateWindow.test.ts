import { SortField_SortDirection } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import {
  createDvtSubstraitPilotDraft,
  decodeDvtSubstraitPilotDocument,
  encodeDvtSubstraitPilotDocument,
  type DvtSubstraitPilotDraft,
} from './canvasDvtSubstraitPilot';
import { applyDvtSubstraitPilotAggregation } from './canvasDvtSubstraitAggregation';
import {
  applyDvtSubstraitPilotAggregateRowNumber,
  inspectDvtSubstraitPilotAggregateWindowDraft,
  removeDvtSubstraitPilotAggregateRowNumber,
  renameDvtSubstraitPilotAggregateRowNumberOutput,
} from './canvasDvtSubstraitAggregateWindow';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { projectCanvasNodePresentationTruth } from './canvasNodePresentationProjection';

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

describe('VTX2 typed Substrait aggregate and window composition', () => {
  it('persists grouped rows ranked globally by their count in one relation tree', () => {
    const grouped = groupedDraft();
    const ranked = applyDvtSubstraitPilotAggregateRowNumber(grouped, {
      outputName: 'count_rank',
    });
    const reopened = decodeDvtSubstraitPilotDocument(encodeDvtSubstraitPilotDocument(ranked));

    expect(inspectDvtSubstraitPilotAggregateWindowDraft(reopened)).toEqual({
      ok: true,
      projection: {
        sourceName: 'customers',
        groupField: {
          name: 'country',
          fieldId: 'field:transform-customers:country',
          inputOrdinal: 0,
        },
        measure: {
          name: 'customer_count',
          fieldId: 'field:transform-customers:count',
          inputOrdinal: 1,
        },
        result: {
          name: 'count_rank',
          fieldId: 'field:transform-customers:aggregate-row-number',
          capabilityId:
            'substrait/simple-extension/window-function/extension%3Aio.substrait%3Afunctions_arithmetic/row_number',
        },
        outputs: [
          {
            name: 'country',
            fieldId: 'field:transform-customers:country',
            outputOrdinal: 0,
          },
          {
            name: 'customer_count',
            fieldId: 'field:transform-customers:count',
            outputOrdinal: 1,
          },
          {
            name: 'count_rank',
            fieldId: 'field:transform-customers:aggregate-row-number',
            outputOrdinal: 2,
          },
        ],
      },
    });

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

  it('renames and removes only the window while preserving the grouped revision and identities', () => {
    const grouped = groupedDraft();
    const ranked = applyDvtSubstraitPilotAggregateRowNumber(grouped, {
      outputName: 'count_rank',
    });
    const renamed = renameDvtSubstraitPilotAggregateRowNumberOutput(ranked, 'country_rank');

    expect(inspectDvtSubstraitPilotAggregateWindowDraft(renamed)).toMatchObject({
      ok: true,
      projection: {
        result: {
          name: 'country_rank',
          fieldId: 'field:transform-customers:aggregate-row-number',
        },
      },
    });
    expect(
      encodeDvtSubstraitPilotDocument(removeDvtSubstraitPilotAggregateRowNumber(renamed))
    ).toEqual(encodeDvtSubstraitPilotDocument(grouped));
  });

  it('projects grain, count and rank fields on the Transform card from the same Plan', () => {
    const ranked = applyDvtSubstraitPilotAggregateRowNumber(groupedDraft(), {
      outputName: 'count_rank',
    });
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
      ['country', 'field:transform-customers:country'],
      ['customer_count', 'field:transform-customers:count'],
      ['count_rank', 'field:transform-customers:aggregate-row-number'],
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
    const resultBinding = staleBinding.sidecar.fields.find(
      (field) => field.fieldId === 'field:transform-customers:aggregate-row-number'
    );
    if (resultBinding == null) throw new Error('Expected the rank field binding.');
    resultBinding.relationId = 'relation:transform-customers:aggregate';
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
