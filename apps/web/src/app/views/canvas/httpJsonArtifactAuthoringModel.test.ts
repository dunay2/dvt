import { ACQUIRE_HTTP_JSON_ARTIFACT_MAX_BYTES } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import { projectWorkspaceGraphAuthoringDraftSemanticGraph } from '../../services/workspace/workspaceGraphDraftProjection';
import type { CanonicalNode } from '../../types/canonical';
import { projectCanonicalNodeToAuthoringNode } from './canvasDraftAuthoring';
import {
  applyHttpJsonArtifactAuthoringDraft,
  createHttpJsonArtifactAuthoringDraft,
  projectHttpJsonArtifactStepTypeConfig,
  validateHttpJsonArtifactAuthoringDraft,
} from './httpJsonArtifactAuthoringModel';

const SHA256 = 'a'.repeat(64);
const WORKSPACE_SCOPE = {
  tenantId: 'tenant',
  projectId: 'project',
  environmentId: 'dev',
} as const;
const NODE: CanonicalNode = {
  id: 'acquire-orders',
  name: 'Acquire orders',
  pluginId: 'dvt.http-json',
  kind: 'dvt:http_json_acquisition',
  role: 'input',
  status: 'idle',
  tags: [],
  metadata: {
    httpJsonArtifact: {
      request: {
        method: 'GET',
        endpointRef: 'http-endpoint:orders',
        headers: { accept: 'application/x-ndjson' },
        authCredentialRef: 'http-auth:orders',
      },
      response: {
        acceptedStatus: 200,
        format: 'jsonl',
        mediaType: 'application/x-ndjson',
        encoding: 'utf-8',
        expectedSha256: SHA256,
        expectedSizeBytes: 15,
        maxBytes: 1_000,
      },
      artifact: {
        storageUri: `s3://het2-artifacts/tenants/tenant/${SHA256}`,
        credentialRef: 'object-store:het2-artifacts',
      },
      limits: { connectTimeoutMs: 1_000, requestTimeoutMs: 5_000, maxRedirects: 1 },
    },
  },
};

