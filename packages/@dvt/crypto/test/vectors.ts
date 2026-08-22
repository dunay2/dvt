import { TextEncoder } from 'node:util';

export const sha256Vectors = [
  {
    name: 'empty',
    bytes: new Uint8Array(),
    hex: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  },
  {
    name: 'ASCII',
    bytes: new TextEncoder().encode('abc'),
    hex: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
  },
  {
    name: 'Unicode',
    bytes: new TextEncoder().encode('DVT ☃'),
    hex: '5d158e5b7bfd3e347109ad011c09ef4925e1efbb9afb87da9cc69d5e097a0645',
  },
  {
    name: 'binary',
    bytes: new Uint8Array([0, 255, 16, 128]),
    hex: 'a33bb2aed757bc839807d7a9deab0688c3cf06d36e53cb428f2e539c8dc76c5b',
  },
] as const;

export const md5Vectors = [
  {
    name: 'empty',
    text: '',
    hex: 'd41d8cd98f00b204e9800998ecf8427e',
  },
  {
    name: 'ASCII',
    text: 'abc',
    hex: '900150983cd24fb0d6963f7d28e17f72',
  },
  {
    name: 'current outbox shard input',
    text: '12:tenant-noisy',
    hex: '5e2351bb31fd94120b93500ad86b8d47',
  },
] as const;

export const deterministicUuidV7Vector = {
  nowMs: 1_704_164_645_000,
  randomBytes: Uint8Array.from({ length: 16 }, (_, index) => index),
  uuid: '018cc820-d888-7fa0-9c20-260b0c0d0e0f',
} as const;
