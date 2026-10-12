import { deriveSubstraitSchemas } from '@dvt/substrait-analysis';
import { describe, expect, it } from 'vitest';

import { projectSubstraitToPostgresSql } from '../src/relationalSql/project.js';

import { compositionalFixture } from './relationalSqlFixture.js';

describe('PostgreSQL output name boundary', () => {
  it.each(['a'.repeat(63), 'a'.repeat(59) + '😀'])(
    'preserves a representable name in the generated AST',
    async (name) => {
      const document = compositionalFixture('cross');
      const root = document.plan.relations[0]!.relType;
      if (root.case !== 'root') throw new Error('Expected root');
      root.value.names[0] = name;
      const before = globalThis.structuredClone(document);
      const projection = await projectSubstraitToPostgresSql(document);
      expect(projection.ast).toMatchObject({
        SelectStmt: { targetList: [{ ResTarget: { name } }, expect.anything()] },
      });
      expect(document).toEqual(before);
    }
  );

  it.each(['a'.repeat(64), 'a'.repeat(60) + '😀'])(
    'rejects a target-incompatible name without rejecting semantic analysis',
    async (name) => {
      const document = compositionalFixture('cross');
      const root = document.plan.relations[0]!.relType;
      if (root.case !== 'root') throw new Error('Expected root');
      root.value.names[0] = name;
      const before = globalThis.structuredClone(document);
      expect(deriveSubstraitSchemas(document).index.rootId).toBeDefined();
      await expect(projectSubstraitToPostgresSql(document)).rejects.toMatchObject({
        code: 'unsupported_shape',
      });
      expect(document).toEqual(before);
    }
  );
});
