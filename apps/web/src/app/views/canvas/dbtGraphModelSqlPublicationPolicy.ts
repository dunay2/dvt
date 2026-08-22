/** Owned concern: classify graph-draft DBT model SQL before workspace publication. */
import {
  GRAPH_DBT_MODEL_DIVERGENCE_MARKER_PREFIX,
  parseGraphDbtModelDivergenceMarker,
} from '@dvt/contracts';
import { sha256HexUtf8 } from '@dvt/crypto';

import type { ExpectedWorkspaceFileRevision } from '../../ports/workspace';

type CurrentWorkspaceSqlFile = Readonly<{
  content: string;
  contentSha256: string;
}>;

type PublishableGraphModelSqlDecision = Readonly<{
  kind: 'create' | 'unchanged' | 'replace_marked';
  content: string;
  expectedRevision: ExpectedWorkspaceFileRevision;
}>;

type ConflictingGraphModelSqlDecision =
  | Readonly<{
      kind: 'conflict';
      reason: 'invalid_marker';
    }>
  | Readonly<{
      kind: 'conflict';
      reason: 'unmarked';
    }>;

export type GraphModelSqlPublicationDecision =
  PublishableGraphModelSqlDecision | ConflictingGraphModelSqlDecision;

function contentRevision(file: CurrentWorkspaceSqlFile): ExpectedWorkspaceFileRevision {
  return { kind: 'content_sha256', value: file.contentSha256 };
}

export function createGraphDraftMarkedDbtModelSql(payload: string): string {
  return `${GRAPH_DBT_MODEL_DIVERGENCE_MARKER_PREFIX}${sha256HexUtf8(payload)}\n${payload}`;
}

export function classifyGraphModelSqlPublication(args: {
  proposedContent: string;
  currentFile: CurrentWorkspaceSqlFile | undefined;
}): GraphModelSqlPublicationDecision {
  const proposed = parseGraphDbtModelDivergenceMarker(args.proposedContent);
  if (!proposed?.valid) {
    throw new Error('Proposed graph-draft DBT model SQL must contain a valid divergence marker.');
  }

  if (!args.currentFile) {
    return {
      kind: 'create',
      content: args.proposedContent,
      expectedRevision: { kind: 'absent' },
    };
  }

  const expectedRevision = contentRevision(args.currentFile);
  if (args.currentFile.content === args.proposedContent) {
    return {
      kind: 'unchanged',
      content: args.proposedContent,
      expectedRevision,
    };
  }

  if (args.currentFile.content.startsWith(GRAPH_DBT_MODEL_DIVERGENCE_MARKER_PREFIX)) {
    return parseGraphDbtModelDivergenceMarker(args.currentFile.content)?.valid === true
      ? {
          kind: 'replace_marked',
          content: args.proposedContent,
          expectedRevision,
        }
      : {
          kind: 'conflict',
          reason: 'invalid_marker',
        };
  }

  return {
    kind: 'conflict',
    reason: 'unmarked',
  };
}
