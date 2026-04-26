import { describe, expect, it } from 'vitest';

import {
  canvasViewCopy,
  formatCanvasConnectionRejection,
  formatDisabledCanvasPluginMessage,
  formatCanvasLimitedAccessMessage,
  formatCanvasNodeAddedMessage,
  formatCanvasNodeRemovedMessage,
  formatTransformationGraphValidationSummary,
  resolveCanvasViewCopy,
} from './copy';

describe('canvas copy', () => {
  it('keeps English fallback copy as the default resolved surface', () => {
    expect(canvasViewCopy.routeLoadingTitle).toBe('Loading canvas');
    expect(canvasViewCopy.mutationUnavailableMessage).toBe(
      'Graph edits are unavailable in this context.'
    );
  });

  it('resolves Spanish localized copy explicitly', () => {
    const spanishCopy = resolveCanvasViewCopy('es-ES');

    expect(spanishCopy.routeLoadingTitle).toBe('Cargando canvas');
    expect(spanishCopy.layoutAppliedMessage).toBe('Layout aplicado');
  });

  it('formats limited-access summaries with correct English singular and plural grammar', () => {
    expect(formatCanvasLimitedAccessMessage(['run_start'], 'en')).toBe(
      'You can keep inspecting the graph, but run start is unavailable in this context.'
    );
    expect(formatCanvasLimitedAccessMessage(['run_start', 'graph_edits'], 'en')).toBe(
      'You can keep inspecting the graph, but run start and graph edits are unavailable in this context.'
    );
  });

  it('formats limited-access summaries with correct Spanish singular and plural grammar', () => {
    expect(formatCanvasLimitedAccessMessage(['plan_preview'], 'es')).toBe(
      'Puedes seguir inspeccionando el grafo, pero el preview del plan no esta disponible en este contexto.'
    );
    expect(formatCanvasLimitedAccessMessage(['run_start', 'graph_edits'], 'es')).toBe(
      'Puedes seguir inspeccionando el grafo, pero el arranque de runs y la edicion del grafo no estan disponibles en este contexto.'
    );
  });

  it('formats node add and remove toast copy through the shared copy surface', () => {
    expect(formatCanvasNodeAddedMessage('orders', 'en')).toBe('Added orders to canvas');
    expect(formatCanvasNodeRemovedMessage('orders', 'en')).toBe('Removed orders');
    expect(formatCanvasNodeAddedMessage('orders', 'es')).toBe('Se ha anadido orders al canvas');
    expect(formatCanvasNodeRemovedMessage('orders', 'es')).toBe('Se ha eliminado orders');
  });

  it('formats disabled-plugin copy separately from unsupported canvas kinds', () => {
    expect(formatDisabledCanvasPluginMessage('dbt', 'en')).toBe(
      'Canvas cannot open persisted canvas kind "dbt" because its plugin is disabled or unavailable.'
    );
    expect(formatDisabledCanvasPluginMessage('dbt', 'es')).toBe(
      'Canvas no puede abrir el tipo de canvas persistido "dbt" porque su plugin esta deshabilitado o no disponible.'
    );
  });

  it('formats transformation validation summaries from stable summary codes', () => {
    expect(formatTransformationGraphValidationSummary('valid', 'en')).toBe(
      'Transformation draft is valid for preview.'
    );
    expect(formatTransformationGraphValidationSummary('requires_three_nodes', 'es')).toBe(
      'El plan requiere exactamente 3 nodos: source, sql_transform y sink.'
    );
  });

  it('formats typed connection rejections through the canvas copy owner', () => {
    expect(formatCanvasConnectionRejection({ code: 'duplicate_edge' }, 'en')).toBe(
      'Connection already exists.'
    );
    expect(
      formatCanvasConnectionRejection(
        {
          code: 'cross_plugin_bridge_missing',
          sourcePluginId: 'dbt',
          sourceRole: 'input',
          targetPluginId: 'dvt',
          targetRole: 'output',
        },
        'es'
      )
    ).toBe(
      'No existe un puente de puertos de datos compatible entre dbt (input) y dvt (output).'
    );
  });
});
