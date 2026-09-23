import { JoinRel_JoinType } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { describe, expect, it } from 'vitest';

import { projectSubstraitToPostgresSql } from '../src/relationalSql/project.js';

import { compositionalFixture } from './relationalSqlFixture.js';

describe('PostgreSQL composition over canonical relation scopes', () => {
  it.each(['join', 'cross', 'set'] as const)(
    'projects transformed inputs to %s without changing their authority',
    async (kind) => {
      const document = compositionalFixture(kind);
      const before = globalThis.structuredClone(document);
      const result = await projectSubstraitToPostgresSql(document);
      expect(result.projection.outputs.map((field) => field.dataType)).toEqual(
        kind === 'set' ? ['i64'] : ['i64', 'i64']
      );
      expect(result.projection.inputs.map((input) => input.relationId)).toEqual(['r1', 'r4']);
      expect(document).toEqual(before);
    }
  );
  it.each([
    JoinRel_JoinType.LEFT_SEMI,
    JoinRel_JoinType.LEFT_ANTI,
    JoinRel_JoinType.RIGHT_SEMI,
    JoinRel_JoinType.RIGHT_ANTI,
  ])('retains exactly one side for JOIN kind %s', async (kind) => {
    const result = await projectSubstraitToPostgresSql(compositionalFixture('join', kind));
    expect(result.projection.outputs).toHaveLength(1);
  });
  it('rejects a contradictory repeated physical source', async () => {
    const document = compositionalFixture('cross');
    const root = document.plan.relations[0]!.relType;
    if (root.case !== 'root' || root.value.input?.relType.case !== 'cross')
      throw new Error('Cross fixture required');
    const project = root.value.input.relType.value.right!.relType;
    if (project.case !== 'project' || project.value.input?.relType.case !== 'filter')
      throw new Error('Branch required');
    const read = project.value.input.relType.value.input!.relType;
    if (read.case !== 'read' || read.value.readType.case !== 'namedTable')
      throw new Error('Read required');
    read.value.readType.value.names[1] = 'other';
    await expect(projectSubstraitToPostgresSql(document)).rejects.toMatchObject({
      code: 'invalid_source_binding',
    });
  });
});
