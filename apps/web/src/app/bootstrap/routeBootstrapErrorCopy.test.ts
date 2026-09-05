// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  detectRouteBootstrapLocale,
  formatRouteBootstrapActiveRegistrationMissingMessage,
  formatRouteBootstrapRegistrationNotFoundMessage,
  resolveRouteBootstrapErrorCopy,
} from './routeBootstrapErrorCopy';
import {
  RouteBootstrapActiveRegistrationMissingError,
  RouteBootstrapRegistrationNotFoundError,
} from './routeBootstrapErrors';

describe('routeBootstrapErrorCopy', () => {
  const originalDocumentLang = document.documentElement.lang;

  afterEach(() => {
    document.documentElement.lang = originalDocumentLang;
    vi.restoreAllMocks();
  });

  it('prefers navigator language over static document language', () => {
    document.documentElement.lang = 'en';
    vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('es-ES');

    expect(detectRouteBootstrapLocale()).toBe('es-ES');
  });

  it('falls back to document language when navigator language is unavailable', () => {
    document.documentElement.lang = 'es-ES';
    vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('');
    vi.spyOn(window.navigator, 'languages', 'get').mockReturnValue([]);

    expect(detectRouteBootstrapLocale()).toBe('es-ES');
  });

  it('falls back to navigator languages when navigator language is empty', () => {
    document.documentElement.lang = 'en';
    vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('');
    vi.spyOn(window.navigator, 'languages', 'get').mockReturnValue(['es-MX']);

    expect(detectRouteBootstrapLocale()).toBe('es-MX');
  });

  it('resolves Spanish bootstrap copy when the runtime locale is Spanish', () => {
    expect(resolveRouteBootstrapErrorCopy('es-ES')).toEqual({
      dataRouterContextMissing:
        'El bootstrap de ruta requiere un contexto de React Router data router (RouterProvider).',
      activeRegistrationMissing: 'Falta el registro activo de route bootstrap para la ruta actual.',
      registrationNotFoundPrefix: 'No se encontro el registro de route bootstrap para route id',
    });
    expect(formatRouteBootstrapRegistrationNotFoundMessage('dbt.canvas', 'es-ES')).toBe(
      'No se encontro el registro de route bootstrap para route id: dbt.canvas'
    );
  });

  it('falls back to English copy for unsupported locales', () => {
    expect(resolveRouteBootstrapErrorCopy('fr-FR')).toEqual({
      dataRouterContextMissing:
        'Route bootstrap requires a React Router data router context (RouterProvider).',
      activeRegistrationMissing: 'Active route bootstrap registration is missing.',
      registrationNotFoundPrefix: 'Route bootstrap registration not found for route id',
    });
  });

  it('localizes active-registration-missing errors for supported locales', () => {
    expect(formatRouteBootstrapActiveRegistrationMissingMessage('es-ES')).toBe(
      'Falta el registro activo de route bootstrap para la ruta actual.'
    );

    const error = new RouteBootstrapActiveRegistrationMissingError({
      locale: 'es-ES',
    });

    expect(error.code).toBe('ROUTE_BOOTSTRAP_ACTIVE_REGISTRATION_MISSING');
    expect(error.message).toBe('Falta el registro activo de route bootstrap para la ruta actual.');
  });

  it('localizes registration-not-found errors for supported locales', () => {
    const error = new RouteBootstrapRegistrationNotFoundError('dbt.canvas', {
      locale: 'es-ES',
    });

    expect(error.code).toBe('ROUTE_BOOTSTRAP_REGISTRATION_NOT_FOUND');
    expect(error.message).toBe(
      'No se encontro el registro de route bootstrap para route id: dbt.canvas'
    );
  });
});
