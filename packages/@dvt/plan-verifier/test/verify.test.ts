import { describe, it, expect } from 'vitest';

import { sha256Hex, utf8Encode } from '../src/crypto.js';
import { verifyPlanIdOrThrow, verifyPlanOrThrow } from '../src/verify.js';

describe('@dvt/plan-verifier', () => {
  it('verifies planId for canonicalPlanJson (happy path)', async () => {
    const canonical = '{"a":1,"b":[true,false,null],"c":"x"}';
    const planId = await sha256Hex(utf8Encode(canonical));
    await expect(
      verifyPlanIdOrThrow({ canonicalPlanJson: canonical, planId })
    ).resolves.toBeUndefined();
  });

  it('fails when planId mismatches', async () => {
    const canonical = '{"a":1}';
    await expect(
      verifyPlanIdOrThrow({ canonicalPlanJson: canonical, planId: 'deadbeef' })
    ).rejects.toThrow();
  });

  it('fails on unsupported major planVersion', async () => {
    const canonical = '{"a":1}';
    const planId = await sha256Hex(utf8Encode(canonical));
    await expect(
      verifyPlanOrThrow({
        canonicalPlanJson: canonical,
        planId,
        planVersion: '3.0',
        supportedMajor: 2,
      })
    ).rejects.toThrow(/Unsupported planVersion/);
  });

  it('passes on supported major planVersion', async () => {
    const canonical = '{"a":1}';
    const planId = await sha256Hex(utf8Encode(canonical));
    await expect(
      verifyPlanOrThrow({
        canonicalPlanJson: canonical,
        planId,
        planVersion: '2.3',
        supportedMajor: 2,
      })
    ).resolves.toBeUndefined();
  });

  it('fails when strictSameMinor=true but supportedMinor missing', async () => {
    const canonical = '{"a":1}';
    const planId = await sha256Hex(utf8Encode(canonical));
    await expect(
      verifyPlanOrThrow({
        canonicalPlanJson: canonical,
        planId,
        planVersion: '2.3',
        supportedMajor: 2,
        strictSameMinor: true,
      })
    ).rejects.toThrow(/requires supportedMinor/);
  });

  it('fails when strictSameMinor=true and minor mismatches', async () => {
    const canonical = '{"a":1}';
    const planId = await sha256Hex(utf8Encode(canonical));
    await expect(
      verifyPlanOrThrow({
        canonicalPlanJson: canonical,
        planId,
        planVersion: '2.3',
        supportedMajor: 2,
        strictSameMinor: true,
        supportedMinor: 4,
      })
    ).rejects.toThrow(/Supported 2\.4\.x only/);
  });

  it('passes when strictSameMinor=true and minor matches', async () => {
    const canonical = '{"a":1}';
    const planId = await sha256Hex(utf8Encode(canonical));
    await expect(
      verifyPlanOrThrow({
        canonicalPlanJson: canonical,
        planId,
        planVersion: '2.3',
        supportedMajor: 2,
        strictSameMinor: true,
        supportedMinor: 3,
      })
    ).resolves.toBeUndefined();
  });
});
