import { describe, expect, it } from 'vitest';

import {
  ApplyDbtYamlDescriptionEditRequestSchema,
  DbtYamlDescriptionAppliedReceiptSchema,
  DbtYamlDescriptionEditProposalSchema,
  DbtYamlDescriptionResourceIdentitySchema,
  RevertDbtYamlDescriptionEditRequestSchema,
} from '../src/index.js';

const proposal = {
  schemaVersion: 'dbt-yaml-description-edit-proposal.v1',
  canvasId: 'canvas-orders',
  resource: {
    uniqueId: 'model.analytics.orders',
    resourceType: 'model',
    name: 'orders',
    packageName: 'analytics',
  },
  path: 'analytics/models/orders.yml',
  previousDescription: 'Old description',
  nextDescription: 'Customer orders',
  expectedContentSha256: 'a'.repeat(64),
  candidateContent: 'version: 2\nmodels: []\n',
  candidateContentSha256: 'b'.repeat(64),
  unifiedDiff: '-old\n+new',
  proposalDigest: 'c'.repeat(64),
} as const;

const appliedReceipt = {
  schemaVersion: 'dbt-yaml-description-edit-applied-receipt.v1',
  receiptId: 'd'.repeat(64),
  canvasId: proposal.canvasId,
  resource: proposal.resource,
  path: proposal.path,
  previousDescription: proposal.previousDescription,
  nextDescription: proposal.nextDescription,
  expectedContentSha256: proposal.expectedContentSha256,
  appliedContentSha256: proposal.candidateContentSha256,
  proposalDigest: proposal.proposalDigest,
  idempotencyKey: 'edit-1',
  requestHash: 'e'.repeat(64),
  deduplicated: false,
  analysis: {
    freshness: 'fresh',
    analysisSha256: 'f'.repeat(64),
    projectContentSetSha256: '1'.repeat(64),
    targetContentSha256: proposal.candidateContentSha256,
  },
} as const;

describe('DbtYamlDescriptionEdit.v1', () => {
  it('accepts one strict proposal, apply request, and conditional revert request', () => {
    expect(DbtYamlDescriptionEditProposalSchema.parse(proposal)).toEqual(proposal);
    expect(
      ApplyDbtYamlDescriptionEditRequestSchema.parse({
        proposal,
        idempotencyKey: 'edit-1',
      })
    ).toEqual({ proposal, idempotencyKey: 'edit-1' });
    expect(DbtYamlDescriptionAppliedReceiptSchema.parse(appliedReceipt)).toEqual(appliedReceipt);
    expect(
      RevertDbtYamlDescriptionEditRequestSchema.parse({
        appliedReceiptId: appliedReceipt.receiptId,
        idempotencyKey: 'revert-1',
      })
    ).toEqual({ appliedReceiptId: appliedReceipt.receiptId, idempotencyKey: 'revert-1' });
  });

  it('rejects generic resource edits, malformed hashes, and incomplete source identity', () => {
    expect(
      DbtYamlDescriptionEditProposalSchema.safeParse({
        ...proposal,
        name: 'generic-node-update',
      }).success
    ).toBe(false);
    expect(
      DbtYamlDescriptionEditProposalSchema.safeParse({
        ...proposal,
        proposalDigest: 'not-a-hash',
      }).success
    ).toBe(false);
    expect(
      DbtYamlDescriptionResourceIdentitySchema.safeParse({
        uniqueId: 'source.analytics.raw.orders',
        resourceType: 'source',
        name: 'orders',
      }).success
    ).toBe(false);
  });

  it('rejects client-supplied revert receipts and analysis not bound to the written revision', () => {
    expect(
      RevertDbtYamlDescriptionEditRequestSchema.safeParse({
        appliedReceipt,
        idempotencyKey: 'revert-1',
      }).success
    ).toBe(false);
    expect(
      DbtYamlDescriptionAppliedReceiptSchema.safeParse({
        ...appliedReceipt,
        analysis: {
          ...appliedReceipt.analysis,
          targetContentSha256: '9'.repeat(64),
        },
      }).success
    ).toBe(false);
  });
});
