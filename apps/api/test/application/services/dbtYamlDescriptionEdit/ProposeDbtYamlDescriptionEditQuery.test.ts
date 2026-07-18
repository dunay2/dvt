import { createHash } from 'node:crypto';

import { describe, expect, it, vi } from 'vitest';

import { ProposeDbtYamlDescriptionEditQuery } from '../../../../src/application/services/dbtYamlDescriptionEdit/ProposeDbtYamlDescriptionEditQuery.js';
import { YamlCstDbtDescriptionMutator } from '../../../../src/infrastructure/dbtYamlDescriptionEdit/YamlCstDbtDescriptionMutator.js';

const SCOPE = { tenantId: 'tenant-1', projectId: 'project-1', environmentId: 'dev' } as const;
const PATH = 'analytics/models/orders.yml';
const CONTENT = [
  'version: 2',
  'models:',
  '  - name: orders',
  '    description: Old description',
  '    tags: [mart] # preserve',
  '',
].join('\n');

describe('ProposeDbtYamlDescriptionEditQuery', () => {
  it('returns a content-addressed focused diff without invoking a mutation command', async () => {
    const getFileContent = vi.fn().mockResolvedValue({
      path: PATH,
      name: 'orders.yml',
      language: 'yaml',
      content: CONTENT,
      contentSha256: sha256(CONTENT),
      lastModified: '2026-07-17T10:00:00.000Z',
    });
    const query = new ProposeDbtYamlDescriptionEditQuery({
      resolver: {
        resolve: vi.fn().mockResolvedValue({
          resource: {
            uniqueId: 'model.analytics.orders',
            resourceType: 'model',
            name: 'orders',
            packageName: 'analytics',
          },
          path: PATH,
        }),
      },
      workspaceFiles: { getFileContent },
      mutator: new YamlCstDbtDescriptionMutator(),
    });

    const proposal = await query.propose({
      scope: SCOPE,
      canvasId: 'canvas-1',
      resourceUniqueId: 'model.analytics.orders',
      nextDescription: 'Customer orders',
    });

    expect(proposal).toMatchObject({
      schemaVersion: 'dbt-yaml-description-edit-proposal.v1',
      path: PATH,
      previousDescription: 'Old description',
      nextDescription: 'Customer orders',
      expectedContentSha256: sha256(CONTENT),
    });
    expect(proposal.resource.packageName).toBe('analytics');
    expect(proposal.proposalDigest).toMatch(/^[a-f0-9]{64}$/u);
    expect(proposal.unifiedDiff).toContain('-    description: Old description');
    expect(proposal.unifiedDiff).toContain('+    description: Customer orders');
    expect(proposal.unifiedDiff).not.toContain('version: 2');
  });
});

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}
