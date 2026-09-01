import {
  AggregateFunction_AggregationInvocation,
  AggregationPhase,
  type Expression_WindowFunction,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
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
  applyDvtSubstraitPilotRowNumber,
  inspectDvtSubstraitPilotWindowDraft,
  removeDvtSubstraitPilotRowNumber,
  renameDvtSubstraitPilotRowNumberOutput,
} from './canvasDvtSubstraitWindow';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { createDvtNodeAuthoringMetadata } from './canvasDvtAuthoringModel';
import { projectCanvasNodePresentationTruth } from './canvasNodePresentationProjection';

function pilot(): DvtSubstraitPilotDraft {
  return createDvtSubstraitPilotDraft({
    sourceNodeId: 'source-customers',
    targetNodeId: 'transform-customers',
  });
}

function withRowNumber(): DvtSubstraitPilotDraft {
  return applyDvtSubstraitPilotRowNumber(pilot(), {
    partitionFieldId: 'field:transform-customers:country',
    orderFieldId: 'field:transform-customers:name',
    outputName: 'country_row_number',
  });
}

function requireWindowFunction(draft: DvtSubstraitPilotDraft): Expression_WindowFunction {
  const root = draft.plan.relations[0]?.relType;
  if (root?.case !== 'root' || root.value.input?.relType.case !== 'project') {
    throw new Error('Expected ProjectRel.');
  }
  const expression = root.value.input.relType.value.expressions[1]?.rexType;
  if (expression?.case !== 'windowFunction') throw new Error('Expected WindowFunction.');
  return expression.value;
}

