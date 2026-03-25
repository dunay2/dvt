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

export interface PlanRefAllowlist {
  allowedSchemes: ReadonlyArray<string>;
  allowedHosts?: ReadonlyArray<string>; // applies to http/https
  allowedUriPrefixes?: ReadonlyArray<string>; // applies to opaque cloud URIs
}

export class PlanRefPolicy {
  constructor(private readonly allowlist: PlanRefAllowlist) {}

  validateOrThrow(uri: string): void {
    // Reject dangerous schemes explicitly.
    const lower = uri.toLowerCase();
    const deniedSchemes = ['file://', 'ftp://', 'gopher://'];
    for (const d of deniedSchemes) {
      if (lower.startsWith(d)) {
        throw new PlanUriNotAllowedError(uri, `denied scheme (explicit block): ${d}`);
      }
    }

    // If it looks like an http(s) URL, validate host and scheme.
    if (lower.startsWith('http://') || lower.startsWith('https://')) {
      let u: URL;
      try {
        u = new URL(uri);
      } catch {
        throw new PlanUriNotAllowedError(uri, 'invalid uri (unparseable)');
      }
      if (!this.allowlist.allowedSchemes.includes(u.protocol.replace(':', ''))) {
        throw new PlanUriNotAllowedError(uri, `scheme not allowlisted (http/https): ${u.protocol}`);
      }
      if (this.allowlist.allowedHosts && !this.allowlist.allowedHosts.includes(u.hostname)) {
        throw new PlanUriNotAllowedError(uri, `host not allowlisted (http/https): ${u.hostname}`);
      }
      // Block link-local and metadata endpoints (basic).
      if (isLinkLocalHost(u.hostname)) {
        throw new PlanUriNotAllowedError(uri, `denied host (link-local/localhost): ${u.hostname}`);
      }
      return;
    }

    // Opaque URIs (s3://, gs://, azure://, etc.)
    const scheme = uri.split(':', 1)[0]?.toLowerCase();
    if (!scheme) {
      throw new PlanUriNotAllowedError(uri, 'invalid uri (missing scheme)');
    }
    if (!this.allowlist.allowedSchemes.includes(scheme)) {
      throw new PlanUriNotAllowedError(uri, `scheme not allowlisted (opaque): ${scheme}`);
    }
    if (this.allowlist.allowedUriPrefixes) {
      const ok = this.allowlist.allowedUriPrefixes.some((p) => uri.startsWith(p));
      if (!ok) {
        throw new PlanUriNotAllowedError(uri, 'uri prefix not allowlisted (opaque)');
      }
    }
  }
}

function isLinkLocalHost(host: string): boolean {
  const h = host.toLowerCase();
  if (h === 'localhost' || h.endsWith('.localhost')) return true;
  if (h === '127.0.0.1' || h === '::1') return true;
  if (h === '169.254.169.254') return true; // common cloud metadata IP
  if (h.endsWith('.local')) return true;
  return false;
}
