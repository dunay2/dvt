import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { sha256HexUtf8 } from '../src/utils/sha256HexUtf8.js';

describe('sha256HexUtf8', () => {
  it('matches the empty-string SHA-256 vector', () => {
    expect(sha256HexUtf8('')).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    );
  });

  it('matches the abc SHA-256 vector', () => {
    expect(sha256HexUtf8('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
    );
  });

  it('matches node crypto for unicode input', () => {
    const input = 'DVT ñ € canonical payload';
    const expected = createHash('sha256').update(input, 'utf8').digest('hex');
    expect(sha256HexUtf8(input)).toBe(expected);
  });
});
