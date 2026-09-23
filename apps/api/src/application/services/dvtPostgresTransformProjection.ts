/** Render one authorized Substrait relation without selecting a reader by tree shape. */
import { decodeDvtSubstraitPlanV1 } from '@dvt/contracts';
import {
  projectSubstraitToPostgresSql,
  type DvtPostgresOrderKey,
  type PostgresAstNode,
} from '@dvt/postgres-projection';
import { selectDvtSubstraitRelation } from '@dvt/substrait-analysis';

import { requireDvtProjectedSourceCoverage } from './dvtSourceCoverage.js';
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
  const document = closure.authority.semanticDocument;
  const canonical = { plan: decodeDvtSubstraitPlanV1(document), sidecar: document.sidecar };
  const selected =
    relationId === undefined ? canonical : selectDvtSubstraitRelation(canonical, relationId);
  const result = await projectSubstraitToPostgresSql(selected);
  requireDvtProjectedSourceCoverage(
    result.projection.inputs,
    closure.sources,
    relationId === undefined
  );
  return {
    sql: result.sql,
    ast: result.ast,
    orderBy: result.orderBy,
    outputs: result.projection.outputs,
  };
}
