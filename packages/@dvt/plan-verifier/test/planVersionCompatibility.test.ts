import { describe, expect, it } from 'vitest';

import {
  PLAN_RUNTIME_COMPATIBILITY_MATRIX,
  getSupportedPlanVersionsForRuntime,
  verifyPlanVersionOrThrow,
} from '../src/index.js';

describe('@dvt/plan-verifier runtime compatibility matrix', () => {
  it('expone una matriz de compatibilidad runtime por consumidor', () => {
    expect(PLAN_RUNTIME_COMPATIBILITY_MATRIX.planner).toBeDefined();
    expect(getSupportedPlanVersionsForRuntime('planner')).toEqual(
      PLAN_RUNTIME_COMPATIBILITY_MATRIX.planner.acceptedPlanVersions
    );
  });

  it('acepta una version declarada para el runtime', () => {
    expect(() =>
      verifyPlanVersionOrThrow({
        planVersion: '2.3',
        runtime: 'planner',
      })
    ).not.toThrow();
  });

  it('rechaza una version no declarada para el runtime aunque sea semver-like', () => {
    expect(() =>
      verifyPlanVersionOrThrow({
        planVersion: '2.4',
        runtime: 'planner',
      })
    ).toThrow(/planner/);
  });
});
