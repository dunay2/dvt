import { describe, expect, it } from 'vitest';

import { resolveCanvasNodeDoubleClickAction } from './CanvasNodeShell';

describe('resolveCanvasNodeDoubleClickAction', () => {
  it('prefers the existing code callback when code is available', () => {
    expect(resolveCanvasNodeDoubleClickAction({ canOpenCode: true, canOpenWorkbench: true })).toBe(
      'open-code'
    );
  });

  it('falls back to the contextual workbench when code is unavailable', () => {
    expect(resolveCanvasNodeDoubleClickAction({ canOpenCode: false, canOpenWorkbench: true })).toBe(
      'open-workbench'
    );
  });

  it('fails closed when neither governed callback is available', () => {
    expect(
      resolveCanvasNodeDoubleClickAction({ canOpenCode: false, canOpenWorkbench: false })
    ).toBeNull();
  });
});
