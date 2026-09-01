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
} from './canvasDvtSubstraitAggregation';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { projectCanvasNodePresentationTruth } from './canvasNodePresentationProjection';

function pilot(): DvtSubstraitPilotDraft {
  return createDvtSubstraitPilotDraft({
    sourceNodeId: 'source-customers',
    targetNodeId: 'transform-customers',
  });
}

describe('VTX2 typed Substrait grouping and count', () => {
  it('persists one grain field and count measure with stable field identity', () => {
    const initial = pilot();
    const base = inspectDvtSubstraitPilotDraft(initial);
    if (!base.ok) throw new Error('Expected the admitted pilot.');
    const country = base.projection.outputs.find((output) => output.name === 'country');
    if (country == null) throw new Error('Expected the country field.');

    const grouped = applyDvtSubstraitPilotAggregation(initial, {
      groupFieldId: country.fieldId,
      countOutputName: 'customer_count',
    });
    const persisted = encodeDvtSubstraitPilotDocument(grouped);
    const reopened = decodeDvtSubstraitPilotDocument(persisted);

    expect(inspectDvtSubstraitPilotAggregationDraft(reopened)).toEqual({
      ok: true,
      projection: {
        sourceName: 'customers',
        groupField: {
          name: 'country',
          fieldId: country.fieldId,
          inputOrdinal: 2,
        },
        measure: {
          name: 'customer_count',
          fieldId: 'field:transform-customers:count',
          capabilityId:
            'substrait/simple-extension/aggregate-function/extension%3Aio.substrait%3Afunctions_aggregate_generic/count',
        },
        outputs: [
          { name: 'country', fieldId: country.fieldId, outputOrdinal: 0 },
          {
            name: 'customer_count',
            fieldId: 'field:transform-customers:count',
            outputOrdinal: 1,
          },
        ],
      },
    });
    expect(persisted.sidecar.semanticPlanSha256).toBe(persisted.semanticPlan.sha256);
    expect(reopened.plan.relations[0]?.relType.case).toBe('root');
    const root = reopened.plan.relations[0]?.relType;
    expect(root?.case === 'root' ? root.value.input?.relType.case : null).toBe('aggregate');
  });

  it('renames the count output and removes grouping without losing the grain FieldId', () => {
    const base = inspectDvtSubstraitPilotDraft(pilot());
    if (!base.ok) throw new Error('Expected the admitted pilot.');
    const email = base.projection.outputs.find((output) => output.name === 'email');
    if (email == null) throw new Error('Expected the email field.');

    const grouped = applyDvtSubstraitPilotAggregation(pilot(), {
      groupFieldId: email.fieldId,
      countOutputName: 'row_count',
    });
    const renamed = renameDvtSubstraitPilotCountOutput(grouped, 'email_count');
    expect(inspectDvtSubstraitPilotAggregationDraft(renamed)).toMatchObject({
      ok: true,
      projection: { measure: { name: 'email_count' } },
    });

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

  it('fails closed for an unadmitted grouping-set shape', () => {
    const base = inspectDvtSubstraitPilotDraft(pilot());
    if (!base.ok) throw new Error('Expected the admitted pilot.');
    const country = base.projection.outputs.find((output) => output.name === 'country');
    if (country == null) throw new Error('Expected the country field.');
    const grouped = applyDvtSubstraitPilotAggregation(pilot(), {
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
    const grouped = applyDvtSubstraitPilotAggregation(pilot(), {
      groupFieldId: 'field:transform-customers:country',
      countOutputName: 'customer_count',
    });
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
      ['country', 'field:transform-customers:country'],
      ['customer_count', 'field:transform-customers:count'],
    ]);
  });
});
