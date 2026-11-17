/** Prove direct SQL source projection produces canonical identity and publication facts. */
import { deriveSubstraitSchemas } from '@dvt/substrait-analysis';
import { describe, expect, it } from 'vitest';

import { pgQualifiedColumnRef, pgRangeVar } from '../src/postgresAst.js';
import { compileModelSqlSource } from '../src/sqlSource/compile.js';

import {
  modelSqlContext,
  sqlField,
  sqlSelect,
  sqlStar,
  sqlTarget,
} from './modelSqlSource.fixture.js';

describe('Model SQL source projections', () => {
  it('binds aliases to real fields and returns only consumed input additions', () => {
    const result = compileModelSqlSource(
      sqlSelect(
        [sqlTarget(pgQualifiedColumnRef('c', 'country'), 'market')],
        [pgRangeVar({ table: 'client', alias: 'c' })]
      ),
      modelSqlContext()
    );
    const analysis = deriveSubstraitSchemas(result.document);
    expect(result.document.plan.relations[0]?.relType).toMatchObject({
      case: 'root',
      value: { names: ['market'] },
    });
    expect(analysis.schemas.get(analysis.index.rootId)?.[0]?.type.kind.case).toBe('string');
    expect(result.inputAdditions).toEqual([{ nodeId: 'client-node', columnId: 'country' }]);
  });

  it('keeps publication order for stars and explicit order for field selection', () => {
    for (const [targets, names] of [
      [[sqlTarget(sqlStar())], ['client_id', 'country']],
      [
        [sqlTarget(sqlField('country')), sqlTarget(sqlField('client_id'))],
        ['country', 'client_id'],
      ],
    ] as const) {
      const result = compileModelSqlSource(sqlSelect(targets), modelSqlContext());
      expect(result.document.plan.relations[0]?.relType).toMatchObject({ value: { names } });
      expect(deriveSubstraitSchemas(result.document).index.relations.size).toBe(2);
    }
  });
});
