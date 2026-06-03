import { PREVIEW_PROFILE } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import { toContractPlanRef } from '../../../src/entrypoints/http/planRefHttpMapper.js';
import { planRouteResponseTranslation } from '../../../src/entrypoints/http/planRouteResponseTranslation.js';

import {
  VALID_PLAN_REF,
  buildImportedPlan,
  buildTransformationStoredPlan,
} from './planRouteFixtures.js';

describe('planRouteResponseTranslation', () => {
  it('maps compile success through the public facade as an accepted response payload', () => {
    const plan = buildTransformationStoredPlan();

    expect(planRouteResponseTranslation.compile.result({ plan })).toEqual({
      kind: 'accepted',
      payload: {
        plan,
        compile: {
          persisted: false,
          executabilityValidated: false,
        },
      },
    });
  });

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

  it('maps import success through the public facade as an accepted response payload', () => {
    const plan = buildImportedPlan();
    const planRef = toContractPlanRef(VALID_PLAN_REF);

    expect(
      planRouteResponseTranslation.import.result({
        kind: 'accepted',
        plan,
        planRef,
      })
    ).toEqual({
      kind: 'accepted',
      payload: {
        plan,
        planRef,
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
