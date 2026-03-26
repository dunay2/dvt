import { isIP } from 'node:net';

export interface HostRiskClassifier {
  isRiskyHost(host: string): boolean;
}

export class DefaultHostRiskClassifier implements HostRiskClassifier {
  isRiskyHost(host: string): boolean {
    const normalizedHost = normalizeHost(host);
    if (normalizedHost === 'localhost' || normalizedHost.endsWith('.localhost')) return true;
    if (normalizedHost.endsWith('.local')) return true;
    return isPrivateOrLocalIp(normalizedHost);
  }
}

function normalizeHost(host: string): string {
  let normalized = host.toLowerCase();
  if (normalized.startsWith('[') && normalized.endsWith(']')) {
    normalized = normalized.slice(1, -1);
  }
  const zoneSplit = normalized.split('%', 1)[0];
  const withoutZone = zoneSplit ?? normalized;
  return withoutZone.endsWith('.') ? withoutZone.slice(0, -1) : withoutZone;
}

function isPrivateOrLocalIp(host: string): boolean {
  const ipVersion = isIP(host);
  if (ipVersion === 4) return isPrivateOrLocalIpv4(host);
  if (ipVersion === 6) return isPrivateOrLocalIpv6(host);
  return false;
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
  if (host === '::1') return true; // loopback
  if (host.startsWith('fc') || host.startsWith('fd')) return true; // ULA fc00::/7
  if (/^fe[89ab]/.test(host)) return true; // link-local fe80::/10

  const mappedV4 = readIpv4MappedIpv6(host) ?? parseMappedIpv4Hex(host);
  if (mappedV4 !== null && isPrivateOrLocalIpv4(mappedV4)) return true;
  return false;
}

function readIpv4MappedIpv6(host: string): string | null {
  const prefix = '::ffff:';
  if (!host.startsWith(prefix)) return null;
  const ipv4Part = host.slice(prefix.length);
  return isIP(ipv4Part) === 4 ? ipv4Part : null;
}

function parseMappedIpv4Hex(host: string): string | null {
  const prefix = '::ffff:';
  if (!host.startsWith(prefix)) return null;
  const hexPart = host.slice(prefix.length);
  const groups = hexPart.split(':');
  if (groups.length !== 2) return null;

  const left = parseHexGroup(groups[0]);
  const right = parseHexGroup(groups[1]);
  if (left === null || right === null) return null;

  return `${(left >> 8) & 0xff}.${left & 0xff}.${(right >> 8) & 0xff}.${right & 0xff}`;
}

function parseHexGroup(group: string | undefined): number | null {
  if (typeof group !== 'string' || group.length === 0) return null;
  const value = Number.parseInt(group, 16);
  if (Number.isNaN(value) || value < 0 || value > 0xffff) return null;
  return value;
}
