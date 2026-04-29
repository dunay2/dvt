import { describe, expect, it } from 'vitest';

import {
  CURRENT_EXECUTION_PLAN_VERSION,
  EXECUTION_PLAN_VERSIONED_SCHEMAS,
  ExecutionPlanSchema,
  SUPPORTED_EXECUTION_PLAN_VERSIONS,
} from '../src/index.js';

import { VALID_EXECUTION_PLAN_V2_FIXTURE } from './fixtures/planner-contract.fixtures';

const UNSUPPORTED_PLAN_VERSION = `${CURRENT_EXECUTION_PLAN_VERSION}-unsupported`;

describe('contracts: planVersion governance surface', () => {
  it('expone un registro versionado para los planes soportados', () => {
    expect(CURRENT_EXECUTION_PLAN_VERSION).toBe('1.0');
    expect(SUPPORTED_EXECUTION_PLAN_VERSIONS).toEqual([CURRENT_EXECUTION_PLAN_VERSION]);
    expect(Object.keys(EXECUTION_PLAN_VERSIONED_SCHEMAS)).toEqual(
      SUPPORTED_EXECUTION_PLAN_VERSIONS
    );
  });

  it('valida el plan actual usando el schema versionado registrado', () => {
    const schema = EXECUTION_PLAN_VERSIONED_SCHEMAS[CURRENT_EXECUTION_PLAN_VERSION];
    const plan = schema.parse(VALID_EXECUTION_PLAN_V2_FIXTURE);

    expect(plan.metadata.planVersion).toBe(CURRENT_EXECUTION_PLAN_VERSION);
  });

  it('rechaza planes con planVersion no declarado en el registro', () => {
    const result = ExecutionPlanSchema.safeParse({
      ...VALID_EXECUTION_PLAN_V2_FIXTURE,
      metadata: {
        ...VALID_EXECUTION_PLAN_V2_FIXTURE.metadata,
        planVersion: UNSUPPORTED_PLAN_VERSION,
      },
    });

    expect(result.success).toBe(false);
  });
});
