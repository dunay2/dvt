/** Prove published source isolation before any consuming operation. */
import { deriveSubstraitSchemas } from '@dvt/substrait-analysis';
import { describe, expect, it } from 'vitest';

import { sourceFieldType } from '../src/postgresInputType.js';
import { compileModelSqlSource } from '../src/sqlSource/compile.js';

import {
  firstRead,
  rootFields,
  modelSqlContext,
  sqlField,
  sqlSelect,
  sqlStar,
  sqlTarget,
} from './modelSqlSource.fixture.js';

describe('Model SQL source publication', () => {
  it('retains an exact Read while projecting only its published subset before filtering', () => {
    const context = modelSqlContext();
    const original = context.inputs[0]!;
    const current = compileModelSqlSource(sqlSelect([sqlTarget(sqlStar())]), context).document;
    const visible = {
      ...original,
      columns: [original.columns[1]!],
      source: {
        ...original.source,
        columns: original.columns,
      },
      retainedRead: firstRead(current),
    };
    const next = compileModelSqlSource(
      sqlSelect([sqlTarget(sqlField('country'))], undefined, {
        whereClause: { NullTest: { arg: sqlField('country'), nulltesttype: 'IS_NOT_NULL' } },
      }),
      { currentDocument: current, inputs: [visible] }
    ).document;
    const analysis = deriveSubstraitSchemas(next);
    const read = firstRead(next);
    const child = [...analysis.index.relations.values()].find((entry) =>
      entry.inputs.includes(read.binding.relationId)
    )!;
    expect(read.binding.relationId).toBe(firstRead(current).binding.relationId);
    expect(child.relation.relType.case).toBe('project');
    expect(child.fields.map((field) => field.displayName)).toEqual(['country']);
    expect(rootFields(next)[0]!.fieldId).toBe(rootFields(current)[1]!.fieldId);
    for (const query of [
      sqlSelect([sqlTarget(sqlField('client_id'))]),
      sqlSelect([sqlTarget(sqlField('country'))], undefined, {
        whereClause: { NullTest: { arg: sqlField('client_id'), nulltesttype: 'IS_NULL' } },
      }),
      sqlSelect([sqlTarget(sqlField('country'))], undefined, {
        sortClause: [{ SortBy: { node: sqlField('client_id') } }],
      }),
    ])
      expect(() =>
        compileModelSqlSource(query, { currentDocument: current, inputs: [visible] })
      ).toThrow();
    const altered = {
      ...visible,
      source: {
        ...visible.source,
        columns: original.columns.map((column) =>
          column.id === 'client_id' ? { ...column, type: sourceFieldType('bool', false) } : column
        ),
      },
    };
    expect(() =>
      compileModelSqlSource(sqlSelect([sqlTarget(sqlField('country'))]), {
        currentDocument: current,
        inputs: [altered],
      })
    ).toThrow(/publication/);
    expect(
      current.sidecar.relations.find((binding) => binding.relationId === read.binding.relationId)
    ).toEqual(read.binding);
  });
});
