/** Owned concern: validate Canvas HTTP acquisition metadata against the bounded artifact contract. */
import {
  HttpJsonArtifactStepTypeConfigSchema,
  type HttpJsonArtifactStepTypeConfig,
} from '@dvt/contracts';

import type { CanonicalNode } from '../../types/canonical';

export const HTTP_JSON_PLUGIN_ID = 'dvt.http-json';
export const HTTP_JSON_ACQUISITION_NODE_KIND = 'dvt:http_json_acquisition';

export type HttpJsonArtifactExecutionScope = HttpJsonArtifactStepTypeConfig['scope'];
export type HttpJsonArtifactAuthoringMetadata = Omit<HttpJsonArtifactStepTypeConfig, 'scope'>;

export type HttpJsonArtifactAuthoringDraft = Readonly<{
  endpointRef: string;
  authCredentialRef: string;
  format: 'json' | 'jsonl';
  expectedSha256: string;
  expectedSizeBytes: string;
  maxBytes: string;
  storageUri: string;
  artifactCredentialRef: string;
  connectTimeoutMs: string;
  requestTimeoutMs: string;
  maxRedirects: string;
}>;

export const HTTP_JSON_AUTHORING_ERROR = {
  endpointRef: 'http_json_endpoint_ref_invalid',
  authCredentialRef: 'http_json_auth_credential_ref_invalid',
  expectedSha256: 'http_json_sha256_invalid',
  expectedSizeBytes: 'http_json_size_invalid',
  maxBytes: 'http_json_max_bytes_invalid',
  storageUri: 'http_json_storage_uri_invalid',
  artifactCredentialRef: 'http_json_artifact_credential_ref_invalid',
  connectTimeoutMs: 'http_json_connect_timeout_invalid',
  requestTimeoutMs: 'http_json_request_timeout_invalid',
  maxRedirects: 'http_json_redirect_limit_invalid',
} as const;

export type HttpJsonArtifactAuthoringErrors = Partial<
  Record<
    keyof typeof HTTP_JSON_AUTHORING_ERROR,
    (typeof HTTP_JSON_AUTHORING_ERROR)[keyof typeof HTTP_JSON_AUTHORING_ERROR]
  >
>;
export type HttpJsonArtifactAuthoringValidation =
  | Readonly<{ ok: true; metadata: HttpJsonArtifactAuthoringMetadata }>
  | Readonly<{ ok: false; errors: HttpJsonArtifactAuthoringErrors }>;

export function isHttpJsonArtifactNode(node: Pick<CanonicalNode, 'pluginId' | 'kind'>): boolean {
  return node.pluginId === HTTP_JSON_PLUGIN_ID && node.kind === HTTP_JSON_ACQUISITION_NODE_KIND;
}

export function createHttpJsonArtifactAuthoringDraft(
  node: CanonicalNode
): HttpJsonArtifactAuthoringDraft | null {
  if (!isHttpJsonArtifactNode(node)) return null;
  const metadata = recordValue(node.metadata?.httpJsonArtifact);
  const request = recordValue(metadata.request);
  const response = recordValue(metadata.response);
  const artifact = recordValue(metadata.artifact);
  const limits = recordValue(metadata.limits);
  return {
    endpointRef: stringValue(request.endpointRef),
    authCredentialRef: stringValue(request.authCredentialRef),
    format: response.format === 'json' ? 'json' : 'jsonl',
    expectedSha256: stringValue(response.expectedSha256),
    expectedSizeBytes: numberText(response.expectedSizeBytes),
    maxBytes: numberText(response.maxBytes),
    storageUri: stringValue(artifact.storageUri),
    artifactCredentialRef: stringValue(artifact.credentialRef),
    connectTimeoutMs: numberText(limits.connectTimeoutMs) || '1000',
    requestTimeoutMs: numberText(limits.requestTimeoutMs) || '5000',
    maxRedirects: numberText(limits.maxRedirects) || '0',
  };
}

export function validateHttpJsonArtifactAuthoringDraft(
  draft: HttpJsonArtifactAuthoringDraft
): HttpJsonArtifactAuthoringValidation {
  const mediaType = draft.format === 'json' ? 'application/json' : 'application/x-ndjson';
  const parsed = HttpJsonArtifactStepTypeConfigSchema.safeParse({
    scope: {
      tenantId: resolveTenantId(draft.storageUri),
      projectId: 'authoring',
      environmentId: 'authoring',
    },
    request: {
      method: 'GET',
      endpointRef: draft.endpointRef.trim(),
      headers: { accept: mediaType },
      ...(draft.authCredentialRef.trim().length === 0
        ? {}
        : { authCredentialRef: draft.authCredentialRef.trim() }),
    },
    response: {
      acceptedStatus: 200,
      format: draft.format,
      mediaType,
      encoding: 'utf-8',
      expectedSha256: draft.expectedSha256.trim(),
      expectedSizeBytes: Number(draft.expectedSizeBytes),
      maxBytes: Number(draft.maxBytes),
    },
    artifact: {
      storageUri: draft.storageUri.trim(),
      credentialRef: draft.artifactCredentialRef.trim(),
    },
    limits: {
      connectTimeoutMs: Number(draft.connectTimeoutMs),
      requestTimeoutMs: Number(draft.requestTimeoutMs),
      maxRedirects: Number(draft.maxRedirects),
    },
  });
  if (!parsed.success) {
    return { ok: false, errors: mapIssues(parsed.error.issues.map((issue) => issue.path)) };
  }
  const { scope: _scope, ...metadata } = parsed.data;
  return { ok: true, metadata };
}

