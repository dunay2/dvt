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
    emptyState: {
      title: 'Start transformation canvas',
      editableMessage: 'Start transformation authoring',
      firstNodeLabel: 'Add first transformation node',
      firstNodeHelper: 'Choose a transformation node.',
    },
    nodeKinds: [],
    ...overrides,
  };
}

describe('resolveCanvasTemplatePresentation', () => {
  it('keeps registry copy as the English fallback', () => {
    const presentation = resolveCanvasTemplatePresentation(buildCanvasKind(), 'en-US');

    expect(presentation.title).toBe('Transformation canvas');
    expect(presentation.description).toBe(
      'Flow-based transformation canvas for the protected authoring draft.'
    );
  });

  it('resolves built-in dbt and transformation templates in Spanish locale', () => {
    const transformation = resolveCanvasTemplatePresentation(buildCanvasKind(), 'es-ES');
    const dbt = resolveCanvasTemplatePresentation(
      buildCanvasKind({
        kind: 'dbt',
        pluginId: 'dbt',
        label: 'dbt',
        description: 'Model-first canvas for dbt resources and dependencies.',
        createTitle: 'dbt canvas',
      }),
      'es-ES'
    );

    expect(transformation).toMatchObject({
      title: 'Canvas de transformacion',
      description: 'Canvas de flujo para el borrador protegido de autoria.',
    });
    expect(dbt).toMatchObject({
      title: 'Canvas dbt',
      description: 'Canvas basado en modelo para recursos y dependencias dbt.',
    });
  });
});
