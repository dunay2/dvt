import { create } from '@bufbuild/protobuf';
import { TypeSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { describe, expect, it } from 'vitest';

import {
  applyDvtSubstraitPilotFunction,
  createDvtSubstraitPilotDraft,
  inspectDvtSubstraitPilotDraft,
} from './canvasDvtSubstraitPilot';

function projectExpression(draft: ReturnType<typeof createDvtSubstraitPilotDraft>) {
  const root = draft.plan.relations[0]?.relType;
  if (root?.case !== 'root') throw new Error('Expected pilot root relation.');
  const project = root.value.input?.relType;
  if (project?.case !== 'project') throw new Error('Expected pilot ProjectRel.');
  if (project.value.expressions[0] == null) throw new Error('Expected pilot expression.');
  return project.value.expressions[0];
}

function pilotRead(draft: ReturnType<typeof createDvtSubstraitPilotDraft>) {
  const root = draft.plan.relations[0]?.relType;
  if (root?.case !== 'root') throw new Error('Expected pilot root relation.');
  const project = root.value.input?.relType;
  if (project?.case !== 'project') throw new Error('Expected pilot ProjectRel.');
  const read = project.value.input?.relType;
  if (read?.case !== 'read') throw new Error('Expected pilot ReadRel.');
  return read.value;
}

describe('typed Substrait pilot review guards', () => {
  it('creates the exact production-entry fixture with stable target-owned field ids', () => {
    const draft = createDvtSubstraitPilotDraft({
      sourceNodeId: 'source-customers',
      targetNodeId: 'transform-customers',
    });

    expect(inspectDvtSubstraitPilotDraft(draft)).toEqual({
      ok: true,
      projection: {
        sourceName: 'customers',
        inputFieldName: 'name',
        outputName: 'name',
        fieldId: 'field:transform-customers:name',
        operations: [],
        outputs: [
          { name: 'name', fieldId: 'field:transform-customers:name', outputOrdinal: 0 },
          { name: 'email', fieldId: 'field:transform-customers:email', outputOrdinal: 1 },
          { name: 'country', fieldId: 'field:transform-customers:country', outputOrdinal: 2 },
        ],
      },
    });
  });

  it('fails closed when the admitted input struct does not contain string types', () => {
    const draft = createDvtSubstraitPilotDraft({
      sourceNodeId: 'source-customers',
      targetNodeId: 'transform-customers',
    });
    const read = pilotRead(draft);
    if (read.baseSchema?.struct == null) throw new Error('Expected pilot base schema.');
    read.baseSchema.struct.types[0] = create(TypeSchema, {});

    expect(inspectDvtSubstraitPilotDraft(draft)).toEqual({ ok: false });
    expect(applyDvtSubstraitPilotFunction(draft, 'trim')).toBe(draft);
  });

  it('rejects wrong string-extension URNs and never reuses their function anchors', () => {
    const base = createDvtSubstraitPilotDraft({
      sourceNodeId: 'source-customers',
      targetNodeId: 'transform-customers',
    });
    const withTrim = applyDvtSubstraitPilotFunction(base, 'trim');
    const urn = withTrim.plan.extensionUrns[0];
    if (urn == null) throw new Error('Expected string extension URN.');
    urn.urn = 'extension:example:wrong_string_functions';

    expect(inspectDvtSubstraitPilotDraft(withTrim)).toEqual({ ok: false });

    const fresh = createDvtSubstraitPilotDraft({
      sourceNodeId: 'source-customers',
      targetNodeId: 'transform-customers',
    });
    const root = withTrim.plan.relations[0]?.relType;
    if (root?.case !== 'root') throw new Error('Expected pilot root relation.');
    const project = root.value.input?.relType;
    if (project?.case !== 'project') throw new Error('Expected pilot ProjectRel.');
    project.value.expressions[0] = projectExpression(fresh);

    const repaired = applyDvtSubstraitPilotFunction(withTrim, 'trim');
    expect(repaired).not.toBe(withTrim);
    expect(
      repaired.plan.extensionUrns.some(
        (entry) => entry.urn === 'extension:io.substrait:functions_string'
      )
    ).toBe(true);
    expect(inspectDvtSubstraitPilotDraft(repaired)).toMatchObject({
      ok: true,
      projection: { operations: ['trim'] },
    });
  });
});
