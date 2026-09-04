import { create } from '@bufbuild/protobuf';
import type {
  Expression,
  ReadRel,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { TypeSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { describe, expect, it } from 'vitest';

import {
  applyDvtSubstraitPilotFunction,
  createDvtSubstraitPilotDraft,
  decodeDvtSubstraitPilotDocument,
  encodeDvtSubstraitPilotDocument,
  inspectDvtSubstraitPilotDraft,
  renameDvtSubstraitPilotOutput,
} from './canvasDvtSubstraitPilot';

const UUID_V7 = '[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';

function projectExpression(draft: ReturnType<typeof createDvtSubstraitPilotDraft>): Expression {
  const root = draft.plan.relations[0]?.relType;
  if (root?.case !== 'root') throw new Error('Expected pilot root relation.');
  const project = root.value.input?.relType;
  if (project?.case !== 'project') throw new Error('Expected pilot ProjectRel.');
  if (project.value.expressions[0] == null) throw new Error('Expected pilot expression.');
  return project.value.expressions[0];
}

function pilotRead(draft: ReturnType<typeof createDvtSubstraitPilotDraft>): ReadRel {
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

  it('allocates opaque base relation ids once and preserves them through rename and reload', () => {
    const draft = createDvtSubstraitPilotDraft({
      sourceNodeId: 'source-customers',
      targetNodeId: 'transform-customers',
    });
    const relationIds = draft.sidecar.relations.map((relation) => relation.relationId);

    expect(relationIds).toHaveLength(2);
    expect(new Set(relationIds).size).toBe(2);
    relationIds.forEach((relationId) =>
      expect(relationId).toMatch(new RegExp(`^dvt_rel_${UUID_V7}$`, 'i'))
    );
    expect(
      relationIds.some(
        (relationId) =>
          relationId.includes('source-customers') || relationId.includes('transform-customers')
      )
    ).toBe(false);

    const renamed = renameDvtSubstraitPilotOutput(draft, 'customer_name');
    expect(renamed.sidecar.relations.map((relation) => relation.relationId)).toEqual(relationIds);

    const reopened = decodeDvtSubstraitPilotDocument(encodeDvtSubstraitPilotDocument(renamed));
    expect(reopened.sidecar.relations.map((relation) => relation.relationId)).toEqual(relationIds);
    expect(inspectDvtSubstraitPilotDraft(reopened)).toMatchObject({
      ok: true,
      projection: { outputName: 'customer_name' },
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

  it('fails closed when ReadRel carries semantics the pilot does not surface', () => {
    const draft = createDvtSubstraitPilotDraft({
      sourceNodeId: 'source-customers',
      targetNodeId: 'transform-customers',
    });
    const read = pilotRead(draft);
    read.filter = projectExpression(draft);

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
