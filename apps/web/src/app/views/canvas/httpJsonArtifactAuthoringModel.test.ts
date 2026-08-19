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
    expect(validateHttpJsonArtifactAuthoringDraft(draft)).toMatchObject({ ok: true });
    expect(applyHttpJsonArtifactAuthoringDraft(NODE, draft).metadata?.httpJsonArtifact).toEqual(
      NODE.metadata?.httpJsonArtifact
    );

    expect(
      validateHttpJsonArtifactAuthoringDraft({
        ...draft,
        endpointRef: 'https://orders.example.test/data',
      })
    ).toMatchObject({ ok: false, errors: { endpointRef: expect.any(String) } });
    expect(
      validateHttpJsonArtifactAuthoringDraft({
        ...draft,
        authCredentialRef: 'Bearer secret',
      })
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
      validateHttpJsonArtifactAuthoringDraft({
        ...draft,
        expectedSizeBytes: String(ACQUIRE_HTTP_JSON_ARTIFACT_MAX_BYTES + 1),
      })
    ).toMatchObject({ ok: false, errors: { expectedSizeBytes: 'http_json_size_invalid' } });
    expect(
      validateHttpJsonArtifactAuthoringDraft({
        ...draft,
        expectedSizeBytes: '1001',
        maxBytes: '1000',
      })
    ).toMatchObject({ ok: false, errors: { expectedSizeBytes: 'http_json_size_invalid' } });
  });
});
