import { describe, expect, it } from 'vitest';
import command from './canvasRelationalFieldSelection.ts?raw';
import gestures from './CanvasRelationalFieldSelectionProvider.tsx?raw';
import token from './CanvasRelationalFieldToken.tsx?raw';
import tokenGestures from './useCanvasRelationalFieldToken.ts?raw';
import tree from './CanvasRelationalScalarTree.tsx?raw';
import admission from './canvasStagedConnectionAdmission.ts?raw';
import connection from './useCanvasStagedFieldConnection.ts?raw';
import operations from './canvasStagedOperationActions.ts?raw';
import ports from './CanvasRelationalOperationPorts.tsx?raw';

describe('tree field selection boundaries', () => {
  it('keeps selection authority in the existing command, not the view or drag-end', () => {
    expect(command).toContain('changeSelectedRelationOutputs');
    expect(command).not.toMatch(/from ['"]react['"]|\.tsx|localStorage/);
    expect(gestures).toContain('useRelationCommand');
    expect(gestures).not.toMatch(/encodeDvtSubstrait|createDvt|onApplyNodeDraft|fetch\(/);
    for (const view of [token, tree, tokenGestures]) {
      expect(view).not.toMatch(/changeSelectedRelationOutputs|session\.apply|sidecar|\.plan/);
      expect(view.split('\n').length).toBeLessThan(200);
    }
    expect(token).toContain('onDragEnd={token.onDragEnd}');
    expect(token).toContain('onClick={token.onRemoveClick}');
    expect(token).not.toMatch(/actions\.|removeExpression\(|onClick=\{\(event\)/);
    expect(tokenGestures).toContain('onDragEnd: () => actions?.end()');
  });
  it('shares graph admission and keeps async lifetime separate from port presentation', () => {
    expect(admission).not.toMatch(/from ['"]react['"]|\.tsx|localStorage/);
    for (const adapter of [connection, operations])
      expect(adapter).toContain('admitCanvasStagedConnection');
    expect(connection).toContain('configureCanvasStagedTransform');
    expect(connection).not.toMatch(
      /createDvt|\.sidecar|\.plan|localStorage|fetch\(|field_transform/
    );
    expect(ports).not.toMatch(/configureCanvas|admitCanvas|changeSelected|\.plan|\.sidecar/);
    expect(connection.split('\n').length).toBeLessThan(130);
    expect(gestures.split('\n').length).toBeLessThan(210);
  });
});
