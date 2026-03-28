export const HTTP_HEADER = Object.freeze({
  retryAfter: 'retry-after',
} as const);

export const HTTP_ERROR = Object.freeze({
  unauthorized: 'UNAUTHORIZED',
  forbidden: 'FORBIDDEN',
  tooManyRequests: 'TOO_MANY_REQUESTS',
  serviceUnavailable: 'SERVICE_UNAVAILABLE',
  planRejected: 'PLAN_REJECTED',
  adapterNotConfigured: 'ADAPTER_NOT_CONFIGURED',
  notFound: 'NOT_FOUND',
  unprocessableEntity: 'UNPROCESSABLE_ENTITY',
  conflict: 'CONFLICT',
} as const);

export const HTTP_BODY_CODE = Object.freeze({
  runNotFound: 'RUN_NOT_FOUND',
  tenantAccessDenied: 'TENANT_ACCESS_DENIED',
  runAlreadyExists: 'RUN_ALREADY_EXISTS',
} as const);
