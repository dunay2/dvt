/** Owned concern: verify app-bootstrap command factories as the shell publishing API. */
import { describe, expect, it } from 'vitest';

import { resolveAppBootstrapCopy } from './appBootstrapCopy';
import {
  createCapabilitiesFallbackBootstrapCommand,
  createHealthFailedBootstrapCommand,
  createServicesReadyBootstrapCommand,
} from './appBootstrapCommands';

describe('appBootstrapCommands', () => {
  it('keeps shell publishers on typed bootstrap commands instead of localized strings', () => {
    const copy = resolveAppBootstrapCopy('es-ES');

    expect(createServicesReadyBootstrapCommand({ copy })).toEqual({
      step: 'services',
      status: 'complete',
      detail: 'Servicios de aplicacion y query client preparados',
    });
    expect(createCapabilitiesFallbackBootstrapCommand({ copy })).toEqual({
      step: 'capabilities',
      status: 'degraded',
      detail:
        'No se pudieron cargar las capacidades. Se usa la configuracion fallback de la shell.',
    });
    expect(createHealthFailedBootstrapCommand({ copy })).toEqual({
      step: 'health',
      status: 'failed',
      detail: 'Las comprobaciones de salud de plataforma fallaron durante el arranque.',
    });
  });

  it('preserves externally supplied operational detail while owning fallback copy', () => {
    const copy = resolveAppBootstrapCopy('es-ES');

    expect(
      createHealthFailedBootstrapCommand({
        copy,
        detail: 'Request to /healthz failed (NETWORK)',
      })
    ).toEqual({
      step: 'health',
      status: 'failed',
      detail: 'Request to /healthz failed (NETWORK)',
    });
  });
});
