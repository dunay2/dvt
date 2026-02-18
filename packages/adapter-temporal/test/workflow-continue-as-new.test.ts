import { describe, expect, it } from 'vitest';

import { shouldTriggerContinueAsNew } from '../src/workflows/RunPlanWorkflow.js';

describe('continue-as-new policy', () => {
  it('does not trigger when threshold is disabled', () => {
    expect(
      shouldTriggerContinueAsNew({
        continueAsNewAfterLayerCount: 0,
        processedLayersInCurrentExecution: 100,
        nextLayerIndex: 100,
        totalLayerCount: 200,
      })
    ).toBe(false);
  });

  it('does not trigger below threshold', () => {
    expect(
      shouldTriggerContinueAsNew({
        continueAsNewAfterLayerCount: 3,
        processedLayersInCurrentExecution: 2,
        nextLayerIndex: 2,
        totalLayerCount: 10,
      })
    ).toBe(false);
  });

  it('triggers exactly at threshold when there are pending layers', () => {
    expect(
      shouldTriggerContinueAsNew({
        continueAsNewAfterLayerCount: 3,
        processedLayersInCurrentExecution: 3,
        nextLayerIndex: 3,
        totalLayerCount: 10,
      })
    ).toBe(true);
  });

  it('does not trigger when no pending layers remain', () => {
    expect(
      shouldTriggerContinueAsNew({
        continueAsNewAfterLayerCount: 3,
        processedLayersInCurrentExecution: 3,
        nextLayerIndex: 3,
        totalLayerCount: 3,
      })
    ).toBe(false);
  });
});
