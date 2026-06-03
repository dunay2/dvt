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

  it('resolves Canvas workbench and autosave chrome from one locale catalog', () => {
    const spanishCopy = resolveCanvasViewCopy('es-ES');

    expect(canvasViewCopy.routeNeedsCanvasTitle).toBe('Create canvas in this workspace');
    expect(canvasViewCopy.routeNeedsCanvasTemplateLabel).toBe('Choose a canvas template');
    expect(spanishCopy.routeNeedsCanvasTitle).toBe('Crear canvas en este workspace');
    expect(spanishCopy.routeNeedsCanvasTemplateLabel).toBe('Elige una plantilla de canvas');
    expect(spanishCopy.toolbarLayoutLabel).toBe('Disposicion');
    expect(spanishCopy.toolbarRunLabel).toBe('Ejecutar');
    expect(spanishCopy.draftSyncedLabel).toBe('Borrador sincronizado');
    expect(spanishCopy.draftSavedLabel).toBe('Borrador guardado');
    expect(spanishCopy.draftSaveFailedLabel).toBe('Guardado del borrador fallido');
    expect([
      spanishCopy.workbenchGraphTabLabel,
      spanishCopy.workbenchCodeTabLabel,
      spanishCopy.workbenchLineageTabLabel,
      spanishCopy.workbenchDiffTabLabel,
      spanishCopy.workbenchArtifactsTabLabel,
      spanishCopy.workbenchRunsTabLabel,
    ]).toEqual(['Grafo', 'Codigo', 'Linaje', 'Diferencias', 'Artefactos', 'Ejecuciones']);
  });
});
