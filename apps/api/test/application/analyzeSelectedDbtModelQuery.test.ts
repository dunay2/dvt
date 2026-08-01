import { describe, expect, it, vi } from 'vitest';

import type { DbtProjectAnalysis } from '../../src/application/ports/dbtProjectAnalysis.js';
import { DbtProjectFileAuthorityRequiredError } from '../../src/application/ports/dbtProjectImport.js';
import { AnalyzeSelectedDbtModelQuery } from '../../src/application/services/analyzeSelectedDbtModelQuery.js';

import {
  SELECTED_MODEL_ANALYSIS_SCOPE,
  SELECTED_MODEL_FILE_AUTHORITY,
  validSelectedModelProjectAnalysis,
} from './analyzeSelectedDbtModelQuery.fixtures.js';

describe('AnalyzeSelectedDbtModelQuery', () => {
  it('projects one deterministic selected-model analysis from native evidence', async () => {
    const analysis = validSelectedModelProjectAnalysis();
    const query = buildQuery(analysis);

    const first = await query.execute({
      scope: SELECTED_MODEL_ANALYSIS_SCOPE,
      canvasId: SELECTED_MODEL_FILE_AUTHORITY.canvasId,
      selectedUniqueId: 'model.analytics.orders',
    });
    const second = await buildQuery({
      ...analysis,
      projectRevision: {
        ...analysis.projectRevision,
        analyzedAt: '2026-08-01T11:00:00.000Z',
      },
    }).execute({
      scope: SELECTED_MODEL_ANALYSIS_SCOPE,
      canvasId: SELECTED_MODEL_FILE_AUTHORITY.canvasId,
      selectedUniqueId: 'model.analytics.orders',
    });

    expect(first.status).toBe('ready');
    expect(first.identities).toEqual([
      expect.objectContaining({
        uniqueId: 'macro.analytics.normalize_order',
        relationToSelection: 'macro',
      }),
      expect.objectContaining({
        uniqueId: 'model.analytics.orders',
        relationToSelection: 'selected',
      }),
      expect.objectContaining({
        uniqueId: 'source.analytics.raw.orders',
        relationToSelection: 'upstream',
      }),
      expect.objectContaining({
        uniqueId: 'test.analytics.not_null_orders_order_id',
        relationToSelection: 'test',
      }),
    ]);
    expect(first.dependencies).toEqual([
      {
        sourceUniqueId: 'macro.analytics.normalize_order',
        targetUniqueId: 'model.analytics.orders',
        relation: 'macro',
      },
      {
        sourceUniqueId: 'model.analytics.orders',
        targetUniqueId: 'test.analytics.not_null_orders_order_id',
        relation: 'test_target',
      },
      {
        sourceUniqueId: 'source.analytics.raw.orders',
        targetUniqueId: 'model.analytics.orders',
        relation: 'dependency',
        regionId: 'region-source-orders',
      },
    ]);
    expect(first.regions).toEqual([
      expect.objectContaining({
        regionId: 'region-source-orders',
        classification: 'supported',
        targetUniqueId: 'source.analytics.raw.orders',
      }),
      expect.objectContaining({
        regionId: 'region-dynamic',
        classification: 'code_only',
        reasonCode: 'dbt_jinja_dynamic_argument',
      }),
    ]);
    expect(first.files).toEqual(analysis.semanticEvidence.files);
    expect(second.selectedAnalysisSha256).toBe(first.selectedAnalysisSha256);
    expect(second.capabilitySet.capabilitySetSha256).toBe(first.capabilitySet.capabilitySetSha256);
  });

  it('refuses a missing or non-model selection with a typed diagnostic', async () => {
    const result = await buildQuery(validSelectedModelProjectAnalysis()).execute({
      scope: SELECTED_MODEL_ANALYSIS_SCOPE,
      canvasId: SELECTED_MODEL_FILE_AUTHORITY.canvasId,
      selectedUniqueId: 'model.analytics.missing',
    });

    expect(result.status).toBe('refused');
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: 'dbt_selected_model_not_found',
        severity: 'error',
        subject: {
          kind: 'resource',
          uniqueId: 'model.analytics.missing',
        },
      }),
    ]);
  });

  it('returns unavailable without inventing semantic evidence when native analysis is unavailable', async () => {
    const result = await buildQuery({
      ...validSelectedModelProjectAnalysis(),
      status: 'unavailable',
      resources: [],
      dependencies: [],
      semanticEvidence: { files: [], identities: [], regions: [], diagnostics: [] },
      diagnostics: [
        {
          code: 'dbt_analyzer_unavailable',
          severity: 'error',
          message: 'The server-managed dbt analyzer process is unavailable.',
        },
      ],
    }).execute({
      scope: SELECTED_MODEL_ANALYSIS_SCOPE,
      canvasId: SELECTED_MODEL_FILE_AUTHORITY.canvasId,
      selectedUniqueId: 'model.analytics.orders',
    });

    expect(result.status).toBe('unavailable');
    expect(result.identities).toEqual([]);
    expect(result.regions).toEqual([]);
    expect(result.diagnostics[0]).toEqual(
      expect.objectContaining({
        code: 'dbt_analyzer_unavailable',
        subject: { kind: 'project' },
      })
    );
  });

  it('rejects graph-draft authority before invoking native analysis', async () => {
    const analyze = vi.fn();
    const query = new AnalyzeSelectedDbtModelQuery({
      analyzer: { analyze },
      authorityPolicy: {
        resolve: vi.fn().mockResolvedValue({
          ...SELECTED_MODEL_FILE_AUTHORITY,
          authority: { kind: 'graph-draft' },
        }),
      },
    });

    await expect(
      query.execute({
        scope: SELECTED_MODEL_ANALYSIS_SCOPE,
        canvasId: SELECTED_MODEL_FILE_AUTHORITY.canvasId,
        selectedUniqueId: 'model.analytics.orders',
      })
    ).rejects.toBeInstanceOf(DbtProjectFileAuthorityRequiredError);
    expect(analyze).not.toHaveBeenCalled();
  });
});

function buildQuery(analysis: DbtProjectAnalysis): AnalyzeSelectedDbtModelQuery {
  return new AnalyzeSelectedDbtModelQuery({
    analyzer: { analyze: vi.fn().mockResolvedValue(analysis) },
    authorityPolicy: { resolve: vi.fn().mockResolvedValue(SELECTED_MODEL_FILE_AUTHORITY) },
  });
}
