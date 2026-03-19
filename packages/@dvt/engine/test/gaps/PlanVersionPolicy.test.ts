import { describe, expect, it } from 'vitest';

import {
  SUPPORTED_PLAN_VERSIONS,
  UnsupportedPlanVersionError,
  assertSupportedPlanVersion,
} from '../../src/contracts/PlanVersionPolicy.js';

describe('PlanVersionPolicy', () => {
  it('accepts a supported plan version', () => {
    expect(() => assertSupportedPlanVersion('2.3')).not.toThrow();
  });

  it('rejects an unsupported plan version with a typed error', () => {
    expect(() => assertSupportedPlanVersion('3.0')).toThrowError(UnsupportedPlanVersionError);

    try {
      assertSupportedPlanVersion('3.0');
    } catch (error) {
      expect(error).toMatchObject({
        code: 'UNSUPPORTED_PLAN_VERSION',
        supportedVersions: [...SUPPORTED_PLAN_VERSIONS],
      });
    }
  });

  it('rejects blank plan versions', () => {
    expect(() => assertSupportedPlanVersion('')).toThrowError(UnsupportedPlanVersionError);
  });

  it('does not silently coerce numeric-looking values', () => {
    expect(() => assertSupportedPlanVersion('2.30')).toThrowError(UnsupportedPlanVersionError);
  });
});
