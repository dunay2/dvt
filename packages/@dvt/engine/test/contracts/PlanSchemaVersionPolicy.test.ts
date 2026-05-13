/**
 * @ownedConcern Verify schema-version admission semantics at the engine policy boundary.
 */
import {
  CURRENT_EXECUTION_PLAN_SCHEMA_VERSION,
  CURRENT_EXECUTION_PLAN_VERSION,
} from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import {
  InvalidSchemaVersionError,
  UnsupportedPlanVersionError,
} from '../../src/contracts/errors.js';
import { assertSupportedPlanSchemaVersion } from '../../src/contracts/PlanSchemaVersionPolicy.js';

describe('PlanSchemaVersionPolicy', () => {
  it('accepts the current executable planVersion/schemaVersion pair', () => {
    expect(() =>
      assertSupportedPlanSchemaVersion({
        planVersion: CURRENT_EXECUTION_PLAN_VERSION,
        schemaVersion: CURRENT_EXECUTION_PLAN_SCHEMA_VERSION,
      })
    ).not.toThrow();
  });

  it.each([
    { name: 'blank schema', schemaVersion: '' },
    { name: 'future schema', schemaVersion: 'v1.future' },
    { name: 'unsupported major schema', schemaVersion: 'v2.0' },
  ])('rejects $name before runtime dispatch', ({ schemaVersion }) => {
    expect(() =>
      assertSupportedPlanSchemaVersion({
        planVersion: CURRENT_EXECUTION_PLAN_VERSION,
        schemaVersion,
      })
    ).toThrow(InvalidSchemaVersionError);
  });

  it('rejects an unknown planVersion even when schemaVersion is current', () => {
    expect(() =>
      assertSupportedPlanSchemaVersion({
        planVersion: `${CURRENT_EXECUTION_PLAN_VERSION}-future`,
        schemaVersion: CURRENT_EXECUTION_PLAN_SCHEMA_VERSION,
      })
    ).toThrow(UnsupportedPlanVersionError);
  });
});
