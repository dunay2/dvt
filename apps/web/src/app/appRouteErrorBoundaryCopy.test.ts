/** Owned concern: verify locale resolution for root route error boundary copy. */
import { describe, expect, it } from 'vitest';

import { resolveAppRouteErrorBoundaryCopy } from './appRouteErrorBoundaryCopy';

describe('appRouteErrorBoundaryCopy', () => {
  it('resolves supported route error boundary locales without component-owned strings', () => {
    expect(resolveAppRouteErrorBoundaryCopy('es-ES')).toMatchObject({
      title: 'La aplicacion encontro un error inesperado.',
      reloadLabel: 'Recargar aplicacion',
      homeLabel: 'Volver al workspace',
      unexpectedRouteError: 'Se produjo un error inesperado en la ruta.',
    });
  });

  it('falls back to English copy for unsupported locales', () => {
    expect(resolveAppRouteErrorBoundaryCopy('fr-FR')).toMatchObject({
      title: 'The application hit an unexpected error.',
      reloadLabel: 'Reload application',
      homeLabel: 'Return to workspace',
      unexpectedRouteError: 'An unexpected route error occurred.',
    });
  });
});
