/**
 * @file packages/@dvt/engine/src/security/planRefPolicy.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @decision Decision — Plan URIs are restricted by an allowlist of schemes/hosts/prefixes as a security policy
 * @consequence The engine avoids untrusted sources and reduces attack surface in plan resolution
 * @version 1.0.0
 * @date 2026-02-21
 */
import { isIP } from 'node:net';
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
    const lower = uri.toLowerCase();
    const scheme = readUriScheme(lower);
    if (!scheme) {
      throw new PlanUriNotAllowedError(uri, 'invalid uri (missing scheme)');
    }
    if (DENIED_SCHEMES.has(scheme)) {
      throw new PlanUriNotAllowedError(uri, `denied scheme (explicit block): ${scheme}:`);
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
  if (h.endsWith('.local')) return true;
  if (isPrivateOrLocalIp(h)) return true;
  return false;
}

const DENIED_SCHEMES = new Set(['file', 'ftp', 'gopher', 'data', 'javascript', 'mailto']);

function readUriScheme(uri: string): string | null {
  const match = uri.match(/^([a-z][a-z0-9+.-]*):/);
  const scheme = match?.[1];
  return typeof scheme === 'string' ? scheme : null;
}

function isPrivateOrLocalIp(host: string): boolean {
  const hostNoZone = stripIpv6Brackets(host.split('%', 1)[0] ?? host);
  const ipVersion = isIP(hostNoZone);
  if (ipVersion === 4) {
    const octets = hostNoZone.split('.').map((part) => Number(part));
    const a = octets[0] ?? -1;
    const b = octets[1] ?? -1;
    if (a === 127) return true; // full loopback range 127.0.0.0/8
    if (a === 10) return true; // RFC1918 10.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return true; // RFC1918 172.16.0.0/12
    if (a === 192 && b === 168) return true; // RFC1918 192.168.0.0/16
    if (a === 169 && b === 254) return true; // link-local and metadata range
    return false;
  }
  if (ipVersion === 6) {
    const normalized = hostNoZone.toLowerCase();
    if (normalized === '::1') return true; // loopback
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true; // ULA fc00::/7
    if (/^fe[89ab]/.test(normalized)) return true; // link-local fe80::/10
    return false;
  }
  return false;
}

function stripIpv6Brackets(host: string): string {
  if (host.startsWith('[') && host.endsWith(']')) {
    return host.slice(1, -1);
  }
  return host;
}
