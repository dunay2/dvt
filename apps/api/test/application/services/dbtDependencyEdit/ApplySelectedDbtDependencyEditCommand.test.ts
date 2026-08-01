import { DbtDependencyEditRequestSchema } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import { projectSelectedDbtModelAnalysis } from '../../../../src/application/services/selectedDbtModelAnalysisProjection.js';

import {
  AUTHORITY,
  createHarness,
  request,
  sha,
} from './ApplySelectedDbtDependencyEditCommand.test.fixtures.js';

describe('ApplySelectedDbtDependencyEditCommand', () => {
  it('validates then atomically writes only the proven semantic patch', async () => {
    const harness = createHarness();

    const result = await harness.command.apply(request(harness));

    expect(result).toEqual({
      schemaVersion: 'dbt-dependency-edit-result.v1',
      kind: 'applied',
      receipt: expect.objectContaining({
        canvasId: AUTHORITY.canvasId,
        previousTargetUniqueId: 'source.analytics.raw.orders',
        nextTargetUniqueId: 'source.analytics.raw.customers',
        expectedContentSha256: sha("-- keep\nselect * from {{ source('raw', 'orders') }}\n"),
        appliedContentSha256: sha("-- keep\nselect * from {{ source('raw', 'customers') }}\n"),
        previousProjectContentSetSha256: harness.current.projectRevision.contentSetSha256,
        projectContentSetSha256: harness.candidate.projectRevision.contentSetSha256,
        analysisSha256: harness.candidate.analysisSha256,
      }),
    });
    expect(harness.analyzeCandidate).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedFiles: harness.current.semanticEvidence.files,
        candidate: expect.objectContaining({ path: 'models/orders.sql' }),
      })
    );
    expect(harness.apply).toHaveBeenCalledTimes(1);
    expect(harness.apply).toHaveBeenCalledWith(
      request(harness).scope,
      expect.objectContaining({
        expectedFiles: [
          { path: 'analytics/dbt_project.yml', expectedContentSha256: sha('config') },
          {
            path: 'analytics/models/orders.sql',
            expectedContentSha256: sha("-- keep\nselect * from {{ source('raw', 'orders') }}\n"),
          },
          { path: 'analytics/models/sources.yml', expectedContentSha256: sha('sources') },
        ],
        writes: [
          {
            path: 'analytics/models/orders.sql',
            content: "-- keep\nselect * from {{ source('raw', 'customers') }}\n",
          },
        ],
        deletes: [],
      })
    );

    const replay = await harness.command.apply(request(harness));
    expect(replay).toEqual(
      expect.objectContaining({
        kind: 'applied',
        receipt: expect.objectContaining({ deduplicated: true }),
      })
    );
    expect(harness.apply).toHaveBeenCalledTimes(1);
  });

  it('returns a no-op without candidate analysis or persistence', async () => {
    const harness = createHarness();
    const input = request(harness);

    const result = await harness.command.apply({
      ...input,
      nextTargetUniqueId: input.expectedTargetUniqueId,
    });

    expect(result).toEqual(
      expect.objectContaining({
        kind: 'no_change',
        targetUniqueId: input.expectedTargetUniqueId,
        selectedAnalysisSha256: harness.selected.selectedAnalysisSha256,
      })
    );
    expect(harness.analyzeCandidate).not.toHaveBeenCalled();
    expect(harness.apply).not.toHaveBeenCalled();
  });

  it('refuses stale and code-only evidence before reading or writing', async () => {
    const stale = createHarness();
    const staleInput = request(stale);
    const { scope: staleScope, ...staleRequest } = staleInput;
    const staleResult = await stale.command.apply({
      ...DbtDependencyEditRequestSchema.parse({
        ...staleRequest,
        expectedAnalysisSha256: sha('stale'),
      }),
      scope: staleScope,
    });
    expect(staleResult).toEqual(
      expect.objectContaining({
        kind: 'refused',
        finding: expect.objectContaining({ code: 'dbt_dependency_edit_analysis_stale' }),
      })
    );
    expect(stale.analyzeCandidate).not.toHaveBeenCalled();
    expect(stale.apply).not.toHaveBeenCalled();

    const codeOnly = createHarness();
    const rawRegion = codeOnly.current.semanticEvidence.regions[0];
    if (rawRegion === undefined || rawRegion.classification !== 'supported') {
      throw new Error('Missing supported fixture region');
    }
    const { targetUniqueId: _targetUniqueId, ...regionBase } = rawRegion;
    const codeOnlyCurrent = {
      ...codeOnly.current,
      semanticEvidence: {
        ...codeOnly.current.semanticEvidence,
        regions: [
          {
            ...regionBase,
            classification: 'code_only',
            reasonCode: 'dbt_jinja_dynamic_argument',
          },
        ],
      },
    } as const;
    const codeOnlySelected = projectSelectedDbtModelAnalysis({
      authorityBinding: AUTHORITY,
      analysis: codeOnlyCurrent,
      selectedUniqueId: 'model.analytics.orders',
    });
    codeOnly.resolve.mockResolvedValue({
      authorityBinding: AUTHORITY,
      nativeAnalysis: codeOnlyCurrent,
      selectedAnalysis: codeOnlySelected,
    });
    const codeOnlyResult = await codeOnly.command.apply({
      ...request(codeOnly),
      expectedSelectedAnalysisSha256: codeOnlySelected.selectedAnalysisSha256,
      regionId: rawRegion.regionId,
    });
    expect(codeOnlyResult).toEqual(
      expect.objectContaining({
        kind: 'refused',
        finding: expect.objectContaining({ code: 'dbt_dependency_edit_region_code_only' }),
      })
    );
    expect(codeOnly.apply).not.toHaveBeenCalled();
  });

  it('refuses invalid or semantically mismatched candidates and returns CAS conflicts', async () => {
    const invalid = createHarness();
    invalid.analyzeCandidate.mockResolvedValue({
      kind: 'analyzed',
      analysis: { ...invalid.candidate, status: 'invalid' },
    });
    const invalidResult = await invalid.command.apply(request(invalid));
    expect(invalidResult).toEqual(
      expect.objectContaining({
        kind: 'refused',
        finding: expect.objectContaining({ code: 'dbt_dependency_edit_validation_failed' }),
      })
    );
    expect(invalid.apply).not.toHaveBeenCalled();

    const mismatch = createHarness();
    const mismatchRegion = mismatch.candidate.semanticEvidence.regions[0];
    if (mismatchRegion === undefined || mismatchRegion.classification !== 'supported') {
      throw new Error('Missing candidate fixture region');
    }
    mismatch.analyzeCandidate.mockResolvedValue({
      kind: 'analyzed',
      analysis: {
        ...mismatch.candidate,
        semanticEvidence: {
          ...mismatch.candidate.semanticEvidence,
          regions: [{ ...mismatchRegion, targetUniqueId: 'source.analytics.raw.orders' }],
        },
      },
    });
    const mismatchResult = await mismatch.command.apply(request(mismatch));
    expect(mismatchResult).toEqual(
      expect.objectContaining({
        kind: 'refused',
        finding: expect.objectContaining({ code: 'dbt_dependency_edit_semantic_mismatch' }),
      })
    );
    expect(mismatch.apply).not.toHaveBeenCalled();

    const candidateStale = createHarness();
    candidateStale.analyzeCandidate.mockResolvedValue({
      kind: 'conflict',
      reason: 'project_revision_changed',
      changedPaths: ['models/sources.yml'],
    });
    const candidateStaleResult = await candidateStale.command.apply(request(candidateStale));
    expect(candidateStaleResult).toEqual({
      schemaVersion: 'dbt-dependency-edit-result.v1',
      kind: 'conflict',
      conflicts: [
        {
          path: 'analytics/models/sources.yml',
          currentContentSha256: null,
        },
      ],
    });
    expect(candidateStale.apply).not.toHaveBeenCalled();

    const conflict = createHarness();
    conflict.apply.mockResolvedValue({
      kind: 'conflict',
      conflicts: [{ path: 'analytics/models/orders.sql', currentContentSha256: sha('newer') }],
    });
    const conflictResult = await conflict.command.apply(request(conflict));
    expect(conflictResult).toEqual({
      schemaVersion: 'dbt-dependency-edit-result.v1',
      kind: 'conflict',
      conflicts: [{ path: 'analytics/models/orders.sql', currentContentSha256: sha('newer') }],
    });
  });
});
