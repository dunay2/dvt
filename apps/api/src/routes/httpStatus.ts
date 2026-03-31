export const HTTP_STATUS_CODE = Object.freeze({
  ok: 200,
  accepted: 202,
  badRequest: 400,
  unauthorized: 401,
  forbidden: 403,
  notFound: 404,
  conflict: 409,
  internalServerError: 500,
  unprocessableEntity: 422,
  tooManyRequests: 429,
  serviceUnavailable: 503,
} as const);

export type HttpStatusCode = (typeof HTTP_STATUS_CODE)[keyof typeof HTTP_STATUS_CODE];
