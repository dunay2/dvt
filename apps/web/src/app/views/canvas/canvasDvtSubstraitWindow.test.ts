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
  type DvtSubstraitPilotWindowProjection,
} from './canvasDvtSubstraitWindow';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { createDvtNodeAuthoringMetadata } from './canvasDvtAuthoringModel';
import { projectCanvasNodePresentationTruth } from './canvasNodePresentationProjection';

const UUID_V7 = '[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
const DVT_FIELD_ID = new RegExp(`^dvt_fld_${UUID_V7}$`, 'i');

function pilot(): DvtSubstraitPilotDraft {
  return createDvtSubstraitPilotDraft({
    sourceNodeId: 'source-customers',
    targetNodeId: 'transform-customers',
  });
}

function requirePilotField(draft: DvtSubstraitPilotDraft, name: string) {
  const inspection = inspectDvtSubstraitPilotDraft(draft);
  if (!inspection.ok) throw new Error('Expected the admitted pilot.');
  const field = inspection.projection.outputs.find((output) => output.name === name);
  if (field == null) throw new Error(`Expected pilot field ${name}.`);
  return field;
}

function withRowNumber(): DvtSubstraitPilotDraft {
  const draft = pilot();
  const partition = requirePilotField(draft, 'country');
  const order = requirePilotField(draft, 'name');
  return applyDvtSubstraitPilotRowNumber(draft, {
    partitionFieldId: partition.fieldId,
    orderFieldId: order.fieldId,
    outputName: 'country_row_number',
  });
}

function requireWindow(draft: DvtSubstraitPilotDraft): DvtSubstraitPilotWindowProjection {
  const inspection = inspectDvtSubstraitPilotWindowDraft(draft);
  if (!inspection.ok) throw new Error('Expected an admitted row-number window.');
  return inspection.projection;
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
  it('allocates an opaque row-number FieldId and persists it unchanged', () => {
    const windowed = withRowNumber();
    const projection = requireWindow(windowed);
    expect(projection.result.fieldId).toMatch(DVT_FIELD_ID);

    const persisted = encodeDvtSubstraitPilotDocument(windowed);
    const reopened = decodeDvtSubstraitPilotDocument(persisted);
    expect(requireWindow(reopened)).toEqual(projection);
    expect(persisted.sidecar.semanticPlanSha256).toBe(persisted.semanticPlan.sha256);
  });

  it('renames and removes the window without changing any surviving FieldId', () => {
    const windowed = withRowNumber();
    const before = requireWindow(windowed);
    const renamed = renameDvtSubstraitPilotRowNumberOutput(windowed, 'row_in_country');
    const after = requireWindow(renamed);
    expect(after.result).toMatchObject({ name: 'row_in_country', fieldId: before.result.fieldId });

    const restored = removeDvtSubstraitPilotRowNumber(renamed);
    const restoredInspection = inspectDvtSubstraitPilotDraft(restored);
    expect(restoredInspection.ok).toBe(true);
    if (!restoredInspection.ok) return;
    expect(restoredInspection.projection.outputs).toEqual(before.outputs.slice(0, 3));
  });

  it('treats a persisted legacy row-number FieldId as opaque identity', () => {
    const windowed = withRowNumber();
    const current = requireWindow(windowed);
    const legacyResultId = 'field:transform-customers:row-number';
    const legacy: DvtSubstraitPilotDraft = {
      plan: windowed.plan,
      sidecar: {
        ...windowed.sidecar,
        fields: windowed.sidecar.fields.map((field) =>
          field.fieldId === current.result.fieldId ? { ...field, fieldId: legacyResultId } : field
        ),
      },
    };

    expect(requireWindow(legacy).result.fieldId).toBe(legacyResultId);
    const renamed = renameDvtSubstraitPilotRowNumberOutput(legacy, 'legacy_row');
    expect(requireWindow(renamed).result).toMatchObject({
      name: 'legacy_row',
      fieldId: legacyResultId,
    });
    expect(inspectDvtSubstraitPilotDraft(removeDvtSubstraitPilotRowNumber(renamed)).ok).toBe(true);
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
        const resultId = requireWindow(draft).result.fieldId;
        const binding = draft.sidecar.fields.find((field) => field.fieldId === resultId);
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
    const degenerate = pilot();
    const country = requirePilotField(degenerate, 'country');
    expect(
      applyDvtSubstraitPilotRowNumber(degenerate, {
        partitionFieldId: country.fieldId,
        orderFieldId: country.fieldId,
        outputName: 'row_number',
      })
    ).toBe(degenerate);

    const duplicateName = pilot();
    const duplicateCountry = requirePilotField(duplicateName, 'country');
    const name = requirePilotField(duplicateName, 'name');
    expect(
      applyDvtSubstraitPilotRowNumber(duplicateName, {
        partitionFieldId: duplicateCountry.fieldId,
        orderFieldId: name.fieldId,
        outputName: 'country',
      })
    ).toBe(duplicateName);
  });

  it('projects the persisted window output on the Transform card', () => {
    const windowed = withRowNumber();
    const projection = requireWindow(windowed);
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
      encodeDvtSubstraitPilotDocument(windowed)
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
    expect(truth.columns.visible.map((column) => [column.name, column.reference])).toEqual(
      projection.outputs.map((output) => [output.name, output.fieldId])
    );
    expect(createDvtNodeAuthoringMetadata(transform)).toMatchObject({
      kind: 'transform',
      mode: 'substrait',
      shape: 'pilot',
    });
  });
});
