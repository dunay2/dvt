import { DbtDependencyEditRequestSchema } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import { projectSelectedDbtModelAnalysis } from '../../../../src/application/services/selectedDbtModelAnalysisProjection.js';

import {
  AUTHORITY,
  createHarness,
  request,
  sha,
} from './ApplySelectedDbtDependencyEditCommand.test.fixtures.js';

describe('ApplySelectedDbtDependencyEditCommand refusals', () => {
  it('refuses stale analysis before reading or writing', async () => {
    const harness = createHarness();
    const input = request(harness);
    const { scope, ...requestBody } = input;

    const result = await harness.command.apply({
      ...DbtDependencyEditRequestSchema.parse({
        ...requestBody,
        expectedAnalysisSha256: sha('stale'),
      }),
      scope,
    });

    expect(result).toEqual(
      expect.objectContaining({
        kind: 'refused',
        finding: expect.objectContaining({ code: 'dbt_dependency_edit_analysis_stale' }),
      })
    );
    expect(harness.analyzeCandidate).not.toHaveBeenCalled();
    expect(harness.apply).not.toHaveBeenCalled();
  });

  it('refuses a code-only region before candidate analysis', async () => {
    const harness = createHarness();
    const rawRegion = harness.current.semanticEvidence.regions[0];
    if (rawRegion === undefined || rawRegion.classification !== 'supported') {
      throw new Error('Missing supported fixture region');
    }
    const { targetUniqueId: _targetUniqueId, ...regionBase } = rawRegion;
    const current = {
      ...harness.current,
      semanticEvidence: {
        ...harness.current.semanticEvidence,
        regions: [
          {
            ...regionBase,
            classification: 'code_only',
            reasonCode: 'dbt_jinja_dynamic_argument',
          },
        ],
      },
    } as const;
    const selected = projectSelectedDbtModelAnalysis({
      authorityBinding: AUTHORITY,
      analysis: current,
      selectedUniqueId: 'model.analytics.orders',
    });
    harness.resolve.mockResolvedValue({
      authorityBinding: AUTHORITY,
      nativeAnalysis: current,
      selectedAnalysis: selected,
    });

    const result = await harness.command.apply({
      ...request(harness),
      expectedSelectedAnalysisSha256: selected.selectedAnalysisSha256,
      regionId: rawRegion.regionId,
    });

    expect(result).toEqual(
      expect.objectContaining({
        kind: 'refused',
        finding: expect.objectContaining({ code: 'dbt_dependency_edit_region_code_only' }),
      })
    );
    expect(harness.analyzeCandidate).not.toHaveBeenCalled();
    expect(harness.apply).not.toHaveBeenCalled();
  });

  it('refuses overlapping semantic regions before candidate analysis', async () => {
    const harness = createHarness();
    const region = harness.current.semanticEvidence.regions[0];
    if (region === undefined) throw new Error('Missing fixture region');
    const current = {
      ...harness.current,
      semanticEvidence: {
        ...harness.current.semanticEvidence,
        regions: [region, { ...region, regionId: 'overlapping-region' }],
      },
    };
    harness.resolve.mockResolvedValue({
      authorityBinding: AUTHORITY,
      nativeAnalysis: current,
      selectedAnalysis: harness.selected,
    });

    const result = await harness.command.apply({
      ...request(harness),
      expectedAnalysisSha256: current.analysisSha256,
      expectedSelectedAnalysisSha256: harness.selected.selectedAnalysisSha256,
    });

    expect(result).toEqual(
      expect.objectContaining({
        kind: 'refused',
        finding: expect.objectContaining({
          code: 'dbt_dependency_edit_invariant_failed',
          evidence: { reasonCode: 'overlapping_semantic_regions' },
        }),
      })
    );
    expect(harness.analyzeCandidate).not.toHaveBeenCalled();
    expect(harness.apply).not.toHaveBeenCalled();
  });

  it('refuses a candidate rejected by native dbt validation', async () => {
    const harness = createHarness();
    harness.analyzeCandidate.mockResolvedValue({
      kind: 'analyzed',
      analysis: { ...harness.candidate, status: 'invalid' },
    });

    const result = await harness.command.apply(request(harness));

    expect(result).toEqual(
      expect.objectContaining({
        kind: 'refused',
        finding: expect.objectContaining({ code: 'dbt_dependency_edit_validation_failed' }),
      })
    );
    expect(harness.apply).not.toHaveBeenCalled();
  });

  it('refuses a candidate that does not resolve to the requested identity', async () => {
    const harness = createHarness();
    const region = harness.candidate.semanticEvidence.regions[0];
    if (region === undefined || region.classification !== 'supported') {
      throw new Error('Missing candidate fixture region');
    }
    harness.analyzeCandidate.mockResolvedValue({
      kind: 'analyzed',
      analysis: {
        ...harness.candidate,
        semanticEvidence: {
          ...harness.candidate.semanticEvidence,
          regions: [{ ...region, targetUniqueId: 'source.analytics.raw.orders' }],
        },
      },
    });

    const result = await harness.command.apply(request(harness));

    expect(result).toEqual(
      expect.objectContaining({
        kind: 'refused',
        finding: expect.objectContaining({ code: 'dbt_dependency_edit_semantic_mismatch' }),
      })
    );
    expect(harness.apply).not.toHaveBeenCalled();
  });
});
