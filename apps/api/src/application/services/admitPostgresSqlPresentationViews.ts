/** Certify whole native view definitions with the existing profile; never inline or rewrite a view. */
import { rewritePostgresSqlOnce } from '@dvt/postgres-projection';

import type { PostgresSqlPresentationEvidence } from '../ports/postgresSqlPresentationEvidence.js';

import { collectPostgresSqlPresentationRelations } from './collectPostgresSqlPresentationRelations.js';
import { parsePostgresTransformSqlStructure } from './postgresTransformSqlPolicy.js';

export async function admitPostgresSqlPresentationViews(
  evidence: PostgresSqlPresentationEvidence
): Promise<boolean> {
  const dependencies = new Map<string, readonly string[]>();
  for (const view of evidence.viewDefinitions ?? []) {
    const parsed = await parsePostgresTransformSqlStructure(view.sql);
    if (
      parsed.status !== 'valid' ||
      rewritePostgresSqlOnce(parsed.ast, evidence).retained !== undefined
    )
      return false;
    const relations = collectPostgresSqlPresentationRelations(parsed.ast);
    if (relations === null) return false;
    dependencies.set(
      JSON.stringify([view.schema, view.table]),
      relations.map((relation) => JSON.stringify([relation.schema, relation.table]))
    );
  }
  const pending = new Set(dependencies.keys());
  while (pending.size > 0) {
    const ready = [...pending].filter((key) =>
      dependencies.get(key)!.every((dependency) => !pending.has(dependency))
    );
    if (ready.length === 0) return false;
    for (const key of ready) pending.delete(key);
  }
  return true;
}
