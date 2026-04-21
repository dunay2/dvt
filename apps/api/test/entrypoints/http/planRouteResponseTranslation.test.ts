import { PREVIEW_PROFILE } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import { planRouteResponseTranslation } from '../../../src/entrypoints/http/planRouteResponseTranslation.js';

describe('planRouteResponseTranslation', () => {
  it('maps compile internal failures to a canonical 500 envelope', () => {
    expect(planRouteResponseTranslation.compile.internalError()).toEqual({
      status: 500,
      body: {
        error: {
          type: 'internal_server_error',
          reason: 'internal_error',
        },
      },
    });
  });

  it('maps import scope mismatches to a rejected canonical 403 envelope', () => {
    expect(planRouteResponseTranslation.import.result({ kind: 'scopeMismatch' })).toEqual({
      kind: 'rejected',
      response: {
        status: 403,
        body: {
          error: {
            type: 'forbidden',
            reason: 'tenant_access_denied',
            details: {
              cause: 'plan_scope_mismatch',
            },
          },
        },
      },
    });
  });

  it('maps preview contract issues through the public preview seam', () => {
    expect(
      planRouteResponseTranslation.preview.contractIssue({
        kind: 'missingPreviewProvenance',
        previewProfile: PREVIEW_PROFILE.transformationSqlFirstV1,
        requiredArtifacts: ['graphArtifact', 'sqlArtifact'],
      })
    ).toEqual({
      status: 422,
      body: {
        error: {
          type: 'unprocessable',
          reason: 'plan_rejected',
          details: {
            cause: 'missing_preview_provenance',
            previewProfile: PREVIEW_PROFILE.transformationSqlFirstV1,
            requiredArtifacts: ['graphArtifact', 'sqlArtifact'],
          },
        },
      },
    });
  });

  it('maps preview internal failures to a canonical 500 envelope', () => {
    expect(planRouteResponseTranslation.preview.internalError()).toEqual({
      status: 500,
      body: {
        error: {
          type: 'internal_server_error',
          reason: 'internal_error',
        },
      },
    });
  });
});
