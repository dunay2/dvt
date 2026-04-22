import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const RECOVERY_BANNER_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'CanvasRecoveryBanner.tsx'
);

describe('CanvasRecoveryBanner architecture', () => {
  it('renders from explicit banner state instead of branching on controller recovery fields', () => {
    expect(RECOVERY_BANNER_SOURCE).not.toContain('draftRecoveryReason');
    expect(RECOVERY_BANNER_SOURCE).not.toContain("'./useCanvasController'");
    expect(RECOVERY_BANNER_SOURCE).not.toContain('controller:');
  });
});
