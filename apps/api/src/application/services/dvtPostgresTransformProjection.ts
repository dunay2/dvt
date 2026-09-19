/** Owned concern: render one protected terminal Transform as canonical PostgreSQL SQL. */
import {
  decodeDvtSubstraitPlanV1,
  DVT_POSTGRES_INNER_JOIN_PROFILE_ID,
  type DvtSubstraitSemanticDocumentV1,
} from '@dvt/contracts';
import {
  projectDvtConnectedFieldDraftToPostgresSql,
  projectDvtInnerJoinDraftToPostgresSql,
  selectDvtSubstraitRelation,
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
  projectSemanticDocument: ProjectDvtConnectedFieldDocument = projectCanonicalConnectedFieldDocument,
  relationId?: string
): Promise<DvtPostgresTransformProjection> {
  const document = closure.authority.semanticDocument;
  const selected =
    relationId === undefined
      ? null
      : selectDvtSubstraitRelation(
          {
            plan: decodeDvtSubstraitPlanV1(document),
            sidecar: document.sidecar,
          },
          relationId
        );
  const selectedRoot = selected?.plan.relations[0]?.relType;
  if (
    selectedRoot != null &&
    (selectedRoot.case !== 'root' ||
      (selectedRoot.value.input?.relType.case !== 'join' &&
        selectedRoot.value.input?.relType.case !== 'project'))
  ) {
    throw new Error('Selected operation is not admitted by the PostgreSQL preview profile.');
  }
  if (
    selectedRoot?.case === 'root'
      ? selectedRoot.value.input?.relType.case === 'join'
      : closure.profileId === DVT_POSTGRES_INNER_JOIN_PROFILE_ID
  ) {
    const projected = await projectDvtInnerJoinDraftToPostgresSql(
      selected ?? {
        plan: decodeDvtSubstraitPlanV1(document),
        sidecar: document.sidecar,
      }
    );
    if (
      (selected == null && projected.projection.inputs.length !== closure.sources.length) ||
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

  const selectedSource = selected?.sidecar.relations.find(
    (relation) => relation.sourceRef != null
  )?.sourceRef;
  const source =
    selectedSource == null
      ? closure.sources[0]!
      : closure.sources.find(({ ref }) => sameConnectedSource(ref, selectedSource));
  if (source == null)
    throw new Error('Selected projection source is outside the protected closure.');
  const nodeBinding = {
    sourceNodeId: source.node.id,
    targetNodeId: closure.transform.id,
  };
  const projected =
    selected == null
      ? await projectSemanticDocument(document, nodeBinding)
      : await projectDvtConnectedFieldDraftToPostgresSql(selected, nodeBinding);
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
