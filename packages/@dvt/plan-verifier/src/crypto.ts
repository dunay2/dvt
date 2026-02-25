import { PlanVerifierError } from './errors.js';

type SubtleLike = {
  digest: (algorithm: string, data: Uint8Array) => Promise<ArrayBuffer>;
};

function requireWebCrypto(): SubtleLike {
  const c = globalThis.crypto;
  if (!c || !c.subtle) {
    throw new PlanVerifierError(
      'MISSING_WEBCRYPTO',
      'WebCrypto is not available on globalThis.crypto.subtle. Provide a WebCrypto polyfill/runtime.'
    );
  }
  return c.subtle;
}

export function utf8Encode(s: string): Uint8Array {
  const TextEncoderImpl = globalThis.TextEncoder;
  if (!TextEncoderImpl) {
    throw new PlanVerifierError(
      'MISSING_TEXT_ENCODER',
      'TextEncoder is not available on globalThis. Provide a runtime/polyfill with TextEncoder support.'
    );
  }
  return new TextEncoderImpl().encode(s);
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const subtle = requireWebCrypto();
  const digest = await subtle.digest('SHA-256', bytes);
  return toHex(new Uint8Array(digest));
}

function toHex(bytes: Uint8Array): string {
  let out = '';
  for (const b of bytes) {
    out += b.toString(16).padStart(2, '0');
  }
  return out;
}
