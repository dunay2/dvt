/** Owned concern: render one protected terminal Transform as canonical PostgreSQL SQL. */
import {
  decodeDvtSubstraitPlanV1,
  DVT_POSTGRES_JOIN_PROFILE_ID,
  DVT_POSTGRES_SET_PROFILE_ID,
  type DvtSubstraitSemanticDocumentV1,
} from '@dvt/contracts';
import {
  projectDvtConnectedFieldDraftToPostgresSql,
  projectDvtCrossDraftToPostgresSql,
  projectDvtJoinDraftToPostgresSql,
  projectDvtSetDraftToPostgresSql,
  buildDvtSortFetchPostgresAst,
  buildConnectedFieldPostgresAst,
  inspectDvtSubstraitSortFetchRoot,
  renderPostgresAst,
  removeDvtSubstraitSortFetchRelation,
  selectDvtSubstraitRelation,
  type DvtPostgresOrderKey,
  type DvtSubstraitJoinDraft,
  type PostgresAstNode,
  type ProjectedDvtConnectedFieldSql,
} from '@dvt/postgres-projection';

import { sameConnectedSource, requireDvtProjectedSourceCoverage } from './dvtSourceCoverage.js';
import type { DvtTerminalTransformClosure } from './resolveDvtTerminalTransformClosure.js';

export type ProjectDvtConnectedFieldDocument = (
  document: DvtSubstraitSemanticDocumentV1,
  nodeBinding: { readonly sourceNodeId: string; readonly targetNodeId: string }
) => Promise<ProjectedDvtConnectedFieldSql>;

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
  projectSemanticDocument: ProjectDvtConnectedFieldDocument = projectCanonicalConnectedFieldDocument,
  relationId?: string
): Promise<DvtPostgresTransformProjection> {
  const document = closure.authority.semanticDocument;
  const canonicalPlan = decodeDvtSubstraitPlanV1(document);
  const selected =
    relationId === undefined
      ? null
      : selectDvtSubstraitRelation(
          {
            plan: canonicalPlan,
            sidecar: document.sidecar,
          },
          relationId
        );
  const selectedRoot = selected?.plan.relations[0]?.relType;
  if (
    selectedRoot != null &&
    (selectedRoot.case !== 'root' ||
      !['join', 'project', 'aggregate', 'set', 'cross', 'sort', 'fetch'].includes(
        selectedRoot.value.input?.relType.case ?? ''
      ))
  ) {
    throw new Error('Selected operation is not admitted by the PostgreSQL preview profile.');
  }

  const canonicalDraft: DvtSubstraitJoinDraft = {
    plan: canonicalPlan,
    sidecar: document.sidecar,
  };
  const projectDraft = async (
    draft: DvtSubstraitJoinDraft,
    selectedSubtree: boolean
  ): Promise<DvtPostgresTransformProjection> => {
    const root = draft.plan.relations[0]?.relType;
    if (root?.case !== 'root' || root.value.input == null) {
      throw new Error('PostgreSQL projection requires one canonical root relation.');
    }
    const relationCase = root.value.input.relType.case;
    if (relationCase === 'sort' || relationCase === 'fetch') {
      const inspection = inspectDvtSubstraitSortFetchRoot(draft);
      if (!inspection.ok) throw new Error('Sort/Fetch relation is outside the admitted profile.');
      const innerDraft = removeDvtSubstraitSortFetchRelation(draft, inspection.relationId);
      const inner = await projectDraft(innerDraft, true);
      const inputFields = draft.sidecar.fields
        .filter((field) => field.relationId === inspection.inputRelationId)
        .sort((left, right) => left.outputOrdinal - right.outputOrdinal);
      if (
        inputFields.length !== inner.outputs.length ||
        inputFields.some((field, ordinal) => field.outputOrdinal !== ordinal)
      ) {
        throw new Error('Sort/Fetch fields do not match the projected input schema.');
      }
      const wrapped = buildDvtSortFetchPostgresAst({
        inputAst: inner.ast,
        inputColumns: inputFields.map((field, ordinal) => ({
          fieldId: field.fieldId,
          name: inner.outputs[ordinal]!.name,
        })),
        operation: inspection,
        inheritedOrderBy: inner.orderBy,
      });
      return {
        ast: wrapped.ast,
        sql: await renderPostgresAst(wrapped.ast),
        orderBy: wrapped.orderBy,
        outputs: inner.outputs,
      };
    }

    const projectRelation =
      relationCase === 'cross'
        ? projectDvtCrossDraftToPostgresSql
        : relationCase === 'join' || closure.profileId === DVT_POSTGRES_JOIN_PROFILE_ID
          ? projectDvtJoinDraftToPostgresSql
          : relationCase === 'set' || closure.profileId === DVT_POSTGRES_SET_PROFILE_ID
            ? projectDvtSetDraftToPostgresSql
            : null;
    if (projectRelation != null) {
      const projected = await projectRelation(draft);
      requireDvtProjectedSourceCoverage(
        projected.projection.inputs,
        closure.sources,
        !selectedSubtree
      );
      return {
        ast: projected.ast,
        sql: projected.sql,
        orderBy: null,
        outputs: projected.projection.outputs,
      };
    }

    const selectedSource = draft.sidecar.relations.find(
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
      !selectedSubtree && draft === canonicalDraft
        ? await projectSemanticDocument(document, nodeBinding)
        : await projectDvtConnectedFieldDraftToPostgresSql(draft, nodeBinding);
    if (
      projected.projection.targetNodeId !== closure.transform.id ||
      projected.projection.source.nodeId !== source.node.id ||
      !sameConnectedSource(projected.projection.source.sourceRef, source.ref)
    ) {
      throw new Error('PostgreSQL projection does not match the protected terminal closure.');
    }
    return {
      ast: projected.ast ?? buildConnectedFieldPostgresAst(projected.projection),
      sql: projected.sql,
      orderBy: null,
      outputs: projected.projection.outputs,
    };
  };

  return projectDraft(selected ?? canonicalDraft, selected != null);
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
