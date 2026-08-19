import { ACQUIRE_HTTP_JSON_ARTIFACT_MAX_BYTES } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
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
