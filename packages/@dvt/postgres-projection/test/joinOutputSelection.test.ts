import { describe, expect, it } from 'vitest';

import {
  buildNInputJoinPostgresAst,
  inspectDvtSubstraitJoinDraft,
  projectDvtJoinDraftToPostgresSql,
  ZERO_SHA256,
} from '../src/index.js';

import { joinDraft } from './fixtures/joinDraft.js';

describe('JOIN empty output authoring versus SQL readiness', () => {
  it('reads an empty final selection as a draft but never renders it as executable SQL', async () => {
    const candidate = joinDraft();
    const root = candidate.plan.relations[0]!.relType;
    if (root.case !== 'root' || root.value.input?.relType.case !== 'join')
      throw new Error('Fixture must contain a JOIN root');
    const common = root.value.input.relType.value.common!;
    if (common.emitKind.case !== 'emit') throw new Error('Fixture must use explicit emit');
    const relationId = candidate.sidecar.relations.find(
      (relation) => relation.relAnchor === common.relAnchor
    )!.relationId;
    root.value.names = [];
    common.emitKind.value.outputMapping = [];
    candidate.sidecar.fields = candidate.sidecar.fields.filter(
      (field) => field.relationId !== relationId
    );
    candidate.sidecar.semanticPlanSha256 = ZERO_SHA256;
    const inspected = inspectDvtSubstraitJoinDraft(candidate);
    expect(inspected.ok).toBe(true);
    if (!inspected.ok) return;
    expect(inspected.projection.outputs).toEqual([]);
    expect(inspected.projection.inputs).toHaveLength(3);
    expect(() => buildNInputJoinPostgresAst(inspected.projection)).toThrow(/output/i);
    await expect(projectDvtJoinDraftToPostgresSql(candidate)).rejects.toMatchObject({
      code: 'unsupported_shape',
    });
  });

  it.each(['root names', 'intermediate emit'])(
    'still rejects an inconsistent empty %s',
    (scenario) => {
      const candidate = joinDraft();
      const root = candidate.plan.relations[0]!.relType;
      if (root.case !== 'root' || root.value.input?.relType.case !== 'join')
        throw new Error('Fixture must contain a JOIN root');
      if (scenario === 'root names') root.value.names = [];
      else {
        const left = root.value.input.relType.value.left!.relType;
        if (left.case !== 'join' || left.value.common?.emitKind.case !== 'emit')
          throw new Error('Fixture must contain an intermediate emit');
        left.value.common.emitKind.value.outputMapping = [];
      }
      candidate.sidecar.semanticPlanSha256 = ZERO_SHA256;
      expect(inspectDvtSubstraitJoinDraft(candidate).ok).toBe(false);
    }
  );
});
