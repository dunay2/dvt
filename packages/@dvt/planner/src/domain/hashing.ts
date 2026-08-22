/**
 * ADR baseline: ADR-0001-rfc8785-jcs
 */
import { jcsCanonicalize, sha256HexUtf8, utf8Bytes } from '@dvt/crypto';

/** RFC 8785 (JCS) canonical JSON string. */
export function canonicalJson(obj: unknown): string {
  return jcsCanonicalize(obj);
}

/** Returns the canonical Plan preimage and its SHA-256 identity. */
export async function sha256CanonicalJson(obj: unknown): Promise<{
  canonical: string;
  sha256: string;
  bytes: number;
}> {
  const canonical = jcsCanonicalize(obj);
  return {
    canonical,
    sha256: sha256HexUtf8(canonical),
    bytes: utf8Bytes(canonical).length,
  };
}
