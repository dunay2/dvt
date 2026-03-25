/**
 * @file packages/@dvt/engine/src/security/planRefPolicy.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @decision Decision — Plan URIs are restricted by an allowlist of schemes/hosts/prefixes as a security policy
 * @consequence The engine avoids untrusted sources and reduces attack surface in plan resolution
 * @version 1.0.0
 * @date 2026-02-21
 */
import { URL } from 'node:url';

import { PlanUriNotAllowedError } from '../contracts/errors.js';
import {
  PLAN_URI_POLICY_REASON,
  type PlanUriPolicyReason,
} from '../contracts/planUriPolicyViolation.js';

import { DefaultHostRiskClassifier, type HostRiskClassifier } from './hostRiskClassifier.js';
import { isDeniedUriScheme } from './planRefPolicyRules.js';
import { PlanUri } from './planUri.js';

export interface PlanRefAllowlist {
  allowedSchemes: ReadonlyArray<string>;
  allowedHosts?: ReadonlyArray<string>; // applies to http/https
  allowedUriPrefixes?: ReadonlyArray<string>; // applies to opaque cloud URIs
}

export class PlanRefPolicy {
  constructor(
    private readonly allowlist: PlanRefAllowlist,
    private readonly hostRiskClassifier: HostRiskClassifier = new DefaultHostRiskClassifier()
  ) {}

  validateOrThrow(uri: string): void {
    const planUri = PlanUri.from(uri);
    assertSchemeAllowed(planUri);

    if (planUri.isHttpLike()) {
      this.validateHttpUri(planUri);
      return;
    }

    this.validateOpaqueUri(planUri);
  }

  private validateHttpUri(planUri: PlanUri): void {
    const parsed = parseHttpUriOrThrow(planUri);
    const parsedScheme = parsed.protocol.replace(':', '');
    if (!this.allowlist.allowedSchemes.includes(parsedScheme)) {
      throw planUriPolicyError(
        planUri.raw,
        PLAN_URI_POLICY_REASON.HTTP_SCHEME_NOT_ALLOWLISTED,
        parsed.protocol
      );
    }
    if (this.allowlist.allowedHosts && !this.allowlist.allowedHosts.includes(parsed.hostname)) {
      throw planUriPolicyError(
        planUri.raw,
        PLAN_URI_POLICY_REASON.HTTP_HOST_NOT_ALLOWLISTED,
        parsed.hostname
      );
    }
    if (this.hostRiskClassifier.isRiskyHost(parsed.hostname)) {
      throw planUriPolicyError(planUri.raw, PLAN_URI_POLICY_REASON.RISKY_HOST, parsed.hostname);
    }
  }

  private validateOpaqueUri(planUri: PlanUri): void {
    const scheme = planUri.scheme;
    if (!scheme) {
      throw planUriPolicyError(planUri.raw, PLAN_URI_POLICY_REASON.MISSING_SCHEME);
    }
    if (!this.allowlist.allowedSchemes.includes(scheme)) {
      throw planUriPolicyError(
        planUri.raw,
        PLAN_URI_POLICY_REASON.OPAQUE_SCHEME_NOT_ALLOWLISTED,
        scheme
      );
    }
    if (!this.allowlist.allowedUriPrefixes) return;

    const isPrefixAllowed = this.allowlist.allowedUriPrefixes.some((prefix) =>
      planUri.raw.startsWith(prefix)
    );
    if (!isPrefixAllowed) {
      throw planUriPolicyError(planUri.raw, PLAN_URI_POLICY_REASON.OPAQUE_PREFIX_NOT_ALLOWLISTED);
    }
  }
}

function assertSchemeAllowed(planUri: PlanUri): void {
  const scheme = planUri.scheme;
  if (!scheme) {
    throw planUriPolicyError(planUri.raw, PLAN_URI_POLICY_REASON.MISSING_SCHEME);
  }
  if (isDeniedUriScheme(scheme)) {
    throw planUriPolicyError(planUri.raw, PLAN_URI_POLICY_REASON.DENIED_SCHEME, scheme);
  }
}

function parseHttpUriOrThrow(planUri: PlanUri): URL {
  try {
    return planUri.toHttpUrl();
  } catch {
    throw planUriPolicyError(planUri.raw, PLAN_URI_POLICY_REASON.UNPARSEABLE_HTTP_URI);
  }
}

function planUriPolicyError(
  uri: string,
  reason: PlanUriPolicyReason,
  subject?: string
): PlanUriNotAllowedError {
  return new PlanUriNotAllowedError(uri, { reason, ...(subject === undefined ? {} : { subject }) });
}
