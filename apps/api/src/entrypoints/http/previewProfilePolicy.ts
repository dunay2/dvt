import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { badRequestResult, type RouteParseResult } from './routeParseIssue.js';

export const PREVIEW_PROFILE = {
  plannerGenericV1: 'planner-generic-v1',
  transformationSqlFirstV1: 'transformation-sql-first-v1',
} as const;

export type PreviewProfile = (typeof PREVIEW_PROFILE)[keyof typeof PREVIEW_PROFILE];

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
