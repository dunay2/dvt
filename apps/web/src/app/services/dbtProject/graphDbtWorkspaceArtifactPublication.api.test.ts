import {
  type GraphDbtWorkspaceArtifactPublicationResult,
  type PublishGraphDbtWorkspaceArtifactsRequest,
} from '@dvt/contracts';
import { sha256HexUtf8 } from '@dvt/crypto';
import { beforeEach, describe, expect, it } from 'vitest';

import type { ApiClient } from '../api/createApiClient';
import { createApiClientHarness } from '../workspace/workspaceApiClient.test.harness';
import {
  buildWorkspaceScope,
  installWorkspaceScopeHarness,
  setWorkspaceScope,
} from '../workspace/workspaceScope.test.harness';
import { createApiGraphDbtWorkspaceArtifactPublicationCommandPort } from './graphDbtWorkspaceArtifactPublication.api';

installWorkspaceScopeHarness();

const SQL_PAYLOAD = 'select 1\n';

const REQUEST: PublishGraphDbtWorkspaceArtifactsRequest = {
  canvasId: 'orders-canvas',
  artifacts: [
    {
      path: 'dbt_project.yml',
      content: 'name: analytics\n',
      language: 'yaml',
      expectedRevision: { kind: 'absent' },
      writeRequired: true,
    },
    {
      path: 'models/orders.sql',
      content: `-- dvt:graph-draft-content-sha256=${sha256HexUtf8(SQL_PAYLOAD)}\n${SQL_PAYLOAD}`,
      language: 'sql',
      expectedRevision: { kind: 'absent' },
      writeRequired: true,
    },
    {
      path: 'models/schema.yml',
      content: 'version: 2\n',
      language: 'yaml',
      expectedRevision: { kind: 'absent' },
      writeRequired: true,
    },
  ],
  idempotencyKey: 'graph-dbt:' + 'b'.repeat(64),
};

const RESULT: GraphDbtWorkspaceArtifactPublicationResult = {
  schemaVersion: 'graph-dbt-workspace-artifact-publication.v1',
  kind: 'applied',
  idempotencyKey: REQUEST.idempotencyKey,
  requestHash: 'c'.repeat(64),
  deduplicated: false,
  writes: REQUEST.artifacts.map((artifact) => ({
    path: artifact.path,
    contentSha256: 'd'.repeat(64),
  })),
};

describe('graph DBT workspace artifact publication API port', () => {
  beforeEach(() => {
    setWorkspaceScope(buildWorkspaceScope());
  });

  it('publishes through the single scoped protected endpoint', async () => {
    const scope = buildWorkspaceScope();
    setWorkspaceScope(scope);
    const postJsonImpl: ApiClient['postJson'] = async <TRequest, TResponse>() =>
      RESULT as TResponse;
    const { apiClient, postJson } = createApiClientHarness({ postJson: postJsonImpl });
    const port = createApiGraphDbtWorkspaceArtifactPublicationCommandPort(apiClient);

    await expect(port.publish(REQUEST)).resolves.toEqual(RESULT);
    expect(postJson).toHaveBeenCalledWith(
      `/workspace/dbt/graph-artifacts/publications?${new URLSearchParams(scope).toString()}`,
      REQUEST
    );
  });

  it('rejects malformed result data at the browser boundary', async () => {
    const postJsonImpl: ApiClient['postJson'] = async <TRequest, TResponse>() =>
      ({ kind: 'applied' }) as TResponse;
    const { apiClient } = createApiClientHarness({ postJson: postJsonImpl });
    const port = createApiGraphDbtWorkspaceArtifactPublicationCommandPort(apiClient);

    await expect(port.publish(REQUEST)).rejects.toThrow();
  });
});
