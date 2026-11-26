import { resolveProducerGraph, type ProducerGraph } from '@dvt/substrait-analysis';
import { expect, it } from 'vitest';

import { pgStringLiteral } from '../src/postgresAst.js';
import { pgBooleanLiteral } from '../src/postgresPredicateAst.js';
import { projectModelSqlSource } from '../src/relationalSql/modelSource.js';
import { projectSubstraitProducerGraph } from '../src/relationalSql/producerGraph.js';
import { compileModelSqlSource } from '../src/sqlSource/compile.js';

import { modelSqlContext, sqlSelect, sqlTarget } from './modelSqlSource.fixture.js';

function literalGraph(): ProducerGraph {
  const { document } = compileModelSqlSource(
    sqlSelect(
      [
        sqlTarget({ A_Const: { ival: { ival: 1 } } }, 'comprobacion_editor_sql'),
        sqlTarget(pgBooleanLiteral(false), 'flag'),
        sqlTarget(pgStringLiteral("it's SQL"), 'label'),
      ],
      []
    ),
    { inputs: [] }
  );
  const connection = {
    schemaVersion: 'connection-ref.v1',
    provider: 'postgres',
    connectionId: 'selected',
  } as const;
  return {
    targetId: 'model',
    documents: new Map([['model', document]]),
    sources: new Map(),
    edges: [],
    literalConnections: new Map([['model', connection]]),
  };
}

it('publishes typed literal outputs and reopens their aliased SQL on the selected connection', async () => {
  const graph = literalGraph();
  const projection = await projectSubstraitProducerGraph(graph);
  expect(projection.projection.inputs).toEqual([]);
  expect(projection.projection.outputs.map(({ name, dataType }) => [name, dataType])).toEqual([
    ['comprobacion_editor_sql', 'i32'],
    ['flag', 'bool'],
    ['label', 'string'],
  ]);
  const sql = await projectModelSqlSource(graph.documents.get('model')!, []);
  expect(sql).toMatch(/1 AS comprobacion_editor_sql/i);
  expect(sql).toContain("it''s SQL");
  expect(sql).not.toMatch(/\bfrom\b/i);
});

it('rejects missing execution authority and conflicting dependency claims', async () => {
  const graph = literalGraph();
  expect(() => resolveProducerGraph({ ...graph, literalConnections: new Map() })).toThrow();
  expect(() =>
    resolveProducerGraph({ ...graph, edges: [{ sourceId: 'unrelated', targetId: 'model' }] })
  ).toThrow();
  await expect(
    projectModelSqlSource(graph.documents.get('model')!, modelSqlContext().inputs)
  ).rejects.toThrow();
});
