import {
  formatRouteBootstrapRegistrationNotFoundMessage,
  resolveRouteBootstrapErrorCopy,
} from './routeBootstrapErrorCopy';

export type RouteBootstrapErrorCode =
  | 'ROUTE_BOOTSTRAP_DATA_ROUTER_CONTEXT_MISSING'
  | 'ROUTE_BOOTSTRAP_REGISTRATION_NOT_FOUND';

type RouteBootstrapErrorOptions = {
  readonly cause?: unknown;
};

export class RouteBootstrapError extends Error {
  readonly code: RouteBootstrapErrorCode;

  constructor(
    code: RouteBootstrapErrorCode,
    message: string,
    options?: RouteBootstrapErrorOptions
  ) {
    super(message, options);
    this.name = 'RouteBootstrapError';
    this.code = code;
  }
}

type RouteBootstrapDataRouterContextErrorOptions = {
  readonly locale?: string;
  readonly cause?: unknown;
};

export class RouteBootstrapDataRouterContextError extends RouteBootstrapError {
  constructor(options: RouteBootstrapDataRouterContextErrorOptions = {}) {
    const copy = resolveRouteBootstrapErrorCopy(options.locale);
    super('ROUTE_BOOTSTRAP_DATA_ROUTER_CONTEXT_MISSING', copy.dataRouterContextMissing, {
      cause: options.cause,
    });
    this.name = 'RouteBootstrapDataRouterContextError';
  }
}

type RouteBootstrapRegistrationNotFoundErrorOptions = {
  readonly locale?: string;
};

export class RouteBootstrapRegistrationNotFoundError extends RouteBootstrapError {
  readonly routeId: string;

  constructor(
    routeId: string,
    options: RouteBootstrapRegistrationNotFoundErrorOptions = {}
  ) {
    super(
      'ROUTE_BOOTSTRAP_REGISTRATION_NOT_FOUND',
      formatRouteBootstrapRegistrationNotFoundMessage(routeId, options.locale)
    );
    this.name = 'RouteBootstrapRegistrationNotFoundError';
    this.routeId = routeId;
  }
}
