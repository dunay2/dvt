import { describe, expect, it } from 'vitest';

import { resolveCanvasViewCopy } from './canvasCopyCatalog';
import { canvasViewCopy } from './copy';

describe('canvas copy catalog', () => {
  it('exposes draft access posture copy in English and Spanish', () => {
    expect(canvasViewCopy.sessionRequiredDraftLabel).toBe('Session required');
    expect(canvasViewCopy.readOnlyDraftLabel).toBe('Read-only draft');
    expect(canvasViewCopy.refreshSessionActionLabel).toBe('Refresh session');
    expect(resolveCanvasViewCopy('es').sessionRequiredDraftLabel).toBe('Sesion requerida');
  });
});
