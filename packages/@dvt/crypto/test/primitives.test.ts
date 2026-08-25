import { runInNewContext } from 'node:vm';

import { describe, expect, it, vi } from 'vitest';

import {
  base64Bytes,
  createSha256Hasher,
  jcsCanonicalize,
  md5Hex,
  md5HexUtf8,
  randomUuidV4,
  randomUuidV7,
  secureRandomBytes,
  sha256Hex,
  sha256HexUtf8,
  utf8Bytes,
} from '../src/index.js';

import { deterministicUuidV7Vector, md5Vectors, sha256Vectors } from './vectors.js';

describe('UTF-8, base64, and SHA-256', () => {
  it('encodes text explicitly as UTF-8', () => {
    expect([...utf8Bytes('€')]).toEqual([0xe2, 0x82, 0xac]);
  });

  it('decodes canonical base64 without a Node Buffer dependency', () => {
    expect([...base64Bytes('')]).toEqual([]);
    expect([...base64Bytes('YQ==')]).toEqual([0x61]);
    expect([...base64Bytes('YWI=')]).toEqual([0x61, 0x62]);
    expect([...base64Bytes('YWJj')]).toEqual([0x61, 0x62, 0x63]);
    expect([...base64Bytes('4oKs')]).toEqual([0xe2, 0x82, 0xac]);
    expect(() => base64Bytes('not canonical base64')).toThrow('CRYPTO_BASE64_TEXT_INVALID');
    expect(() => base64Bytes('YQ=')).toThrow('CRYPTO_BASE64_TEXT_INVALID');
  });

  it.each(sha256Vectors)('matches the $name byte vector', ({ bytes, hex }) => {
    expect(sha256Hex(bytes)).toBe(hex);
  });

  it('hashes explicit UTF-8 text', () => {
    expect(sha256HexUtf8('abc')).toBe(sha256Vectors[1].hex);
  });

  it('accepts Uint8Array values created in another JavaScript realm', () => {
    const crossRealmBytes = runInNewContext('new Uint8Array([97, 98, 99])') as Uint8Array;

    expect(sha256Hex(crossRealmBytes)).toBe(sha256Vectors[1].hex);
    expect(md5Hex(crossRealmBytes)).toBe(md5Vectors[1].hex);
  });

  it('keeps incremental hashing equivalent to one-shot hashing', () => {
    const hasher = createSha256Hasher();
    hasher.update(utf8Bytes('DVT '));
    hasher.update(utf8Bytes('☃'));

    expect(hasher.digestHex()).toBe(sha256Vectors[2].hex);
    expect(() => hasher.update(new Uint8Array([1]))).toThrow('SHA256_HASHER_FINALIZED');
    expect(() => hasher.digestHex()).toThrow('SHA256_HASHER_FINALIZED');
  });
});

describe('compatibility MD5', () => {
  it.each(md5Vectors)('matches the $name vector', ({ text, hex }) => {
    expect(md5HexUtf8(text)).toBe(hex);
    expect(md5Hex(utf8Bytes(text))).toBe(hex);
  });
});

describe('RFC 8785 canonicalization', () => {
  it('preserves the existing ASCII-key and negative-zero vectors', () => {
    expect(jcsCanonicalize({ b: 1, a: 2, c: undefined })).toBe('{"a":2,"b":1}');
    expect(jcsCanonicalize({ zero: -0, values: [2, 1] })).toBe('{"values":[2,1],"zero":0}');
  });

  it('orders Unicode property names by UTF-16 code units', () => {
    expect(
      jcsCanonicalize({
        '\u20ac': 'Euro Sign',
        '\r': 'Carriage Return',
        '\ufb33': 'Hebrew Letter Dalet With Dagesh',
        '1': 'One',
        '\ud83d\ude00': 'Emoji: Grinning Face',
        '\u0080': 'Control',
        '\u00f6': 'Latin Small Letter O With Diaeresis',
      })
    ).toBe(
      '{"\\r":"Carriage Return","1":"One","":"Control","ö":"Latin Small Letter O With Diaeresis","€":"Euro Sign","😀":"Emoji: Grinning Face","דּ":"Hebrew Letter Dalet With Dagesh"}'
    );
  });

  it('rejects values outside the JSON data model', () => {
    expect(() => jcsCanonicalize({ value: Number.NaN })).toThrow();
    expect(() => jcsCanonicalize(1n)).toThrow();
  });
});

describe('secure random bytes and UUIDs', () => {
  it('returns the requested number of secure bytes', () => {
    expect(secureRandomBytes(32)).toHaveLength(32);
    expect(() => secureRandomBytes(-1)).toThrow('CRYPTO_RANDOM_LENGTH_INVALID');
  });

  it('fails closed when the secure platform API is unavailable', () => {
    vi.stubGlobal('crypto', undefined);
    expect(() => secureRandomBytes(16)).toThrow('CRYPTO_SECURE_RANDOM_UNAVAILABLE');
    vi.unstubAllGlobals();
  });

  it('creates RFC UUIDv4 values', () => {
    expect(randomUuidV4()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u
    );
  });

  it('creates UUIDv7 values and preserves the deterministic vector', () => {
    expect(randomUuidV7()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u
    );
    expect(randomUuidV7(deterministicUuidV7Vector)).toBe(deterministicUuidV7Vector.uuid);
  });
});
