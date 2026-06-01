import { describe, expect, it } from 'vitest';

import {
  EXECUTION_PLAN_ADMISSION_MATRIX,
  getSupportedPlanAdmissionPairsForRuntime,
  verifyPlanAdmissionOrThrow,
} from '../src/index.js';

describe('@dvt/plan-verifier runtime admission matrix', () => {
  it('expone la matriz canonica de admision por pares al consumidor runtime', () => {
    expect(EXECUTION_PLAN_ADMISSION_MATRIX['1.0']).toContain('1.0');
    expect(getSupportedPlanAdmissionPairsForRuntime('planner')).toEqual([
      { planVersion: '1.0', schemaVersion: '1.0' },
    ]);
  });

  it('acepta solo un par planVersion/schemaVersion declarado para el runtime', () => {
    expect(() =>
      verifyPlanAdmissionOrThrow({
        planVersion: '1.0',
        schemaVersion: '1.0',
        runtime: 'planner',
      })
    ).not.toThrow();
  });

  it('rechaza la antigua schemaVersion v1.2 sin alias legacy', () => {
    expect(() =>
      verifyPlanAdmissionOrThrow({
        planVersion: '1.0',
        schemaVersion: 'v1.2',
        runtime: 'planner',
      })
    ).toThrow(/schemaVersion/);
  });

  it('rechaza schemaVersion no declarada aunque planVersion este admitida', () => {
    expect(() =>
      verifyPlanAdmissionOrThrow({
        planVersion: '1.0',
        schemaVersion: '1.future',
        runtime: 'planner',
      })
    ).toThrow(/schemaVersion/);
  });

  it('rechaza planVersion no declarada aunque schemaVersion este admitida', () => {
    expect(() =>
      verifyPlanAdmissionOrThrow({
        planVersion: '1.0-unsupported',
        schemaVersion: '1.0',
        runtime: 'planner',
      })
    ).toThrow(/planVersion/);
  });
});