describe('VTX2 typed Substrait row-number window', () => {
  it('persists partition, ordering and row_number with stable field identity', () => {
    const persisted = encodeDvtSubstraitPilotDocument(withRowNumber());
    const reopened = decodeDvtSubstraitPilotDocument(persisted);

    expect(inspectDvtSubstraitPilotWindowDraft(reopened)).toEqual({
      ok: true,
      projection: {
        sourceName: 'customers',
        partitionField: {
          name: 'country',
          fieldId: 'field:transform-customers:country',
          inputOrdinal: 2,
        },
        orderField: {
          name: 'name',
          fieldId: 'field:transform-customers:name',
          inputOrdinal: 0,
        },
        result: {
          name: 'country_row_number',
          fieldId: 'field:transform-customers:row-number',
          capabilityId:
            'substrait/simple-extension/window-function/extension%3Aio.substrait%3Afunctions_arithmetic/row_number',
        },
        outputs: [
          { name: 'name', fieldId: 'field:transform-customers:name', outputOrdinal: 0 },
          { name: 'email', fieldId: 'field:transform-customers:email', outputOrdinal: 1 },
          { name: 'country', fieldId: 'field:transform-customers:country', outputOrdinal: 2 },
          {
            name: 'country_row_number',
            fieldId: 'field:transform-customers:row-number',
            outputOrdinal: 3,
          },
        ],
      },
    });
    expect(persisted.sidecar.semanticPlanSha256).toBe(persisted.semanticPlan.sha256);
  });

  it('renames and removes the window without changing existing FieldIds', () => {
    const renamed = renameDvtSubstraitPilotRowNumberOutput(withRowNumber(), 'row_in_country');
    expect(inspectDvtSubstraitPilotWindowDraft(renamed)).toMatchObject({
      ok: true,
      projection: { result: { name: 'row_in_country' } },
    });

    const restored = removeDvtSubstraitPilotRowNumber(renamed);
    expect(inspectDvtSubstraitPilotDraft(restored)).toMatchObject({
      ok: true,
      projection: {
        outputs: [
          { name: 'name', fieldId: 'field:transform-customers:name', outputOrdinal: 0 },
          { name: 'email', fieldId: 'field:transform-customers:email', outputOrdinal: 1 },
          { name: 'country', fieldId: 'field:transform-customers:country', outputOrdinal: 2 },
        ],
      },
    });
  });

  it('fails closed for a wrong function signature, direction or frame', () => {
    const wrongSignature = withRowNumber();
    const project = wrongSignature.plan.relations[0]?.relType;
    if (project?.case !== 'root' || project.value.input?.relType.case !== 'project') {
      throw new Error('Expected ProjectRel.');
    }
    const window = project.value.input.relType.value.expressions[1]?.rexType;
    if (window?.case !== 'windowFunction') throw new Error('Expected WindowFunction.');
    window.value.arguments.push({} as never);
    expect(inspectDvtSubstraitPilotWindowDraft(wrongSignature)).toEqual({ ok: false });

    const wrongDirection = withRowNumber();
    const wrongDirectionRoot = wrongDirection.plan.relations[0]?.relType;
    if (
      wrongDirectionRoot?.case !== 'root' ||
      wrongDirectionRoot.value.input?.relType.case !== 'project'
    ) {
      throw new Error('Expected ProjectRel.');
    }
    const wrongDirectionWindow =
      wrongDirectionRoot.value.input.relType.value.expressions[1]?.rexType;
    if (wrongDirectionWindow?.case !== 'windowFunction') {
      throw new Error('Expected WindowFunction.');
    }
    wrongDirectionWindow.value.sorts[0]!.sortKind = {
      case: 'comparisonFunctionReference',
      value: 99,
    };
    expect(inspectDvtSubstraitPilotWindowDraft(wrongDirection)).toEqual({ ok: false });

    const framed = withRowNumber();
    const framedRoot = framed.plan.relations[0]?.relType;
    if (framedRoot?.case !== 'root' || framedRoot.value.input?.relType.case !== 'project') {
      throw new Error('Expected ProjectRel.');
    }
    const framedWindow = framedRoot.value.input.relType.value.expressions[1]?.rexType;
    if (framedWindow?.case !== 'windowFunction') throw new Error('Expected WindowFunction.');
    framedWindow.value.boundsType = 1;
    expect(inspectDvtSubstraitPilotWindowDraft(framed)).toEqual({ ok: false });
  });

  it.each([
    [
      'URN',
      (draft: DvtSubstraitPilotDraft) => {
        const urn = draft.plan.extensionUrns.find(
          (entry) => entry.urn === 'extension:io.substrait:functions_arithmetic'
        );
        if (urn == null) throw new Error('Expected row_number URN.');
        urn.urn = 'extension:io.substrait:functions_string';
      },
    ],
    [
      'function name',
      (draft: DvtSubstraitPilotDraft) => {
        const declaration = draft.plan.extensions.find(
          (entry) => entry.mappingType.case === 'extensionFunction'
        );
        if (declaration?.mappingType.case !== 'extensionFunction') {
          throw new Error('Expected function declaration.');
        }
        declaration.mappingType.value.name = 'rank';
      },
    ],
    [
      'output type',
      (draft: DvtSubstraitPilotDraft) => {
        const fn = requireWindowFunction(draft);
        fn.outputType = undefined;
      },
    ],
    [
      'phase',
      (draft: DvtSubstraitPilotDraft) => {
        requireWindowFunction(draft).phase = AggregationPhase.UNSPECIFIED;
      },
    ],
    [
      'invocation',
      (draft: DvtSubstraitPilotDraft) => {
        requireWindowFunction(draft).invocation = AggregateFunction_AggregationInvocation.DISTINCT;
      },
    ],
    [
      'sidecar binding',
      (draft: DvtSubstraitPilotDraft) => {
        const binding = draft.sidecar.fields.find(
          (field) => field.fieldId === 'field:transform-customers:row-number'
        );
        if (binding == null) throw new Error('Expected row-number binding.');
        binding.outputOrdinal = 2;
      },
    ],
  ])('fails closed for a wrong %s', (_label, mutate) => {
    const draft = withRowNumber();
    mutate(draft);
    expect(inspectDvtSubstraitPilotWindowDraft(draft)).toEqual({ ok: false });
    expect(removeDvtSubstraitPilotRowNumber(draft)).toBe(draft);
  });

  it('rejects duplicate names and degenerate partition/order selections', () => {
    expect(
      applyDvtSubstraitPilotRowNumber(pilot(), {
        partitionFieldId: 'field:transform-customers:country',
        orderFieldId: 'field:transform-customers:country',
        outputName: 'row_number',
      })
    ).toEqual(pilot());
    expect(
      applyDvtSubstraitPilotRowNumber(pilot(), {
        partitionFieldId: 'field:transform-customers:country',
        orderFieldId: 'field:transform-customers:name',
        outputName: 'country',
      })
    ).toEqual(pilot());
  });

  it('projects the persisted window output on the Transform card', () => {
    const transform = applyDvtSubstraitSemanticDocument(
      {
        id: 'transform-customers',
        name: 'Customers numbered by country',
        pluginId: 'dvt',
        kind: 'dvt:transform',
        role: 'transform',
        status: 'idle',
        tags: ['authoring'],
        metadata: {},
      },
      encodeDvtSubstraitPilotDocument(withRowNumber())
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
      ['name', 'field:transform-customers:name'],
      ['email', 'field:transform-customers:email'],
      ['country', 'field:transform-customers:country'],
      ['country_row_number', 'field:transform-customers:row-number'],
    ]);
    expect(createDvtNodeAuthoringMetadata(transform)).toMatchObject({
      kind: 'transform',
      mode: 'substrait',
      shape: 'pilot',
    });
  });
});
