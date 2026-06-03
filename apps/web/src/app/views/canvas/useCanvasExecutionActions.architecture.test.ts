import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const EXECUTION_ACTIONS_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useCanvasExecutionActions.ts'
);

describe('useCanvasExecutionActions architecture', () => {
  it('stays a composition seam over dedicated plan and run handlers', () => {
    expect(EXECUTION_ACTIONS_SOURCE).toContain("'./useCanvasPlanActionHandler'");
    expect(EXECUTION_ACTIONS_SOURCE).toContain("'./useCanvasRunStartHandler'");
    expect(EXECUTION_ACTIONS_SOURCE).not.toContain('executeCanvasPlanAction');
    expect(EXECUTION_ACTIONS_SOURCE).not.toContain('executeCanvasRunStartAction');
  });
});