describe('HTTP JSON artifact Canvas authoring', () => {
  it('round-trips opaque acquisition refs without accepting a URL or secret header', () => {
    const draft = createHttpJsonArtifactAuthoringDraft(NODE)!;
    expect(validateHttpJsonArtifactAuthoringDraft(draft, WORKSPACE_SCOPE)).toMatchObject({
      ok: true,
    });
    expect(
      applyHttpJsonArtifactAuthoringDraft(NODE, draft, WORKSPACE_SCOPE).metadata?.httpJsonArtifact
    ).toEqual(NODE.metadata?.httpJsonArtifact);

    expect(
      validateHttpJsonArtifactAuthoringDraft(
        {
          ...draft,
          endpointRef: 'https://orders.example.test/data',
        },
        WORKSPACE_SCOPE
      )
    ).toMatchObject({ ok: false, errors: { endpointRef: expect.any(String) } });
    expect(
      validateHttpJsonArtifactAuthoringDraft(
        {
          ...draft,
          authCredentialRef: 'Bearer secret',
        },
        WORKSPACE_SCOPE
      )
    ).toMatchObject({ ok: false, errors: { authCredentialRef: expect.any(String) } });
  });

  it('projects exact authorized scope into the canonical step config', () => {
    const workspaceScope = {
      tenantId: 'tenant',
      projectId: 'project',
      environmentId: 'dev',
      targetAdapter: 'temporal',
    };

    expect(
      projectHttpJsonArtifactStepTypeConfig({
        node: NODE,
        executionScope: workspaceScope,
      })
    ).toMatchObject({
      ok: true,
      stepTypeConfig: {
        scope: { tenantId: 'tenant', projectId: 'project', environmentId: 'dev' },
        request: { endpointRef: 'http-endpoint:orders' },
      },
    });
  });

  it.each([
    ['json', 'application/json'],
    ['jsonl', 'application/x-ndjson'],
  ] as const)(
    'keeps %s format aligned across request, response, Apply and Preview',
    (format, mediaType) => {
      const draft = createHttpJsonArtifactAuthoringDraft(NODE)!;
      const applied = applyHttpJsonArtifactAuthoringDraft(
        NODE,
        { ...draft, format },
        WORKSPACE_SCOPE
      );

      expect(applied.metadata?.httpJsonArtifact).toMatchObject({
        request: { headers: { accept: mediaType } },
        response: { format, mediaType },
      });
      expect(
        projectHttpJsonArtifactStepTypeConfig({ node: applied, executionScope: WORKSPACE_SCOPE })
      ).toMatchObject({
        ok: true,
        stepTypeConfig: {
          request: { headers: { accept: mediaType } },
          response: { format, mediaType },
        },
      });
    }
  );

  it('keeps the optional HTTP auth reference absent through Apply and Preview', () => {
    const draft = createHttpJsonArtifactAuthoringDraft(NODE)!;
    const applied = applyHttpJsonArtifactAuthoringDraft(
      NODE,
      { ...draft, authCredentialRef: '' },
      WORKSPACE_SCOPE
    );

    expect(
      (applied.metadata?.httpJsonArtifact as { request?: Record<string, unknown> })?.request
    ).not.toHaveProperty('authCredentialRef');
    expect(
      projectHttpJsonArtifactStepTypeConfig({ node: applied, executionScope: WORKSPACE_SCOPE })
    ).toMatchObject({ ok: true });
  });

  it.each([
    [
      'endpointRef',
      { endpointRef: 'https://orders.example.test' },
      'http_json_endpoint_ref_invalid',
    ],
    ['authCredentialRef', { authCredentialRef: 'secret' }, 'http_json_auth_credential_ref_invalid'],
    ['expectedSha256', { expectedSha256: 'not-a-sha' }, 'http_json_sha256_invalid'],
    [
      'artifactCredentialRef',
      { artifactCredentialRef: 'postgres:wrong-namespace' },
      'http_json_artifact_credential_ref_invalid',
    ],
    ['maxRedirects', { maxRedirects: '1.5' }, 'http_json_redirect_limit_invalid'],
  ] as const)('maps invalid %s through its existing field error', (field, patch, error) => {
    const draft = createHttpJsonArtifactAuthoringDraft(NODE)!;

    expect(
      validateHttpJsonArtifactAuthoringDraft({ ...draft, ...patch }, WORKSPACE_SCOPE)
    ).toMatchObject({ ok: false, errors: { [field]: error } });
  });

  it('preserves HTTP artifact metadata through the protected Graph Draft projection', () => {
    const authoringNode = projectCanonicalNodeToAuthoringNode(NODE);
    const reopened = projectWorkspaceGraphAuthoringDraftSemanticGraph({
      canvas: { kind: 'transformation', title: 'Plugin authoring proof' },
      nodeIds: [NODE.id],
      nodePositions: { [NODE.id]: { x: 0, y: 0 } },
      nodes: [authoringNode],
      edges: [],
    }).canonicalNodes[0];

    expect(reopened?.metadata?.httpJsonArtifact).toEqual(NODE.metadata?.httpJsonArtifact);
    expect(
      projectHttpJsonArtifactStepTypeConfig({ node: reopened!, executionScope: WORKSPACE_SCOPE })
    ).toMatchObject({ ok: true, stepTypeConfig: { scope: WORKSPACE_SCOPE } });
  });

  it('rejects another tenant artifact before applying the draft', () => {
    const draft = createHttpJsonArtifactAuthoringDraft(NODE);
    expect(draft).not.toBeNull();
    if (draft == null) return;
    const foreignTenantDraft = {
      ...draft,
      storageUri: `s3://het2-artifacts/tenants/other-tenant/${SHA256}`,
    };

    expect(validateHttpJsonArtifactAuthoringDraft(foreignTenantDraft, WORKSPACE_SCOPE)).toEqual({
      ok: false,
      errors: { storageUri: 'http_json_storage_uri_invalid' },
    });
    expect(applyHttpJsonArtifactAuthoringDraft(NODE, foreignTenantDraft, WORKSPACE_SCOPE)).toEqual(
      NODE
    );
  });

  it('reports only invalid field paths when persisted metadata is incomplete', () => {
    const incompleteNode: CanonicalNode = {
      ...NODE,
      metadata: { httpJsonArtifact: { response: { expectedSha256: SHA256 } } },
    };

    expect(
      projectHttpJsonArtifactStepTypeConfig({
        node: incompleteNode,
        executionScope: { tenantId: 'tenant', projectId: 'project', environmentId: 'dev' },
      })
    ).toMatchObject({
      ok: false,
      message: expect.stringContaining('invalid fields: request'),
    });
  });

  it('keeps expected-size ceiling and maximum-relation failures on the existing field', () => {
    const draft = createHttpJsonArtifactAuthoringDraft(NODE);
    expect(draft).not.toBeNull();
    if (draft == null) return;

    expect(
      validateHttpJsonArtifactAuthoringDraft(
        {
          ...draft,
          expectedSizeBytes: '1.5',
        },
        WORKSPACE_SCOPE
      )
    ).toMatchObject({ ok: false, errors: { expectedSizeBytes: 'http_json_size_invalid' } });
    expect(
      validateHttpJsonArtifactAuthoringDraft(
        {
          ...draft,
          expectedSizeBytes: String(ACQUIRE_HTTP_JSON_ARTIFACT_MAX_BYTES + 1),
        },
        WORKSPACE_SCOPE
      )
    ).toMatchObject({ ok: false, errors: { expectedSizeBytes: 'http_json_size_invalid' } });
    expect(
      validateHttpJsonArtifactAuthoringDraft(
        {
          ...draft,
          expectedSizeBytes: '1001',
          maxBytes: '1000',
        },
        WORKSPACE_SCOPE
      )
    ).toMatchObject({ ok: false, errors: { expectedSizeBytes: 'http_json_size_invalid' } });
    expect(
      validateHttpJsonArtifactAuthoringDraft(
        {
          ...draft,
          maxBytes: '1.5',
        },
        WORKSPACE_SCOPE
      )
    ).toMatchObject({ ok: false, errors: { maxBytes: 'http_json_max_bytes_invalid' } });
  });

  it('keeps fractional and relational timeout failures on their existing fields', () => {
    const draft = createHttpJsonArtifactAuthoringDraft(NODE);
    expect(draft).not.toBeNull();
    if (draft == null) return;

    expect(
      validateHttpJsonArtifactAuthoringDraft(
        {
          ...draft,
          connectTimeoutMs: '100.5',
        },
        WORKSPACE_SCOPE
      )
    ).toMatchObject({
      ok: false,
      errors: { connectTimeoutMs: 'http_json_connect_timeout_invalid' },
    });
    expect(
      validateHttpJsonArtifactAuthoringDraft(
        {
          ...draft,
          requestTimeoutMs: '100.5',
        },
        WORKSPACE_SCOPE
      )
    ).toMatchObject({
      ok: false,
      errors: { requestTimeoutMs: 'http_json_request_timeout_invalid' },
    });
    expect(
      validateHttpJsonArtifactAuthoringDraft(
        {
          ...draft,
          connectTimeoutMs: '5001',
          requestTimeoutMs: '5000',
        },
        WORKSPACE_SCOPE
      )
    ).toMatchObject({
      ok: false,
      errors: { connectTimeoutMs: 'http_json_connect_timeout_invalid' },
    });
  });
});
