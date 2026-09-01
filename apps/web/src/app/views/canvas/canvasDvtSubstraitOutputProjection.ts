/** Owned concern: derive an explicitly requested PostgreSQL view from one canonical Transform. */
import { DVT_TRANSFORM_AUTHORING_MODE } from '@dvt/contracts';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { inspectDvtSubstraitPilotAggregateWindowDraft } from './canvasDvtSubstraitAggregateWindow';
import { inspectDvtSubstraitPilotAggregationDraft } from './canvasDvtSubstraitAggregation';
import {
  decodeDvtSubstraitInnerJoinDocument,
  inspectDvtSubstraitInnerJoinAcceptedDraft,
  resolveDvtSubstraitInnerJoinEntry,
  resolveDvtSubstraitNInputJoinEntry,
} from './canvasDvtSubstraitJoinComposition';
import {
  decodeDvtSubstraitPilotDocument,
  inspectDvtSubstraitPilotDraft,
} from './canvasDvtSubstraitPilot';
import {
  projectDvtSubstraitInnerJoinToPostgresSql,
  projectDvtSubstraitPilotAggregateWindowToPostgresSql,
  projectDvtSubstraitPilotAggregationToPostgresSql,
  projectDvtSubstraitPilotToPostgresSql,
  projectDvtSubstraitPilotWindowToPostgresSql,
  projectDvtSubstraitProjectionToPostgresSql,
  projectDvtSubstraitUnionAllToPostgresSql,
} from './canvasDvtSubstraitPostgresProjection';
import {
  decodeDvtSubstraitProjectionDocument,
  inspectDvtSubstraitProjectionDraft,
  resolveDvtSubstraitProjectionEntry,
} from './canvasDvtSubstraitProjection';
import {
  decodeDvtSubstraitUnionAllDocument,
  inspectDvtSubstraitUnionAllAcceptedDraft,
  resolveDvtSubstraitUnionAllEntry,
} from './canvasDvtSubstraitSetComposition';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
import { inspectDvtSubstraitPilotWindowDraft } from './canvasDvtSubstraitWindow';
import { requireSourcePayload } from './previewGraphNodePayloads';

export type DvtSubstraitTransformOutputProjectionArgs = Readonly<{
  transformNode: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
}>;

function requireSingleIncomingSource(
  args: DvtSubstraitTransformOutputProjectionArgs
): CanonicalNode {
  const sourceIds = new Set(
    args.edges
      .filter((edge) => edge.targetId === args.transformNode.id)
      .map((edge) => edge.sourceId)
  );
  const sources = args.nodes.filter((node) => sourceIds.has(node.id) && node.role === 'input');
  if (sources.length !== 1) {
    throw new Error('Substrait output projection requires exactly one connected input source.');
  }
  return sources[0]!;
}

export async function projectDvtSubstraitTransformOutputToPostgresSql(
  args: DvtSubstraitTransformOutputProjectionArgs
): Promise<string> {
  const authority = readDvtTransformAuthoringAuthority(args.transformNode);
  if (authority.mode !== DVT_TRANSFORM_AUTHORING_MODE.substrait) {
    throw new Error('PostgreSQL output projection requires canonical Substrait authority.');
  }

  const projectionDraft = decodeDvtSubstraitProjectionDocument(authority.semanticDocument);
  const projectionInspection = inspectDvtSubstraitProjectionDraft(projectionDraft);
  if (projectionInspection.ok) {
    const entry = resolveDvtSubstraitProjectionEntry({
      targetNode: args.transformNode,
      nodes: args.nodes,
      edges: args.edges,
      draft: projectionDraft,
    });
    if (entry == null) {
      throw new Error('Substrait projection source identities do not match the connected graph.');
    }
    return projectDvtSubstraitProjectionToPostgresSql(projectionDraft);
  }

  const pilotDraft = decodeDvtSubstraitPilotDocument(authority.semanticDocument);
  const sourceBinding = (): Readonly<{ schema: string; table: string }> => {
    const source = requireSourcePayload(requireSingleIncomingSource(args));
    return { schema: source.payload.schema, table: source.payload.table };
  };
  if (inspectDvtSubstraitPilotDraft(pilotDraft).ok) {
    return projectDvtSubstraitPilotToPostgresSql(pilotDraft, sourceBinding());
  }
  if (inspectDvtSubstraitPilotAggregateWindowDraft(pilotDraft).ok) {
    return projectDvtSubstraitPilotAggregateWindowToPostgresSql(pilotDraft, sourceBinding());
  }
  if (inspectDvtSubstraitPilotAggregationDraft(pilotDraft).ok) {
    return projectDvtSubstraitPilotAggregationToPostgresSql(pilotDraft, sourceBinding());
  }
  if (inspectDvtSubstraitPilotWindowDraft(pilotDraft).ok) {
    return projectDvtSubstraitPilotWindowToPostgresSql(pilotDraft, sourceBinding());
  }

  const joinDraft = decodeDvtSubstraitInnerJoinDocument(authority.semanticDocument);
  const joinInspection = inspectDvtSubstraitInnerJoinAcceptedDraft(joinDraft);
  if (joinInspection.ok) {
    const entry =
      'left' in joinInspection.projection && 'right' in joinInspection.projection
        ? resolveDvtSubstraitInnerJoinEntry({
            targetNode: args.transformNode,
            nodes: args.nodes,
            edges: args.edges,
            requirePersistedAuthority: true,
          })
        : resolveDvtSubstraitNInputJoinEntry({
            targetNode: args.transformNode,
            nodes: args.nodes,
            edges: args.edges,
            draft: joinDraft,
          });
    if (entry == null) {
      throw new Error('Substrait INNER JOIN source identities do not match the connected graph.');
    }
    return projectDvtSubstraitInnerJoinToPostgresSql(joinDraft);
  }

  const unionAllDraft = decodeDvtSubstraitUnionAllDocument(authority.semanticDocument);
  if (!inspectDvtSubstraitUnionAllAcceptedDraft(unionAllDraft).ok) {
    throw new Error('PostgreSQL output does not support this Substrait semantic shape.');
  }
  const unionEntry = resolveDvtSubstraitUnionAllEntry({
    targetNode: args.transformNode,
    nodes: args.nodes,
    edges: args.edges,
    requirePersistedAuthority: true,
  });
  if (unionEntry == null) {
    throw new Error('Substrait UNION ALL source identities do not match the connected graph.');
  }
  return projectDvtSubstraitUnionAllToPostgresSql(unionAllDraft);
}
