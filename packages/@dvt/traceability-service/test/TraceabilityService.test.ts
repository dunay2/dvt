import { describe, expect, it } from 'vitest';

import type {
  IAdrCatalog,
  IManifestBuilder,
  ITraceHeaderScanner,
  ITraceValidator,
} from '../src/contracts.js';
import { TraceabilityService } from '../src/service.js';
import type { AdrRef, HeaderTrace, TraceabilityManifest, ValidationResult } from '../src/types.js';

type ServiceOverrides = {
  traces?: HeaderTrace[];
  acceptedAdrs?: AdrRef[];
  validation?: ValidationResult;
  reverse?: ValidationResult;
  manifest?: TraceabilityManifest;
};

function createService(overrides: ServiceOverrides = {}): TraceabilityService {
  const scanner: ITraceHeaderScanner = {
    scan: async () => overrides.traces ?? [],
  };

  const adrCatalog: IAdrCatalog = {
    getAdr: async () => null,
    listAdrs: async () => overrides.acceptedAdrs ?? [],
  };

  const validator: ITraceValidator = {
    validate: async () => overrides.validation ?? { ok: true, issues: [] },
    validateReverseCoverage: async () => overrides.reverse ?? { ok: true, issues: [] },
  };

  const manifestBuilder: IManifestBuilder = {
    build: async () =>
      overrides.manifest ?? {
        component: '@dvt/traceability-service',
        version: '0.1.0',
        generated: '2026-04-18',
        repo: { sha: 'local' },
        baseline_adrs: [],
      },
  };

  return new TraceabilityService({
    adrCatalog,
    scanner,
    validator,
    manifestBuilder,
  });
}

const baseInput = {
  repoRoot: 'C:/repo',
  component: '@dvt/traceability-service',
  componentVersion: '0.1.0',
  repoSha: 'local',
  includeGlobs: ['packages/@dvt/traceability-service/src/**/*.ts'],
  excludeGlobs: ['**/dist/**'],
  generated: '2026-04-18',
};

describe('TraceabilityService regression baseline filtering', () => {
  it('suppresses known validation issues and still emits a manifest', async () => {
    const service = createService({
      validation: {
        ok: false,
        issues: [
          {
            code: 'MISSING_BASELINE',
            severity: 'error',
            filePath: 'packages/@dvt/engine/src/utils/clock.ts',
            message: 'Missing @baseline ADR-xxxx header.',
          },
        ],
      },
    });

    const result = await service.validateAndBuildManifest({
      ...baseInput,
      issueBaseline: [
        {
          code: 'MISSING_BASELINE',
          filePath: 'packages/@dvt/engine/src/utils/clock.ts',
        },
      ],
    });

    expect(result.validation).toEqual({ ok: true, issues: [] });
    expect(result.manifest).toBeDefined();
  });

  it('still fails when validation returns an issue outside the baseline', async () => {
    const service = createService({
      validation: {
        ok: false,
        issues: [
          {
            code: 'MISSING_BASELINE',
            severity: 'error',
            filePath: 'packages/@dvt/engine/src/utils/clock.ts',
            message: 'Missing @baseline ADR-xxxx header.',
          },
        ],
      },
    });

    const result = await service.validateAndBuildManifest({
      ...baseInput,
      issueBaseline: [
        {
          code: 'MISSING_BASELINE',
          filePath: 'packages/@dvt/engine/src/utils/jcs.ts',
        },
      ],
    });

    expect(result.validation.ok).toBe(false);
    expect(result.validation.issues).toHaveLength(1);
    expect(result.manifest).toBeUndefined();
  });

  it('suppresses known reverse coverage issues and proceeds to manifest generation', async () => {
    const service = createService({
      reverse: {
        ok: false,
        issues: [
          {
            code: 'REVERSE_COVERAGE_FAIL',
            severity: 'error',
            adrNumber: 'ADR-0038',
            message: 'ADR is Accepted but has no implementing files: ADR-0038',
          },
        ],
      },
    });

    const result = await service.validateAndBuildManifest({
      ...baseInput,
      issueBaseline: [
        {
          code: 'REVERSE_COVERAGE_FAIL',
          adrNumber: 'ADR-0038',
        },
      ],
    });

    expect(result.validation).toEqual({ ok: true, issues: [] });
    expect(result.manifest).toBeDefined();
  });
});
