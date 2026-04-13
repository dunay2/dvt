import { PREVIEW_PROFILE, type PreviewProfile } from '@dvt/contracts';

import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { badRequestResult, type RouteParseResult } from './routeParseIssue.js';

export type PreviewProfilePolicy = {
  readonly previewProfile: PreviewProfile;
  readonly executor?: 'dbt' | 'postgres';
  readonly provenanceRequired: boolean;
  readonly providerModel: 'one-provider-per-plan';
};

const PREVIEW_PROFILE_POLICIES: Readonly<Record<PreviewProfile, PreviewProfilePolicy>> = {
  [PREVIEW_PROFILE.plannerGenericV1]: {
    previewProfile: PREVIEW_PROFILE.plannerGenericV1,
    provenanceRequired: false,
    providerModel: 'one-provider-per-plan',
  },
  [PREVIEW_PROFILE.transformationSqlFirstV1]: {
    previewProfile: PREVIEW_PROFILE.transformationSqlFirstV1,
    executor: 'postgres',
    provenanceRequired: true,
    providerModel: 'one-provider-per-plan',
  },
};

export function parsePreviewProfile(raw: unknown): RouteParseResult<PreviewProfilePolicy> {
  if (typeof raw !== 'string') {
    return badRequestResult(HTTP_ERROR_REASON.invalidPreviewProfile, {
      target: 'previewProfile',
    });
  }

  const normalized = raw.trim();
  if (normalized.length === 0 || normalized !== raw) {
    return badRequestResult(HTTP_ERROR_REASON.invalidPreviewProfile, {
      target: 'previewProfile',
    });
  }

  const policy = PREVIEW_PROFILE_POLICIES[normalized as PreviewProfile];
  if (policy === undefined) {
    return badRequestResult(HTTP_ERROR_REASON.invalidPreviewProfile, {
      target: 'previewProfile',
    });
  }

  return {
    ok: true,
    value: policy,
  };
}
