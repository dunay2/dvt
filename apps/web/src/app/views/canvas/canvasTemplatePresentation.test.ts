import { describe, expect, it } from 'vitest';

import type { CanvasKindRegistration } from '../../plugins/nodeTypeContracts';
import { resolveCanvasTemplatePresentation } from './canvasTemplatePresentation';

function buildCanvasKind(overrides?: Partial<CanvasKindRegistration>): CanvasKindRegistration {
  return {
    kind: 'transformation',
    pluginId: 'dvt',
    label: 'Transformation',
    description: 'Flow-based transformation canvas for the protected authoring draft.',
    createTitle: 'Transformation canvas',
    nodeKinds: [],
    ...overrides,
  };
}

describe('resolveCanvasTemplatePresentation', () => {
  it('keeps registry copy as the English fallback', () => {
    const presentation = resolveCanvasTemplatePresentation(buildCanvasKind());

    expect(presentation.title).toBe('Transformation canvas');
    expect(presentation.description).toBe(
      'Flow-based transformation canvas for the protected authoring draft.'
    );
  });

  it('uses the already localized registry projection without a second copy authority', () => {
    const dbt = resolveCanvasTemplatePresentation(
      buildCanvasKind({
        kind: 'dbt',
        pluginId: 'dbt',
        label: 'dbt',
        description: 'Canvas basado en modelos para recursos y dependencias dbt.',
        createTitle: 'Canvas dbt',
      })
    );

    expect(dbt).toMatchObject({
      title: 'Canvas dbt',
      description: 'Canvas basado en modelos para recursos y dependencias dbt.',
    });
  });
});
