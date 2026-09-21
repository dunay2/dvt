/** Owned concern: compose canonical JOIN projection with admitted Aggregate/Window wrappers. */
import { DvtSubstraitPostgresProjectionError } from './dvtProjection.js';
import { buildGroupedRelationalPostgresAst } from './groupedRelationalPostgresAst.js';
import { buildNInputJoinPostgresAst } from './joinPostgresProjection.js';
import type { PostgresAstNode } from './postgresAst.js';
import {
  inspectRelationalGroupedComposition,
  type RelationalCompositionOutput,
} from './relationalGroupedComposition.js';
import { renderPostgresAst } from './renderPostgresAst.js';
import { inspectDvtSubstraitJoinDraft } from './substraitJoinReader.js';
import type {
  DvtSubstraitJoinDraft,
  DvtSubstraitNInputJoinProjection,
} from './substraitJoinReadModel.js';
export async function projectDvtJoinDraftToPostgresSql(draft: DvtSubstraitJoinDraft): Promise<
  Readonly<{
    sql: string;
    ast: PostgresAstNode;
  }> &
    (
      | Readonly<{ kind: 'join'; projection: DvtSubstraitNInputJoinProjection }>
      | Readonly<{
          kind: 'aggregate' | 'window';
          projection: {
            inputs: DvtSubstraitNInputJoinProjection['inputs'];
            resultRelationId: string;
            outputs: readonly RelationalCompositionOutput[];
          };
        }>
    )
> {
  const inspection = inspectDvtSubstraitJoinDraft(draft);
  if (!inspection.ok) {
    const grouped = inspectRelationalGroupedComposition(draft, inspectDvtSubstraitJoinDraft);
    const wrapper = grouped.ok ? grouped.value : null;
    const base = wrapper == null ? null : inspectDvtSubstraitJoinDraft(wrapper.baseDraft);
    if (wrapper != null && base?.ok) {
      const ast = buildGroupedRelationalPostgresAst(
        buildNInputJoinPostgresAst(base.projection),
        wrapper,
        'join_input'
      );
      return {
        kind: wrapper.kind,
        ast,
        sql: await renderPostgresAst(ast),
        projection: {
          inputs: base.projection.inputs,
          resultRelationId: wrapper.resultRelationId,
          outputs: wrapper.outputs,
        },
      };
    }
    throw new DvtSubstraitPostgresProjectionError(
      'unsupported_shape',
      `PostgreSQL projection requires an admitted N-input JOIN shape: ${grouped.ok ? 'unsupported-join-base' : grouped.reason}.`
    );
  }
  const ast = buildNInputJoinPostgresAst(inspection.projection);
  return {
    kind: 'join',
    projection: inspection.projection,
    ast,
    sql: await renderPostgresAst(ast),
  };
}
