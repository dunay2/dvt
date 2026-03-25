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

import { DefaultHostRiskClassifier, type HostRiskClassifier } from './hostRiskClassifier.js';
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
      throw new PlanUriNotAllowedError(
        planUri.raw,
        `${PLAN_URI_POLICY_REASON.http_scheme_not_allowlisted}:${parsed.protocol}`
      );
    }
    if (this.allowlist.allowedHosts && !this.allowlist.allowedHosts.includes(parsed.hostname)) {
      throw new PlanUriNotAllowedError(
        planUri.raw,
        `${PLAN_URI_POLICY_REASON.http_host_not_allowlisted}:${parsed.hostname}`
      );
    }
    if (this.hostRiskClassifier.isRiskyHost(parsed.hostname)) {
      throw new PlanUriNotAllowedError(
        planUri.raw,
        `${PLAN_URI_POLICY_REASON.risky_host}:${parsed.hostname}`
      );
    }
  }

  private validateOpaqueUri(planUri: PlanUri): void {
    const scheme = planUri.scheme;
    if (!scheme) {
      throw new PlanUriNotAllowedError(planUri.raw, PLAN_URI_POLICY_REASON.missing_scheme);
    }
    if (!this.allowlist.allowedSchemes.includes(scheme)) {
      throw new PlanUriNotAllowedError(
        planUri.raw,
        `${PLAN_URI_POLICY_REASON.opaque_scheme_not_allowlisted}:${scheme}`
      );
    }
    if (!this.allowlist.allowedUriPrefixes) return;

    const isPrefixAllowed = this.allowlist.allowedUriPrefixes.some((prefix) =>
      planUri.raw.startsWith(prefix)
    );
    if (!isPrefixAllowed) {
      throw new PlanUriNotAllowedError(
        planUri.raw,
        PLAN_URI_POLICY_REASON.opaque_prefix_not_allowlisted
      );
    }
  }
}

const DENIED_SCHEMES = new Set(['file', 'ftp', 'gopher', 'data', 'javascript', 'mailto']);

const PLAN_URI_POLICY_REASON = {
  missing_scheme: 'missing_scheme',
  denied_scheme: 'denied_scheme',
  unparseable_http_uri: 'unparseable_http_uri',
  http_scheme_not_allowlisted: 'http_scheme_not_allowlisted',
  http_host_not_allowlisted: 'http_host_not_allowlisted',
  risky_host: 'risky_host',
  opaque_scheme_not_allowlisted: 'opaque_scheme_not_allowlisted',
  opaque_prefix_not_allowlisted: 'opaque_prefix_not_allowlisted',
} as const;

function assertSchemeAllowed(planUri: PlanUri): void {
  const scheme = planUri.scheme;
  if (!scheme) {
    throw new PlanUriNotAllowedError(planUri.raw, PLAN_URI_POLICY_REASON.missing_scheme);
  }
  if (DENIED_SCHEMES.has(scheme)) {
    throw new PlanUriNotAllowedError(
      planUri.raw,
      `${PLAN_URI_POLICY_REASON.denied_scheme}:${scheme}`
    );
  }
}

function parseHttpUriOrThrow(planUri: PlanUri): URL {
  try {
    return planUri.toHttpUrl();
  } catch {
    throw new PlanUriNotAllowedError(planUri.raw, PLAN_URI_POLICY_REASON.unparseable_http_uri);
  }
}
