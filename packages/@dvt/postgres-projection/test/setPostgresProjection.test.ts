import { readFileSync } from 'node:fs';
import { URL } from 'node:url';

import { SetRel_SetOp } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { decodeDvtSubstraitPlanV1, DvtSubstraitSemanticDocumentV1Schema } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import {
  buildDvtSetPostgresAst,
  ZERO_SHA256,
  inspectDvtSubstraitSetDraft,
  projectDvtSetDraftToPostgresSql,
  type DvtSubstraitSetDraft,
} from '../src/index.js';

const documents = JSON.parse(
  readFileSync(new URL('./fixtures/set-documents.json', import.meta.url), 'utf8')
) as Record<string, unknown>;

function draft(): DvtSubstraitSetDraft {
  const document = DvtSubstraitSemanticDocumentV1Schema.parse(documents['unionDistinct']);
  return { plan: decodeDvtSubstraitPlanV1(document), sidecar: document.sidecar };
}

function setOperation(candidate: DvtSubstraitSetDraft, operation: SetRel_SetOp): void {
  const root = candidate.plan.relations[0]?.relType;
  if (root?.case !== 'root' || root.value.input?.relType.case !== 'set') {
    throw new Error('Fixture must contain a SetRel root.');
  }
  root.value.input.relType.value.op = operation;
  candidate.sidecar.semanticPlanSha256 = ZERO_SHA256;
}

describe('shared PostgreSQL SetRel admission', () => {
  it('preserves three-input order and projects UNION DISTINCT without bag semantics', async () => {
    const result = await projectDvtSetDraftToPostgresSql(draft());

    expect(result.projection.operation).toBe('union_distinct');
    expect(result.projection.inputs.map((input) => input.table)).toEqual([
      'customers_north',
      'customers_south',
      'customers_west',
    ]);
    expect(result.sql.match(/UNION/g)).toHaveLength(2);
    expect(result.sql).not.toContain('UNION ALL');
  });

  it('delegates duplicate tuples containing NULL to exact PostgreSQL set comparison', () => {
    const inspection = inspectDvtSubstraitSetDraft(draft());
    if (!inspection.ok) throw new Error('Expected the UNION DISTINCT fixture to be admitted.');

    const ast = buildDvtSetPostgresAst(inspection.projection);

    expect(JSON.stringify(ast).match(/"all":false/g)).toHaveLength(2);
  });

  it('projects the exact admitted UNION ALL selector with bag semantics', async () => {
    const candidate = draft();
    setOperation(candidate, SetRel_SetOp.UNION_ALL);

    const result = await projectDvtSetDraftToPostgresSql(candidate);

    expect(result.projection.operation).toBe('union_all');
    expect(result.sql.match(/UNION\s+ALL/g)).toHaveLength(2);
  });

  it.each(['mismatched schema', 'duplicate source', 'stale hash', 'unsupported selector'])(
    'rejects %s rather than degrading Set semantics',
    async (scenario) => {
      const candidate = draft();
      if (scenario === 'mismatched schema') {
        const root = candidate.plan.relations[0]?.relType;
        if (root?.case !== 'root' || root.value.input?.relType.case !== 'set') {
          throw new Error('Fixture must contain a SetRel root.');
        }
        const read = root.value.input.relType.value.inputs[1]?.relType;
        if (read?.case !== 'read') throw new Error('Fixture must contain a ReadRel input.');
        read.value.baseSchema!.names[1] = 'region';
        candidate.sidecar.semanticPlanSha256 = ZERO_SHA256;
      }
      if (scenario === 'duplicate source') {
        candidate.sidecar.relations[1]!.sourceRef = candidate.sidecar.relations[0]!.sourceRef;
      }
      if (scenario === 'stale hash') candidate.sidecar.semanticPlanSha256 = 'a'.repeat(64);
      if (scenario === 'unsupported selector')
        setOperation(candidate, SetRel_SetOp.INTERSECTION_PRIMARY);

      expect(inspectDvtSubstraitSetDraft(candidate).ok).toBe(false);
      await expect(projectDvtSetDraftToPostgresSql(candidate)).rejects.toMatchObject({
        code: 'unsupported_shape',
      });
    }
  );
});
