/**
 * ADR baseline: ADR-0001-rfc8785-jcs
 */
import { canonicalize } from 'json-canonicalize';

/** RFC 8785 (JCS) canonical JSON string. */
export function canonicalJson(obj: unknown): string {
  return canonicalize(obj);
}

/**
 * Returns canonical JCS and sha256 hash in hex of that canonical string.
 * Uses WebCrypto: crypto.subtle (Node 22+, Bun, Deno).
 */
export async function sha256CanonicalJson(obj: unknown): Promise<{
  canonical: string;
  sha256: string;
  bytes: number;
}> {
  const canonical = canonicalize(obj);
  const TextEncoderImpl = globalThis.TextEncoder;
  if (!TextEncoderImpl) {
    throw new Error('TextEncoder is not available in this runtime');
  }
  const data = new TextEncoderImpl().encode(canonical);
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error('WebCrypto subtle API is not available in this runtime');
  }
  const digest = await subtle.digest('SHA-256', data);
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return { canonical, sha256: hex, bytes: data.length };
}
