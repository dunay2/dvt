/** Owned concern: verify pure session-action presentation from explicit transaction snapshots. */
import { describe, expect, it } from 'vitest';
import { buildCanvasRelationalTreeSessionActionsModel } from './canvasRelationalTreeSessionActionsModel';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
import { formatCanvasModelOutputDependencyRejection } from './canvasCopyFormatting';

describe('Relational session-action Presentation Model', () => {
  const state = Object.freeze({
    active: true,
    canApply: true,
    hasUnappliedChanges: true,
    applyRejection: null,
    pendingNavigation: false,
  });

  it('hides every control outside the active session even with a pending decision', () => {
    expect(
      buildCanvasRelationalTreeSessionActionsModel(
        { ...state, active: false, pendingNavigation: true },
        resolveCanvasViewCopy('en'),
        'en'
      )
    ).toEqual({ kind: 'hidden' });
  });

  it.each([
    [false, false],
    [false, true],
    [true, false],
    [true, true],
  ] as const)(
    'preserves distinct toolbar and dialog admission (canApply %s, changes %s)',
    (canApply, hasUnappliedChanges) => {
      const model = buildCanvasRelationalTreeSessionActionsModel(
        { ...state, canApply, hasUnappliedChanges, pendingNavigation: true },
        resolveCanvasViewCopy('en'),
        'en'
      );
      expect(model).toMatchObject({
        kind: 'active',
        applyDisabled: !canApply || !hasUnappliedChanges,
        draftLabel: hasUnappliedChanges ? resolveCanvasSemanticEditorCopy('en').draft : null,
        decision: { open: true, canApply },
      });
    }
  );

  it.each(['en', 'es'])(
    'resolves explicit %s labels without a language-store dependency',
    (language) => {
      const copy = resolveCanvasViewCopy(language);
      expect(buildCanvasRelationalTreeSessionActionsModel(state, copy, language)).toMatchObject({
        applyLabel: copy.inspectorDvtRelationalApply,
        cancelLabel: copy.inspectorDvtRelationalCancel,
        draftLabel: resolveCanvasSemanticEditorCopy(language).draft,
        rejectionMessage: null,
        decision: { open: false, canApply: true },
      });
    }
  );

  it.each(['en', 'es'])('retains unavailable and generic rejection copy in %s', (language) => {
    const copy = resolveCanvasViewCopy(language);
    const semanticCopy = resolveCanvasSemanticEditorCopy(language);
    for (const [reason, expected] of [
      ['node_unavailable', semanticCopy.applyNodeUnavailable],
      ['command_unavailable', semanticCopy.applyRejected],
    ] as const) {
      expect(
        buildCanvasRelationalTreeSessionActionsModel(
          { ...state, applyRejection: { outcome: 'rejected', reason } },
          copy,
          language
        )
      ).toMatchObject({ rejectionMessage: expected });
    }
  });

  it.each(['en', 'es'])('keeps exact dependent Model and field context in %s', (language) => {
    const rejection = {
      outcome: 'rejected',
      reason: 'model_output_required',
      consumer: { nodeId: 'consumer', name: 'Model 2' },
      fields: [{ fieldId: 'stable-amount', name: 'amount' }],
    } as const;
    const model = buildCanvasRelationalTreeSessionActionsModel(
      { ...state, applyRejection: rejection },
      resolveCanvasViewCopy(language),
      language
    );
    expect(model).toMatchObject({
      rejectionMessage: formatCanvasModelOutputDependencyRejection(rejection, language),
    });
    if (model.kind !== 'active') throw new Error('Expected active presentation');
    expect(model.rejectionMessage).toContain('Model 2');
    expect(model.rejectionMessage).toContain('amount');
  });

  it.each(['en', 'es'])('preserves unavailable-dependency rejection in %s', (language) => {
    const rejection = {
      outcome: 'rejected',
      reason: 'model_output_dependency_unavailable',
    } as const;
    expect(
      buildCanvasRelationalTreeSessionActionsModel(
        { ...state, applyRejection: rejection },
        resolveCanvasViewCopy(language),
        language
      )
    ).toMatchObject({
      rejectionMessage: formatCanvasModelOutputDependencyRejection(rejection, language),
    });
  });
});
