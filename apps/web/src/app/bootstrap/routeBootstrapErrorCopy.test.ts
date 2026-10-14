// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import {
  formatRouteBootstrapActiveRegistrationMissingMessage,
  formatRouteBootstrapRegistrationNotFoundMessage,
  resolveRouteBootstrapErrorCopy,
} from './routeBootstrapErrorCopy';
import {
  RouteBootstrapActiveRegistrationMissingError,
  RouteBootstrapRegistrationNotFoundError,
} from './routeBootstrapErrors';

describe('routeBootstrapErrorCopy', () => {
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
