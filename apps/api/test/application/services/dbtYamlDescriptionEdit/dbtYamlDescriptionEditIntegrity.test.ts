import {
  DbtProjectGraphProjectionSchema,
  type DbtYamlDescriptionEditProposal,
} from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import { DbtYamlDescriptionProposalMismatchError } from '../../../../src/application/ports/dbtYamlDescriptionEdit.js';
import {
  analysisReceipt,
  assertProposalIntegrity,
  batchIdempotencyKey,
  buildFocusedUnifiedDiff,
  operationReceiptId,
  operationRequestHash,
  proposalDigest,
  sha256,
} from '../../../../src/application/services/dbtYamlDescriptionEdit/dbtYamlDescriptionEditIntegrity.js';

const SCOPE = { tenantId: 'tenant-1', projectId: 'project-1', environmentId: 'dev' } as const;

describe('dbtYamlDescriptionEditIntegrity', () => {
  it('derives stable proposal identities and rejects any mutation of addressed values', () => {
    const proposal = createProposal();

    expect(proposalDigest({ ...proposal })).toBe(proposal.proposalDigest);
    expect(() => assertProposalIntegrity(proposal)).not.toThrow();

    expect(() =>
      assertProposalIntegrity({
        ...proposal,
        candidateContent: `${proposal.candidateContent}# forged`,
      })
    ).toThrow(DbtYamlDescriptionProposalMismatchError);
    expect(() =>
      assertProposalIntegrity({ ...proposal, nextDescription: 'Forged semantic intent' })
    ).toThrow(DbtYamlDescriptionProposalMismatchError);
  });

  it('canonicalizes request objects before deriving scoped command identities', () => {
    const first = operationRequestHash('apply', SCOPE, {
      proposalDigest: 'a'.repeat(64),
      idempotencyKey: 'edit-1',
      nested: { path: 'models/orders.yml', revision: 3 },
    });
    const reordered = operationRequestHash('apply', SCOPE, {
      nested: { revision: 3, path: 'models/orders.yml' },
      idempotencyKey: 'edit-1',
      proposalDigest: 'a'.repeat(64),
    });

    expect(reordered).toBe(first);
    expect(
      new Set([
        first,
        operationRequestHash('revert', SCOPE, {
          proposalDigest: 'a'.repeat(64),
          idempotencyKey: 'edit-1',
          nested: { path: 'models/orders.yml', revision: 3 },
        }),
        operationRequestHash(
          'apply',
          { ...SCOPE, tenantId: 'tenant-2' },
          {
            proposalDigest: 'a'.repeat(64),
            idempotencyKey: 'edit-1',
            nested: { path: 'models/orders.yml', revision: 3 },
          }
        ),
        operationRequestHash('apply', SCOPE, {
          proposalDigest: 'b'.repeat(64),
          idempotencyKey: 'edit-1',
          nested: { path: 'models/orders.yml', revision: 3 },
        }),
      ]).size
    ).toBe(4);
  });

  it('keeps receipt and batch identities deterministic, bounded, and operation-specific', () => {
    const requestHash = operationRequestHash('apply', SCOPE, { proposalDigest: 'a'.repeat(64) });

    expect(operationReceiptId('apply', requestHash)).toBe(operationReceiptId('apply', requestHash));
    expect(operationReceiptId('revert', requestHash)).not.toBe(
      operationReceiptId('apply', requestHash)
    );
    expect(batchIdempotencyKey('apply', 'x'.repeat(10_000))).toMatch(
      /^dbt-yaml-description-apply:[a-f0-9]{64}$/u
    );
    expect(batchIdempotencyKey('apply', 'edit-1')).not.toBe(
      batchIdempotencyKey('revert', 'edit-1')
    );
  });

  it('binds analysis evidence to the exact retained target revision', () => {
    const projection = DbtProjectGraphProjectionSchema.parse({
      schemaVersion: 'dbt-project-graph-projection.v1',
      authorityBinding: {
        schemaVersion: 'canvas-authoring-authority-binding.v1',
        canvasId: 'canvas-1',
        authority: { kind: 'dbt-project-files', projectRoot: 'analytics' },
      },
      freshness: 'fresh',
      projectRevision: {
        projectRoot: 'analytics',
        projectName: 'analytics',
        contentSetSha256: 'b'.repeat(64),
        analyzedAt: '2026-07-17T10:00:00.000Z',
        analyzerVersion: 'test',
        dbtVersion: '1.10.0',
      },
      analysisSha256: 'c'.repeat(64),
      adapterType: 'postgres',
      nodes: [],
      edges: [],
      diagnostics: [],
      executionTarget: {
        provider: 'temporal',
        adapter: 'postgres',
        targetName: 'dev',
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          connectionId: 'warehouse-dev',
          provider: 'postgres',
        },
        resolutionSource: 'environment-default',
        credentialRef: 'env:DBT_PROFILES_DIR',
      },
      capabilities: { canPreview: true, canRun: true, codeOnlyResourceCount: 0 },
    });

    expect(analysisReceipt(projection, 'd'.repeat(64))).toEqual({
      freshness: 'fresh',
      analysisSha256: 'c'.repeat(64),
      projectContentSetSha256: 'b'.repeat(64),
      targetContentSha256: 'd'.repeat(64),
    });
  });

  it('emits only the changed hunk with bounded surrounding context', () => {
    const before = [
      'version: 2',
      'models:',
      '  - name: orders',
      '    description: Old',
      '    tags: [mart]',
      'tests: []',
    ].join('\n');
    const after = before.replace('description: Old', 'description: Customer orders');

    const diff = buildFocusedUnifiedDiff(before, after, 'models/orders.yml');

    expect(diff).toContain('--- a/models/orders.yml');
    expect(diff).toContain('-    description: Old');
    expect(diff).toContain('+    description: Customer orders');
    expect(diff).not.toContain(' version: 2');
    expect(buildFocusedUnifiedDiff(before, before, 'models/orders.yml')).toBe('');
  });
});

function createProposal(): DbtYamlDescriptionEditProposal {
  const candidateContent = [
    'version: 2',
    'models:',
    '  - name: orders',
    '    description: Customer orders',
    '',
  ].join('\n');
  const addressedValues = {
    canvasId: 'canvas-1',
    resource: {
      uniqueId: 'model.analytics.orders',
      resourceType: 'model' as const,
      name: 'orders',
      packageName: 'analytics',
    },
    path: 'analytics/models/orders.yml',
    previousDescription: 'Old description',
    nextDescription: 'Customer orders',
    expectedContentSha256: 'a'.repeat(64),
    candidateContentSha256: sha256(candidateContent),
  };
  return {
    schemaVersion: 'dbt-yaml-description-edit-proposal.v1',
    ...addressedValues,
    candidateContent,
    unifiedDiff: '-    description: Old description\n+    description: Customer orders',
    proposalDigest: proposalDigest(addressedValues),
  };
}
