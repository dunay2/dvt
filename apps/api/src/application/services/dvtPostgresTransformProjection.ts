/** Owned concern: render one protected terminal Transform as canonical PostgreSQL SQL. */
import {
  decodeDvtSubstraitPlanV1,
  DVT_POSTGRES_INNER_JOIN_PROFILE_ID,
  type DvtSubstraitSemanticDocumentV1,
} from '@dvt/contracts';
import {
  projectDvtConnectedFieldDraftToPostgresSql,
  projectDvtInnerJoinDraftToPostgresSql,
  type ProjectedDvtConnectedFieldSql,
} from '@dvt/postgres-projection';

import {
  sameConnectedSource,
  type DvtTerminalTransformClosure,
} from './resolveDvtTerminalTransformClosure.js';

export type ProjectDvtConnectedFieldDocument = (
  document: DvtSubstraitSemanticDocumentV1,
  nodeBinding: { readonly sourceNodeId: string; readonly targetNodeId: string }
) => Promise<ProjectedDvtConnectedFieldSql>;

export type DvtPostgresTransformProjection = Readonly<{
  sql: string;
  outputs: readonly Readonly<{ name: string; dataType: string; outputOrdinal: number }>[];
}>;

export async function projectDvtPostgresTransform(
  closure: DvtTerminalTransformClosure,
  projectSemanticDocument: ProjectDvtConnectedFieldDocument = projectCanonicalConnectedFieldDocument
): Promise<DvtPostgresTransformProjection> {
  const document = closure.authority.semanticDocument;
  if (closure.profileId === DVT_POSTGRES_INNER_JOIN_PROFILE_ID) {
    const projected = await projectDvtInnerJoinDraftToPostgresSql({
      plan: decodeDvtSubstraitPlanV1(document),
      sidecar: document.sidecar,
    });
    if (
      projected.projection.inputs.length !== closure.sources.length ||
      projected.projection.inputs.some(
        (input) =>
          !closure.sources.some(
            ({ node, ref }) =>
              sameConnectedSource(input.sourceRef, ref) &&
              node.metadata?.['schema'] === input.schema &&
              node.metadata?.['tableName'] === input.table
          )
      )
    ) {
      throw new Error('PostgreSQL JOIN inputs do not match the protected terminal closure.');
    }
    return { sql: projected.sql, outputs: projected.projection.outputs };
  }

  const source = closure.sources[0]!;
  const projected = await projectSemanticDocument(document, {
    sourceNodeId: source.node.id,
    targetNodeId: closure.transform.id,
  });
  if (
    projected.projection.targetNodeId !== closure.transform.id ||
    projected.projection.source.nodeId !== source.node.id ||
    !sameConnectedSource(projected.projection.source.sourceRef, source.ref)
  ) {
    throw new Error('PostgreSQL projection does not match the protected terminal closure.');
  }
  return { sql: projected.sql, outputs: projected.projection.outputs };
}

function projectCanonicalConnectedFieldDocument(
  document: DvtSubstraitSemanticDocumentV1,
  nodeBinding: { readonly sourceNodeId: string; readonly targetNodeId: string }
): Promise<ProjectedDvtConnectedFieldSql> {
  return projectDvtConnectedFieldDraftToPostgresSql(
    {
      plan: decodeDvtSubstraitPlanV1(document),
      sidecar: document.sidecar,
    },
    nodeBinding
  );
}
