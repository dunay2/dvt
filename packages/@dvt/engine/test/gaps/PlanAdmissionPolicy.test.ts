import {
  CURRENT_EXECUTION_PLAN_SCHEMA_VERSION,
  CURRENT_EXECUTION_PLAN_VERSION,
  SUPPORTED_EXECUTION_PLAN_VERSIONS,
} from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import { InvalidSchemaVersionError } from '../../src/contracts/errors.js';
import {
  UnsupportedPlanVersionError,
  assertAdmittedPlanPair,
} from '../../src/contracts/PlanAdmissionPolicy.js';

const UNSUPPORTED_PLAN_VERSION = `${CURRENT_EXECUTION_PLAN_VERSION}-unsupported`;

describe('PlanAdmissionPolicy', () => {
  it('accepts the current admitted plan/schema pair', () => {
    expect(() =>
      assertAdmittedPlanPair({
        planVersion: CURRENT_EXECUTION_PLAN_VERSION,
        schemaVersion: CURRENT_EXECUTION_PLAN_SCHEMA_VERSION,
      })
    ).not.toThrow();
  });

  it('rejects an unsupported plan version with a typed error', () => {
    expect(() =>
      assertAdmittedPlanPair({
        planVersion: UNSUPPORTED_PLAN_VERSION,
        schemaVersion: CURRENT_EXECUTION_PLAN_SCHEMA_VERSION,
      })
    ).toThrowError(UnsupportedPlanVersionError);

    try {
      assertAdmittedPlanPair({
        planVersion: UNSUPPORTED_PLAN_VERSION,
        schemaVersion: CURRENT_EXECUTION_PLAN_SCHEMA_VERSION,
      });
    } catch (error) {
      expect(error).toMatchObject({
        code: 'UNSUPPORTED_PLAN_VERSION',
        supportedVersions: [...SUPPORTED_EXECUTION_PLAN_VERSIONS],
      });
    }
  });

  it('rejects blank admission inputs as malformed schema-version ingress', () => {
    expect(() =>
      assertAdmittedPlanPair({
        planVersion: '',
        schemaVersion: CURRENT_EXECUTION_PLAN_SCHEMA_VERSION,
      })
    ).toThrowError(InvalidSchemaVersionError);
    expect(() =>
      assertAdmittedPlanPair({
        planVersion: CURRENT_EXECUTION_PLAN_VERSION,
        schemaVersion: '',
      })
    ).toThrowError(InvalidSchemaVersionError);
  });

  it('rejects unsupported schemas for the current development plan version', () => {
    expect(() =>
      assertAdmittedPlanPair({
        planVersion: CURRENT_EXECUTION_PLAN_VERSION,
        schemaVersion: 'v1.future',
      })
    ).toThrowError(InvalidSchemaVersionError);
  });
});