export function applyHttpJsonArtifactAuthoringDraft(
  node: CanonicalNode,
  draft: HttpJsonArtifactAuthoringDraft
): CanonicalNode {
  const validation = validateHttpJsonArtifactAuthoringDraft(draft);
  if (!validation.ok) return node;
  return {
    ...node,
    metadata: { ...node.metadata, httpJsonArtifact: validation.metadata },
  };
}

export function projectHttpJsonArtifactStepTypeConfig(args: {
  node: CanonicalNode;
  executionScope: HttpJsonArtifactExecutionScope | undefined;
}):
  | Readonly<{ ok: true; stepTypeConfig: HttpJsonArtifactStepTypeConfig }>
  | Readonly<{ ok: false; message: string }> {
  if (!isHttpJsonArtifactNode(args.node)) {
    return { ok: false, message: `Node ${args.node.id} is not an HTTP JSON acquisition node.` };
  }
  if (args.executionScope === undefined) {
    return {
      ok: false,
      message: `HTTP JSON acquisition ${args.node.name} requires an authorized execution scope.`,
    };
  }
  const metadata = recordValue(args.node.metadata?.httpJsonArtifact);
  const parsed = HttpJsonArtifactStepTypeConfigSchema.safeParse({
    ...metadata,
    scope: {
      tenantId: args.executionScope.tenantId,
      projectId: args.executionScope.projectId,
      environmentId: args.executionScope.environmentId,
    },
  });
  return parsed.success
    ? { ok: true, stepTypeConfig: parsed.data }
    : {
        ok: false,
        message:
          `HTTP JSON acquisition ${args.node.name} is not fully configured ` +
          `(invalid fields: ${[
            ...new Set(parsed.error.issues.map((issue) => issue.path.join('.') || 'config')),
          ].join(', ')}).`,
      };
}

function mapIssues(paths: readonly (readonly PropertyKey[])[]): HttpJsonArtifactAuthoringErrors {
  const errors: HttpJsonArtifactAuthoringErrors = {};
  for (const [group, field] of paths) {
    if (group === 'request' && field === 'endpointRef')
      errors.endpointRef = HTTP_JSON_AUTHORING_ERROR.endpointRef;
    if (group === 'request' && field === 'authCredentialRef')
      errors.authCredentialRef = HTTP_JSON_AUTHORING_ERROR.authCredentialRef;
    if (group === 'response' && field === 'expectedSha256')
      errors.expectedSha256 = HTTP_JSON_AUTHORING_ERROR.expectedSha256;
    if (group === 'response' && field === 'expectedSizeBytes')
      errors.expectedSizeBytes = HTTP_JSON_AUTHORING_ERROR.expectedSizeBytes;
    if (group === 'response' && field === 'maxBytes')
      errors.maxBytes = HTTP_JSON_AUTHORING_ERROR.maxBytes;
    if (group === 'artifact' && field === 'storageUri')
      errors.storageUri = HTTP_JSON_AUTHORING_ERROR.storageUri;
    if (group === 'artifact' && field === 'credentialRef')
      errors.artifactCredentialRef = HTTP_JSON_AUTHORING_ERROR.artifactCredentialRef;
    if (group === 'limits' && field === 'connectTimeoutMs')
      errors.connectTimeoutMs = HTTP_JSON_AUTHORING_ERROR.connectTimeoutMs;
    if (group === 'limits' && field === 'requestTimeoutMs')
      errors.requestTimeoutMs = HTTP_JSON_AUTHORING_ERROR.requestTimeoutMs;
    if (group === 'limits' && field === 'maxRedirects')
      errors.maxRedirects = HTTP_JSON_AUTHORING_ERROR.maxRedirects;
  }
  return Object.keys(errors).length > 0
    ? errors
    : { endpointRef: HTTP_JSON_AUTHORING_ERROR.endpointRef };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function recordValue(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function numberText(value: unknown): string {
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : '';
}

function resolveTenantId(storageUri: string): string {
  return /\/tenants\/([^/]+)\//u.exec(storageUri.trim())?.[1] ?? '';
}
