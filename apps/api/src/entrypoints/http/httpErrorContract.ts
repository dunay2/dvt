import type { FastifyReply } from 'fastify';

import { HTTP_STATUS_CODE, type HttpStatusCode } from '../../routes/httpStatus.js';

export const HTTP_HEADER = Object.freeze({
  retryAfter: 'retry-after',
} as const);

export const HTTP_ERROR_TYPE = Object.freeze({
  badRequest: 'bad_request',
  unauthorized: 'unauthorized',
  forbidden: 'forbidden',
  notFound: 'not_found',
  conflict: 'conflict',
  rateLimited: 'rate_limited',
  serviceUnavailable: 'service_unavailable',
  unprocessable: 'unprocessable',
  internalServerError: 'internal_server_error',
} as const);

export type HttpErrorType = (typeof HTTP_ERROR_TYPE)[keyof typeof HTTP_ERROR_TYPE];

export interface HttpErrorEnvelope {
  readonly error: {
    readonly type: HttpErrorType;
    readonly reason: string;
    readonly target?: string;
    readonly details?: Readonly<Record<string, unknown>>;
  };
}

export interface HttpResponseModel {
  readonly status: HttpStatusCode;
  readonly body: Readonly<Record<string, unknown>>;
  readonly headers?: Readonly<Record<string, string>>;
}

export function createHttpErrorResponse(params: {
  readonly type: HttpErrorType;
  readonly reason: string;
  readonly target?: string;
  readonly details?: Readonly<Record<string, unknown>>;
  readonly headers?: Readonly<Record<string, string>>;
}): HttpResponseModel {
  return {
    status: httpStatusForErrorType(params.type),
    ...(params.headers === undefined ? {} : { headers: params.headers }),
    body: {
      error: {
        type: params.type,
        reason: normalizeHttpErrorReason(params.reason),
        ...(params.target === undefined ? {} : { target: params.target }),
        ...(params.details === undefined ? {} : { details: params.details }),
      },
    },
  };
}

export function sendHttpResponse(reply: FastifyReply, response: HttpResponseModel): void {
  if (response.headers !== undefined) {
    for (const [name, value] of Object.entries(response.headers)) {
      reply.header(name, value);
    }
  }

  reply.code(response.status).send(response.body);
}

export function normalizeHttpErrorReason(value: string): string {
  return value
    .trim()
    .replaceAll(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replaceAll(/[\s-]+/g, '_')
    .replaceAll(/_+/g, '_')
    .toLowerCase();
}

const HTTP_ERROR_TYPE_TO_STATUS: Record<HttpErrorType, HttpStatusCode> = {
  [HTTP_ERROR_TYPE.badRequest]: HTTP_STATUS_CODE.badRequest,
  [HTTP_ERROR_TYPE.unauthorized]: HTTP_STATUS_CODE.unauthorized,
  [HTTP_ERROR_TYPE.forbidden]: HTTP_STATUS_CODE.forbidden,
  [HTTP_ERROR_TYPE.notFound]: HTTP_STATUS_CODE.notFound,
  [HTTP_ERROR_TYPE.conflict]: HTTP_STATUS_CODE.conflict,
  [HTTP_ERROR_TYPE.rateLimited]: HTTP_STATUS_CODE.tooManyRequests,
  [HTTP_ERROR_TYPE.serviceUnavailable]: HTTP_STATUS_CODE.serviceUnavailable,
  [HTTP_ERROR_TYPE.unprocessable]: HTTP_STATUS_CODE.unprocessableEntity,
  [HTTP_ERROR_TYPE.internalServerError]: HTTP_STATUS_CODE.internalServerError,
};

function httpStatusForErrorType(type: HttpErrorType): HttpStatusCode {
  return HTTP_ERROR_TYPE_TO_STATUS[type];
}
