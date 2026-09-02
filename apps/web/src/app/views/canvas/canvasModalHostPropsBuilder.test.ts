import { describe, expect, it, vi } from 'vitest';

import type { PlanPreviewOutcome } from '../../ports/plans';
import { buildCanvasModalHostProps } from './canvasModalHostPropsBuilder';

describe('buildCanvasModalHostProps', () => {
  it('passes the retained preview outcome through without reinterpreting it', () => {
    const outcome: PlanPreviewOutcome = {
      kind: 'selection-rejected',
      rejection: {
        code: 'REJECTED',
        reason: 'Select at least one executable resource.',
      },
    };
    const source = {
      planModalOpen: true,
      setPlanModalOpen: vi.fn(),
      currentPlan: null,
      latestPreviewOutcome: outcome,
      canStartRun: false,
      planStatusSummary: 'Preview blocked',
      handleStartRun: vi.fn(),
    } as unknown as Parameters<typeof buildCanvasModalHostProps>[0];

    const props = buildCanvasModalHostProps(source);

    expect(props.planPreview.outcome).toBe(outcome);
  });
});
