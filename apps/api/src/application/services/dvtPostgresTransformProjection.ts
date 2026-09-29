/** Render one authorized Substrait relation without selecting a reader by tree shape. */
import { readDvtInputBindings } from '@dvt/contracts';
import {
  projectSubstraitProducerGraph,
  type DvtPostgresOrderKey,
  type PostgresAstNode,
} from '@dvt/postgres-projection';

import { requireDvtProjectedSourceCoverage } from './dvtSourceCoverage.js';
import { dvtSourcePublication } from './dvtSourcePublication.js';
import type { DvtTerminalTransformClosure } from './resolveDvtTerminalTransformClosure.js';

export type DvtPostgresTransformProjection = Readonly<{
  sql: string;
  ast: PostgresAstNode;
  orderBy: readonly DvtPostgresOrderKey[] | null;
  outputs: readonly Readonly<{
    name: string;
    dataType: string;
    outputOrdinal: number;
    nullable?: boolean;
  }>[];
}>;

export async function projectDvtPostgresTransform(
  closure: DvtTerminalTransformClosure,
  relationId?: string
): Promise<DvtPostgresTransformProjection> {
  const result = await projectSubstraitProducerGraph({
    targetId: closure.transform.id,
    documents: closure.documents,
    sources: new Map(closure.sources.map(({ node, ref }) => [node.id, ref])),
    edges: closure.edges.map((edge) => {
      const inputBindings = readDvtInputBindings(edge);
      return { ...edge, ...(inputBindings == null ? {} : { inputBindings }) };
    }),
    sourcePublications: new Map(
      closure.sources.flatMap(({ node }) => {
        const fields = dvtSourcePublication(node);
        return fields == null ? [] : [[node.id, fields] as const];
      })
    ),
    ...(relationId == null ? {} : { relationId }),
  });
  requireDvtProjectedSourceCoverage(
    result.projection.inputs,
    closure.sources,
    relationId === undefined && !closure.preview
  );
  return {
    sql: result.sql,
    ast: result.ast,
    orderBy: result.orderBy,
    outputs: result.projection.outputs,
  };
}
