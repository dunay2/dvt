/** Owned concern: classify graph-owned DBT model SQL before workspace publication. */
import { sha256HexUtf8 } from '@dvt/contracts';

import type { ExpectedWorkspaceFileRevision } from '../../ports/workspace';

const GRAPH_MANAGED_SQL_MARKER_PREFIX = '-- dvt:graph-draft-content-sha256=';
const GRAPH_MANAGED_SQL_PATTERN =
  /^-- dvt:graph-draft-content-sha256=([a-f0-9]{64})\r?\n([\s\S]*)$/;

type CurrentWorkspaceSqlFile = Readonly<{
  content: string;
  contentSha256: string;
}>;

type PublishableGraphModelSqlDecision = Readonly<{
  kind:
    | 'create'
    | 'unchanged'
    | 'replace_managed'
    | 'adopt_legacy_equivalent'
    | 'replace_legacy_authorized';
  content: string;
  expectedRevision: ExpectedWorkspaceFileRevision;
}>;

export type GraphModelSqlReplacementAuthorization = Readonly<{
  observedContentSha256: string;
  proposedContentSha256: string;
}>;

type ConflictingGraphModelSqlDecision =
  | Readonly<{
      kind: 'conflict';
      reason: 'invalid_managed';
    }>
  | Readonly<{
      kind: 'conflict';
      reason: 'unmarked';
      replacementAuthorization: GraphModelSqlReplacementAuthorization;
    }>;

export type GraphModelSqlPublicationDecision =
  PublishableGraphModelSqlDecision | ConflictingGraphModelSqlDecision;

type ParsedGraphManagedSql = Readonly<{
  payload: string;
}>;

function parseValidGraphManagedSql(content: string): ParsedGraphManagedSql | undefined {
  const match = GRAPH_MANAGED_SQL_PATTERN.exec(content);
  if (!match) {
    return undefined;
  }

  const [, declaredSha256, payload] = match;
  if (payload === undefined || sha256HexUtf8(payload) !== declaredSha256) {
    return undefined;
  }

  return { payload };
}

function contentRevision(file: CurrentWorkspaceSqlFile): ExpectedWorkspaceFileRevision {
  return { kind: 'content_sha256', value: file.contentSha256 };
}

export function createGraphManagedDbtModelSql(payload: string): string {
  return `${GRAPH_MANAGED_SQL_MARKER_PREFIX}${sha256HexUtf8(payload)}\n${payload}`;
}

export function classifyGraphModelSqlPublication(args: {
  proposedContent: string;
  currentFile: CurrentWorkspaceSqlFile | undefined;
  replacementAuthorization?: GraphModelSqlReplacementAuthorization;
}): GraphModelSqlPublicationDecision {
  const proposed = parseValidGraphManagedSql(args.proposedContent);
  if (!proposed) {
    throw new Error('Proposed graph-owned DBT model SQL must contain a valid managed marker.');
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

  if (args.currentFile.content.startsWith(GRAPH_MANAGED_SQL_MARKER_PREFIX)) {
    return parseValidGraphManagedSql(args.currentFile.content)
      ? {
          kind: 'replace_managed',
          content: args.proposedContent,
          expectedRevision,
        }
      : {
          kind: 'conflict',
          reason: 'invalid_managed',
        };
  }

  if (args.currentFile.content === proposed.payload) {
    return {
      kind: 'adopt_legacy_equivalent',
      content: args.proposedContent,
      expectedRevision,
    };
  }

  const replacementAuthorization = {
    observedContentSha256: args.currentFile.contentSha256,
    proposedContentSha256: sha256HexUtf8(args.proposedContent),
  } as const;
  if (
    args.replacementAuthorization?.observedContentSha256 ===
      replacementAuthorization.observedContentSha256 &&
    args.replacementAuthorization.proposedContentSha256 ===
      replacementAuthorization.proposedContentSha256
  ) {
    return {
      kind: 'replace_legacy_authorized',
      content: args.proposedContent,
      expectedRevision,
    };
  }

  return {
    kind: 'conflict',
    reason: 'unmarked',
    replacementAuthorization,
  };
}
