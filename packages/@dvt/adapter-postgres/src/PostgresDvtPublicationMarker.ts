/**
 * Owned concern: parse and render the reserved DVT stable-table marker.
 * @baseline ADR-0003: Execution Model
 * @decision Use one strict marker grammar at admission and publication boundaries.
 * @consequence Malformed or user-owned comments cannot masquerade as DVT authority.
 * @version 1.0.0
 */
const MARKER_PATTERN = /^dvt:publication:v1;token=([0-9a-f]{64});schema=([0-9a-f]{64})$/u;

export type PostgresDvtPublicationMarker = {
  readonly token: string;
  readonly schemaDigestSha256: string;
};

export function parsePostgresDvtPublicationMarker(
  value: string | null
): PostgresDvtPublicationMarker | null {
  if (value === null) return null;
  const match = MARKER_PATTERN.exec(value);
  if (match?.[1] === undefined || match[2] === undefined) return null;
  return { token: match[1], schemaDigestSha256: match[2] };
}

export function renderPostgresDvtPublicationMarker(input: PostgresDvtPublicationMarker): string {
  return `dvt:publication:v1;token=${input.token};schema=${input.schemaDigestSha256}`;
}
