import { describe, expect, it } from 'vitest';

import { resolveRunEventFeedHealthCopy } from './runEventFeedHealthCopy';

describe('resolveRunEventFeedHealthCopy', () => {
  it('resolves concise English feed health copy', () => {
    expect(resolveRunEventFeedHealthCopy('en-US')).toMatchObject({
      states: {
        loading: 'Loading',
        live: 'Live',
        degraded: 'Degraded',
        complete: 'Complete',
        failed: 'Failed',
      },
      runLabel: 'Run',
      terminalLoading: 'Loading terminal...',
      retryAction: 'Retry event feed',
    });
  });

  it('resolves the same vocabulary in Spanish', () => {
    expect(resolveRunEventFeedHealthCopy('es-ES')).toMatchObject({
      states: {
        loading: 'Cargando',
        live: 'En directo',
        degraded: 'Degradado',
        complete: 'Completo',
        failed: 'Fallido',
      },
      messages: {
        idle: 'Inicia una ejecución para ver aquí sus eventos en directo.',
        loading: 'Cargando eventos de ejecución...',
        live: 'Los eventos de ejecución están en directo.',
      },
      runLabel: 'Ejecución',
      terminalLoading: 'Cargando terminal...',
      retryAction: 'Reintentar eventos',
    });
  });
});
