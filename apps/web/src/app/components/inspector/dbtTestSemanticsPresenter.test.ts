import { describe, expect, it } from 'vitest';

import { projectDbtTestSemantics } from './dbtTestSemanticsPresenter';

describe('dbtTestSemanticsPresenter', () => {
  it('projects dbt generic tests into assertion and readiness language', () => {
    expect(
      projectDbtTestSemantics({
        type: 'not_null',
        severity: 'error',
        selectedForExecution: true,
        lastRunStatus: 'passed',
        lastRunDurationMs: 1234,
      })
    ).toEqual({
      assertion: 'Value is present',
      selection: 'selected',
      readinessImpact: 'blocks run',
      lastRun: 'passed in 1.2s',
    });

    expect(
      projectDbtTestSemantics({
        type: 'accepted_values',
        expression: 'values: created, paid',
        severity: 'warn',
      })
    ).toMatchObject({
      assertion: 'Value is one of created, paid',
      readinessImpact: 'warning',
    });
  });
});
