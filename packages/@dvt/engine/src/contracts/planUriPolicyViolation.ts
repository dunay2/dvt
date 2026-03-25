export const PLAN_URI_POLICY_REASON = {
  MISSING_SCHEME: 'missing_scheme',
  DENIED_SCHEME: 'denied_scheme',
  UNPARSEABLE_HTTP_URI: 'unparseable_http_uri',
  HTTP_SCHEME_NOT_ALLOWLISTED: 'http_scheme_not_allowlisted',
  HTTP_HOST_NOT_ALLOWLISTED: 'http_host_not_allowlisted',
  RISKY_HOST: 'risky_host',
  OPAQUE_SCHEME_NOT_ALLOWLISTED: 'opaque_scheme_not_allowlisted',
  OPAQUE_PREFIX_NOT_ALLOWLISTED: 'opaque_prefix_not_allowlisted',
} as const;

export type PlanUriPolicyReason =
  (typeof PLAN_URI_POLICY_REASON)[keyof typeof PLAN_URI_POLICY_REASON];

export interface PlanUriPolicyViolation {
  reason: PlanUriPolicyReason;
  subject?: string;
}
