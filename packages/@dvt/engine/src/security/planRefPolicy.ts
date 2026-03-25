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
    assertSchemeAllowed(uri, scheme);

    if (isHttpLike(lower)) {
      this.validateHttpUri(uri);
      return;
    }

    this.validateOpaqueUri(uri, scheme);
  }

  private validateHttpUri(uri: string): void {
    const parsed = parseHttpUriOrThrow(uri);
    const parsedScheme = parsed.protocol.replace(':', '');
    if (!this.allowlist.allowedSchemes.includes(parsedScheme)) {
      throw new PlanUriNotAllowedError(
        uri,
        `scheme not allowlisted (http/https): ${parsed.protocol}`
      );
    }
    if (this.allowlist.allowedHosts && !this.allowlist.allowedHosts.includes(parsed.hostname)) {
      throw new PlanUriNotAllowedError(
        uri,
        `host not allowlisted (http/https): ${parsed.hostname}`
      );
    }
    if (isLinkLocalHost(parsed.hostname)) {
      throw new PlanUriNotAllowedError(
        uri,
        `denied host (link-local/localhost): ${parsed.hostname}`
      );
    }
  }

  private validateOpaqueUri(uri: string, scheme: string): void {
    if (!this.allowlist.allowedSchemes.includes(scheme)) {
      throw new PlanUriNotAllowedError(uri, `scheme not allowlisted (opaque): ${scheme}`);
    }
    if (!this.allowlist.allowedUriPrefixes) return;

    const isPrefixAllowed = this.allowlist.allowedUriPrefixes.some((prefix) =>
      uri.startsWith(prefix)
    );
    if (!isPrefixAllowed) {
      throw new PlanUriNotAllowedError(uri, 'uri prefix not allowlisted (opaque)');
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
  if (ipVersion === 4) return isPrivateOrLocalIpv4(hostNoZone);
  if (ipVersion === 6) return isPrivateOrLocalIpv6(hostNoZone);
  return false;
}

function stripIpv6Brackets(host: string): string {
  if (host.startsWith('[') && host.endsWith(']')) {
    return host.slice(1, -1);
  }
  return host;
}

function assertSchemeAllowed(uri: string, scheme: string | null): asserts scheme is string {
  if (!scheme) {
    throw new PlanUriNotAllowedError(uri, 'invalid uri (missing scheme)');
  }
  if (DENIED_SCHEMES.has(scheme)) {
    throw new PlanUriNotAllowedError(uri, `denied scheme (explicit block): ${scheme}:`);
  }
}

function isHttpLike(uriLower: string): boolean {
  return uriLower.startsWith('http://') || uriLower.startsWith('https://');
}

function parseHttpUriOrThrow(uri: string): URL {
  try {
    return new URL(uri);
  } catch {
    throw new PlanUriNotAllowedError(uri, 'invalid uri (unparseable)');
  }
}

function isPrivateOrLocalIpv4(host: string): boolean {
  const octets = host.split('.').map((part) => Number(part));
  const first = octets[0] ?? -1;
  const second = octets[1] ?? -1;

  if (first === 127) return true; // full loopback range 127.0.0.0/8
  if (first === 10) return true; // RFC1918 10.0.0.0/8
  if (first === 172 && second >= 16 && second <= 31) return true; // RFC1918 172.16.0.0/12
  if (first === 192 && second === 168) return true; // RFC1918 192.168.0.0/16
  if (first === 169 && second === 254) return true; // link-local and metadata range
  return false;
}

function isPrivateOrLocalIpv6(host: string): boolean {
  const normalized = host.toLowerCase();
  if (normalized === '::1') return true; // loopback
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true; // ULA fc00::/7
  if (/^fe[89ab]/.test(normalized)) return true; // link-local fe80::/10
  return false;
}
