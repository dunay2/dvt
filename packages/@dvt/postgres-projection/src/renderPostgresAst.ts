import { deparse } from 'pgsql-deparser';

import { DvtSubstraitPostgresProjectionError } from './dvtProjection.js';
import type { PostgresAstNode } from './postgresAst.js';

export async function renderPostgresAst(ast: PostgresAstNode): Promise<string> {
  try {
    return await deparse(ast as Parameters<typeof deparse>[0]);
  } catch (error) {
    throw new DvtSubstraitPostgresProjectionError(
      'deparse_failed',
      'The bounded PostgreSQL AST could not be rendered.',
      { cause: error }
    );
  }
}
