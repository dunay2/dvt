import { describe, expect, it } from 'vitest';
import command from './canvasRelationalFieldSelection.ts?raw';
import gestures from './CanvasRelationalFieldSelectionProvider.tsx?raw';
import token from './CanvasRelationalFieldToken.tsx?raw';
import tree from './CanvasRelationalScalarTree.tsx?raw';

describe('tree field selection boundaries', () => {
  it('keeps selection authority in the existing command, not the view or drag-end', () => {
    expect(command).toContain('changeSelectedRelationOutputs');
    expect(command).not.toMatch(/from ['"]react['"]|\.tsx|localStorage/);
    expect(gestures).toContain('useRelationCommand');
    expect(gestures).not.toMatch(/encodeDvtSubstrait|createDvt|onApplyNodeDraft|fetch\(/);
    for (const view of [token, tree]) {
      expect(view).not.toMatch(/changeSelectedRelationOutputs|session\.apply|sidecar|\.plan/);
      expect(view.split('\n').length).toBeLessThan(200);
    }
    expect(token).toContain('onDragEnd={() => actions?.end()}');
  });
});
