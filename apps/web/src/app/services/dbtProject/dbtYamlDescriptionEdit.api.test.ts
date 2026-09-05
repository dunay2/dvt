// @vitest-environment jsdom

import {
  DbtYamlDescriptionAppliedReceiptSchema,
  DbtYamlDescriptionEditProposalSchema,
  DbtYamlDescriptionRevertedReceiptSchema,
} from '@dvt/contracts';
import { beforeEach, describe, expect, it } from 'vitest';

import type { ApiClient } from '../api/createApiClient';
import { createApiClientHarness } from '../workspace/workspaceApiClient.test.harness';
import {
  buildWorkspaceScope,
  installWorkspaceScopeHarness,
  setWorkspaceScope,
} from '../workspace/workspaceScope.test.harness';
import { createApiDbtYamlDescriptionEditPort } from './dbtYamlDescriptionEdit.api';

installWorkspaceScopeHarness();

const PROPOSAL = DbtYamlDescriptionEditProposalSchema.parse({
  schemaVersion: 'dbt-yaml-description-edit-proposal.v1',
  canvasId: 'analytics-canvas',
  resource: {
    uniqueId: 'model.analytics.orders',
    resourceType: 'model',
    name: 'orders',
    packageName: 'analytics',
  },
  path: 'models/orders.yml',
  previousDescription: 'Old description',
  nextDescription: 'New description',
  expectedContentSha256: '1'.repeat(64),
  candidateContent: 'models:\n  - name: orders\n    description: New description\n',
  candidateContentSha256: '2'.repeat(64),
  unifiedDiff: '-    description: Old description\n+    description: New description',
  proposalDigest: '3'.repeat(64),
});

const APPLIED = DbtYamlDescriptionAppliedReceiptSchema.parse({
  schemaVersion: 'dbt-yaml-description-edit-applied-receipt.v1',
  receiptId: '4'.repeat(64),
  canvasId: PROPOSAL.canvasId,
  resource: PROPOSAL.resource,
  path: PROPOSAL.path,
  previousDescription: PROPOSAL.previousDescription,
  nextDescription: PROPOSAL.nextDescription,
  expectedContentSha256: PROPOSAL.expectedContentSha256,
  appliedContentSha256: PROPOSAL.candidateContentSha256,
  proposalDigest: PROPOSAL.proposalDigest,
  idempotencyKey: 'apply-1',
  requestHash: '5'.repeat(64),
  deduplicated: false,
  analysis: {
    freshness: 'fresh',
    analysisSha256: '6'.repeat(64),
    projectContentSetSha256: '7'.repeat(64),
    targetContentSha256: PROPOSAL.candidateContentSha256,
  },
});

const REVERTED = DbtYamlDescriptionRevertedReceiptSchema.parse({
  schemaVersion: 'dbt-yaml-description-edit-reverted-receipt.v1',
  receiptId: '8'.repeat(64),
  appliedReceiptId: APPLIED.receiptId,
  canvasId: APPLIED.canvasId,
  resource: APPLIED.resource,
  path: APPLIED.path,
  restoredDescription: APPLIED.previousDescription,
  expectedContentSha256: APPLIED.appliedContentSha256,
  revertedContentSha256: '9'.repeat(64),
  idempotencyKey: 'revert-1',
  requestHash: 'a'.repeat(64),
  deduplicated: false,
  analysis: {
    freshness: 'fresh',
    analysisSha256: 'b'.repeat(64),
    projectContentSetSha256: 'c'.repeat(64),
    targetContentSha256: '9'.repeat(64),
  },
});

describe('dbtYamlDescriptionEdit API port', () => {
  beforeEach(() => {
    setWorkspaceScope(buildWorkspaceScope());
  });

  it('executes propose, apply, and revert through scoped protected endpoints', async () => {
    const scope = buildWorkspaceScope();
    setWorkspaceScope(scope);
    const responses = [PROPOSAL, APPLIED, REVERTED];
    const postJsonImpl: ApiClient['postJson'] = async <TRequest, TResponse>() =>
      responses.shift() as TResponse;
    const { apiClient, postJson } = createApiClientHarness({ postJson: postJsonImpl });
    const port = createApiDbtYamlDescriptionEditPort(apiClient);

    await expect(
      port.propose({
        canvasId: PROPOSAL.canvasId,
        resourceUniqueId: PROPOSAL.resource.uniqueId,
        nextDescription: PROPOSAL.nextDescription,
      })
    ).resolves.toEqual(PROPOSAL);
    await expect(port.apply({ proposal: PROPOSAL, idempotencyKey: 'apply-1' })).resolves.toEqual(
      APPLIED
    );
    await expect(
      port.revert({ appliedReceiptId: APPLIED.receiptId, idempotencyKey: 'revert-1' })
    ).resolves.toEqual(REVERTED);

    const query = new URLSearchParams(scope).toString();
    expect(postJson.mock.calls.map(([endpoint]) => endpoint)).toEqual([
      `/workspace/dbt/description-edits/proposals?${query}`,
      `/workspace/dbt/description-edits/applications?${query}`,
      `/workspace/dbt/description-edits/reverts?${query}`,
    ]);
  });

  it('rejects malformed response data at the browser boundary', async () => {
    const postJsonImpl: ApiClient['postJson'] = async <TRequest, TResponse>() =>
      ({ schemaVersion: 'wrong' }) as TResponse;
    const { apiClient } = createApiClientHarness({ postJson: postJsonImpl });
    const port = createApiDbtYamlDescriptionEditPort(apiClient);

    await expect(
      port.propose({ canvasId: 'canvas', resourceUniqueId: 'model.x', nextDescription: null })
    ).rejects.toThrowError();
  });
});
