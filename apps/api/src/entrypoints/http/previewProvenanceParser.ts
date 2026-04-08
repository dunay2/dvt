import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { badRequestResult, type RouteParseResult } from './routeParseIssue.js';

type GitArtifactRef = {
  readonly repo: string;
  readonly gitRef: string;
  readonly path: string;
  readonly sha256: string;
};

export type PreviewProvenance = {
  readonly graphArtifact: GitArtifactRef;
  readonly sqlArtifact: GitArtifactRef;
};

export function parsePreviewProvenance(
  raw: unknown
): RouteParseResult<PreviewProvenance | undefined> {
  if (raw === undefined) {
    return { ok: true, value: undefined };
  }
  if (!isPlainRecord(raw)) {
    return badRequestResult(HTTP_ERROR_REASON.invalidPlanSource);
  }

  const graphArtifact = parseGitArtifactRef(raw.graphArtifact);
  if (!graphArtifact.ok) {
    return graphArtifact;
  }

  const sqlArtifact = parseGitArtifactRef(raw.sqlArtifact);
  if (!sqlArtifact.ok) {
    return sqlArtifact;
  }

  return {
    ok: true,
    value: {
      graphArtifact: graphArtifact.value,
      sqlArtifact: sqlArtifact.value,
    },
  };
}

function parseGitArtifactRef(raw: unknown): RouteParseResult<GitArtifactRef> {
  if (!isPlainRecord(raw)) {
    return badRequestResult(HTTP_ERROR_REASON.invalidPlanSource);
  }

  const repo = asNonEmptyTrimmedString(raw.repo);
  const gitRef = asNonEmptyTrimmedString(raw.gitRef);
  const path = asNonEmptyTrimmedString(raw.path);
  const sha256 = asLowerHexSha256(raw.sha256);

  if (repo === undefined || gitRef === undefined || path === undefined || sha256 === undefined) {
    return badRequestResult(HTTP_ERROR_REASON.invalidPlanSource);
  }

  return {
    ok: true,
    value: {
      repo,
      gitRef,
      path,
      sha256,
    },
  };
}

function asNonEmptyTrimmedString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function asLowerHexSha256(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  return /^[0-9a-f]{64}$/u.test(normalized) ? normalized : undefined;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
