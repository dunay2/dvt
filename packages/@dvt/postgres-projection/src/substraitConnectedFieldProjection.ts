import {
  buildConnectedFieldPostgresAst,
  DvtSubstraitPostgresProjectionError,
} from './dvtProjection.js';
import { renderPostgresAst } from './renderPostgresAst.js';
import { inspectDvtConnectedFieldProjection } from './substraitConnectedFieldReader.js';
import type {
  DvtConnectedFieldNodeBinding,
  DvtConnectedFieldProjection,
  DvtSubstraitProjectionDraft,
} from './substraitProjectionReadModel.js';

export type ProjectedDvtConnectedFieldSql = Readonly<{
  sql: string;
  projection: DvtConnectedFieldProjection;
  ast?: ReturnType<typeof buildConnectedFieldPostgresAst>;
}>;

export async function projectDvtConnectedFieldDraftToPostgresSql(
  draft: DvtSubstraitProjectionDraft,
  nodeBinding: DvtConnectedFieldNodeBinding
): Promise<ProjectedDvtConnectedFieldSql> {
  const inspection = inspectDvtConnectedFieldProjection(draft, nodeBinding);
  if (!inspection.ok) {
    throw new DvtSubstraitPostgresProjectionError(
      'unsupported_shape',
      'PostgreSQL projection supports only an admitted connected-field Substrait shape.'
    );
  }
  const ast = buildConnectedFieldPostgresAst(inspection.projection);
  return { projection: inspection.projection, ast, sql: await renderPostgresAst(ast) };
}
