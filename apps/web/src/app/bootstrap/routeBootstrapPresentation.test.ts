import { beforeEach, describe, expect, it } from 'vitest';

import {
  createPublishedRouteBootstrapHandle,
  createStaticRouteBootstrapHandle,
  getPublishedRouteBootstrapPresentation,
  getRouteBootstrapRegistration,
  getStaticRouteSettledPresentation,
  publishRouteBootstrapPresentation,
  resetRouteBootstrapPresentation,
} from './routeBootstrapPresentation';

const TEST_PUBLISHED_ROUTE_HANDLE = {
  routeBootstrap: createPublishedRouteBootstrapHandle({
    pendingDetail: 'Preparing test route',
  }),
};

const TEST_STATIC_ROUTE_HANDLE = {
  routeBootstrap: createStaticRouteBootstrapHandle({
    pendingDetail: 'Preparing static route',
    readyDetail: 'Static route is ready',
  }),
};

const TEST_PUBLISHED_ROUTE_BOOTSTRAP_REGISTRATION = getRouteBootstrapRegistration(
  'test.route',
  TEST_PUBLISHED_ROUTE_HANDLE
)!;

const TEST_STATIC_ROUTE_BOOTSTRAP_REGISTRATION = getRouteBootstrapRegistration(
  'test.static-route',
  TEST_STATIC_ROUTE_HANDLE
)!;

describe('routeBootstrapPresentation', () => {
  beforeEach(() => {
    resetRouteBootstrapPresentation(TEST_PUBLISHED_ROUTE_BOOTSTRAP_REGISTRATION);
    resetRouteBootstrapPresentation(TEST_STATIC_ROUTE_BOOTSTRAP_REGISTRATION);
  });

  it('fails closed when a route has no bootstrap registration', () => {
    expect(getPublishedRouteBootstrapPresentation(null)).toEqual({
      status: 'pending',
      detail: 'Active route bootstrap contract is missing',
      canComplete: false,
    });
  });

  it('falls back to the registration initial presentation until a route publishes runtime posture', () => {
    expect(
      getPublishedRouteBootstrapPresentation(TEST_PUBLISHED_ROUTE_BOOTSTRAP_REGISTRATION)
    ).toEqual(TEST_PUBLISHED_ROUTE_BOOTSTRAP_REGISTRATION.routeBootstrap.initialPresentation);
  });

  it('publishes and resets a route bootstrap presentation by route id', () => {
    publishRouteBootstrapPresentation(TEST_PUBLISHED_ROUTE_BOOTSTRAP_REGISTRATION, {
      status: 'blocked',
      detail: 'Route is blocked by a prerequisite',
      canComplete: false,
    });

    expect(
      getPublishedRouteBootstrapPresentation(TEST_PUBLISHED_ROUTE_BOOTSTRAP_REGISTRATION)
    ).toEqual({
      status: 'blocked',
      detail: 'Route is blocked by a prerequisite',
      canComplete: false,
    });

    resetRouteBootstrapPresentation(TEST_PUBLISHED_ROUTE_BOOTSTRAP_REGISTRATION);

    expect(
      getPublishedRouteBootstrapPresentation(TEST_PUBLISHED_ROUTE_BOOTSTRAP_REGISTRATION)
    ).toEqual(TEST_PUBLISHED_ROUTE_BOOTSTRAP_REGISTRATION.routeBootstrap.initialPresentation);
  });

  it('extracts bootstrap registrations from route ids and typed route handles', () => {
    expect(
      getRouteBootstrapRegistration('test.route', TEST_PUBLISHED_ROUTE_HANDLE)
    ).toEqual(TEST_PUBLISHED_ROUTE_BOOTSTRAP_REGISTRATION);
    expect(getRouteBootstrapRegistration('test.route', { routeBootstrap: { id: 3 } })).toBeNull();
    expect(getRouteBootstrapRegistration(null, TEST_PUBLISHED_ROUTE_HANDLE)).toBeNull();
  });

  it('exposes the settled presentation only for static routes', () => {
    expect(
      getStaticRouteSettledPresentation(TEST_STATIC_ROUTE_BOOTSTRAP_REGISTRATION)
    ).toEqual({
      status: 'complete',
      detail: 'Static route is ready',
      canComplete: true,
    });
    expect(
      getStaticRouteSettledPresentation(TEST_PUBLISHED_ROUTE_BOOTSTRAP_REGISTRATION)
    ).toBeNull();
  });
});
