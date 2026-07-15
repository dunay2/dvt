import { describe, expect, it, vi } from 'vitest';

import { CanvasAuthoringAuthorityPolicy } from '../../src/application/services/canvasAuthoringAuthorityPolicy.js';
import { buildDbtProjectImportRuntime } from '../../src/modules/dbtProjectImport/buildDbtProjectImportRuntime.js';

const SCOPE = { tenantId: 'tenant-a', projectId: 'project-a', environmentId: 'dev' } as const;

describe('buildDbtProjectImportRuntime', () => {
  it('shares one analyzer across validation and persisted-authority projection', async () => {
    const analyzer = {
      analyze: vi.fn().mockResolvedValue({
        status: 'valid',
        projectRevision: {
          projectRoot: 'analytics',
          contentSetSha256: 'a'.repeat(64),
          analyzedAt: '2026-07-14T10:00:00.000Z',
          analyzerVersion: 'dvt-dbt-analyzer.v1',
          dbtVersion: '1.10.0',
        },
        analysisSha256: 'b'.repeat(64),
        resources: [],
        dependencies: [],
        diagnostics: [],
      }),
    };
    const authorityStore = {
      read: vi.fn().mockResolvedValue({
        binding: {
          schemaVersion: 'canvas-authoring-authority-binding.v1',
          canvasId: 'orders-canvas',
          authority: { kind: 'dbt-project-files', projectRoot: 'analytics' },
        },
      }),
    };
    const runtime = buildDbtProjectImportRuntime({
      analyzer,
      inspector: {
        inspect: vi.fn().mockResolvedValue({
          projectRoot: 'analytics',
          projectName: 'analytics',
          inventory: {
            fileCount: 1,
            totalBytes: 10,
            includedFileCount: 1,
            excludedFileCount: 0,
            files: [
              {
                path: 'analytics/dbt_project.yml',
                classification: 'project-config',
                byteSize: 10,
                decision: 'included',
              },
            ],
          },
          diagnostics: [],
        }),
      },
      authorityStore: authorityStore as never,
      authorityPolicy: new CanvasAuthoringAuthorityPolicy(authorityStore as never),
      graphDraftStore: {} as never,
      receiptStore: {} as never,
      now: () => new Date('2026-07-14T10:00:00.000Z'),
    });

    const validation = await runtime.validateUseCase.execute(SCOPE, {
      schemaVersion: 'validate-dbt-project-import-request.v1',
      projectRoot: 'analytics',
    });
    const projection = await runtime.projectGraphUseCase.execute({
      scope: SCOPE,
      canvasId: 'orders-canvas',
    });

    expect(validation.status).toBe('accepted');
    expect(projection.freshness).toBe('fresh');
    expect(analyzer.analyze).toHaveBeenCalledTimes(2);
    expect(analyzer.analyze).toHaveBeenNthCalledWith(1, {
      scope: SCOPE,
      projectRoot: 'analytics',
    });
    expect(analyzer.analyze).toHaveBeenNthCalledWith(2, {
      scope: SCOPE,
      projectRoot: 'analytics',
    });
  });
});
