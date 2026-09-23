import {
  JoinRel_JoinType,
  SetRel_SetOp,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { describe, expect, it } from 'vitest';

import { projectSubstraitToPostgresSql } from '../src/relationalSql/project.js';

import { compositionalFixture } from './relationalSqlFixture.js';

describe('Compositional SQL admission', () => {
  it.each(['join', 'cross', 'set'] as const)(
    'rejects invalid %s bindings before SQL is produced',
    async (kind) => {
      const document = compositionalFixture(kind);
      document.sidecar.relations[0]!.sourceRef!.connectionRef.connectionId = 'foreign';
      await expect(projectSubstraitToPostgresSql(document)).rejects.toMatchObject({
        code: 'invalid_source_binding',
      });
    }
  );

  it.each([
    ['digest', 'unsupported_shape'],
    ['field', 'unsupported_shape'],
    ['function', 'unsupported_shape'],
    ['options', 'unsupported_shape'],
    ['name', 'invalid_source_binding'],
  ] as const)('rejects a contradictory %s without mutating the document', async (fault, code) => {
    const document = compositionalFixture('join');
    const root = document.plan.relations[0]!.relType;
    const join = root.case === 'root' ? root.value.input?.relType : undefined;
    if (join?.case !== 'join' || join.value.expression?.rexType.case !== 'scalarFunction')
      throw new Error('Expected JOIN predicate');
    const fn = join.value.expression.rexType.value;
    if (fault === 'digest') document.sidecar.semanticPlanSha256 = 'f'.repeat(64);
    if (fault === 'field') {
      const field = fn.arguments[0]!.argType;
      if (field.case !== 'value' || field.value.rexType.case !== 'selection')
        throw new Error('Expected field');
      const ref = field.value.rexType.value.referenceType;
      if (ref.case !== 'directReference' || ref.value.referenceType.case !== 'structField')
        throw new Error('Expected ordinal');
      ref.value.referenceType.value.field = 99;
    }
    if (fault === 'function') fn.functionReference = 999;
    if (fault === 'options')
      fn.options.push({
        $typeName: 'substrait.FunctionOption',
        name: 'foreign',
        preference: ['yes'],
      });
    if (fault === 'name')
      document.sidecar.fields.find((field) => field.relationId === 'r1')!.displayName = 'wrong';
    const before = globalThis.structuredClone(document);
    await expect(projectSubstraitToPostgresSql(document)).rejects.toMatchObject({ code });
    expect(document).toEqual(before);
  });

  it.each([JoinRel_JoinType.LEFT_SINGLE, JoinRel_JoinType.RIGHT_SINGLE])(
    'rejects unsupported JOIN %s',
    async (kind) => {
      await expect(
        projectSubstraitToPostgresSql(compositionalFixture('join', kind))
      ).rejects.toMatchObject({ code: 'invalid_structure' });
    }
  );

  it.each([SetRel_SetOp.INTERSECTION_PRIMARY, SetRel_SetOp.MINUS_MULTISET])(
    'rejects unsupported SET %s',
    async (kind) => {
      const document = compositionalFixture('set');
      const root = document.plan.relations[0]!.relType;
      if (root.case !== 'root' || root.value.input?.relType.case !== 'set')
        throw new Error('Expected SET');
      root.value.input.relType.value.op = kind;
      await expect(projectSubstraitToPostgresSql(document)).rejects.toMatchObject({
        code: 'invalid_structure',
      });
    }
  );

  it('never ignores a post-join filter', async () => {
    const document = compositionalFixture('join');
    const root = document.plan.relations[0]!.relType;
    if (root.case !== 'root' || root.value.input?.relType.case !== 'join')
      throw new Error('Expected JOIN');
    root.value.input.relType.value.postJoinFilter = root.value.input.relType.value.expression;
    await expect(projectSubstraitToPostgresSql(document)).rejects.toMatchObject({
      code: 'unsupported_shape',
    });
  });

  it.each([JoinRel_JoinType.LEFT_SEMI, JoinRel_JoinType.RIGHT_SEMI])(
    'rejects emitted fields from a non-retained side for JOIN %s',
    async (kind) => {
      const document = compositionalFixture('join', kind);
      const root = document.plan.relations[0]!.relType;
      if (root.case !== 'root' || root.value.input?.relType.case !== 'join')
        throw new Error('Expected JOIN');
      const common = root.value.input.relType.value.common!;
      if (common.emitKind.case !== 'emit') throw new Error('Expected emit');
      common.emitKind.value.outputMapping = [1];
      await expect(projectSubstraitToPostgresSql(document)).rejects.toMatchObject({
        code: 'invalid_structure',
      });
    }
  );
});
