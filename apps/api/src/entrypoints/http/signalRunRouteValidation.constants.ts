import type { SupportedSignalType } from '../../application/ports/runtime.js';

export const SIGNAL_RUN_PARSE_ERROR_CODE = {
  INVALID_RUN_ID: 'INVALID_RUN_ID',
  INVALID_BODY: 'INVALID_BODY',
  INVALID_SIGNAL_TYPE: 'INVALID_SIGNAL_TYPE',
  MISSING_TENANT_SCOPE: 'MISSING_TENANT_SCOPE',
  INVALID_TENANT_ID: 'INVALID_TENANT_ID',
} as const;

export type SignalRunParseErrorCode =
  (typeof SIGNAL_RUN_PARSE_ERROR_CODE)[keyof typeof SIGNAL_RUN_PARSE_ERROR_CODE];

export const SIGNAL_RUN_PARSE_ERROR_RESPONSE = {
  BAD_REQUEST: 'BAD_REQUEST',
  FORBIDDEN: 'FORBIDDEN',
} as const;

export const SUPPORTED_SIGNAL_TYPES: ReadonlySet<SupportedSignalType> = new Set([
  'PAUSE',
  'RESUME',
  'CANCEL',
]);

export const SIGNAL_ROUTE_COMPATIBILITY_POLICY = {
  // Keep /signal supporting CANCEL while dedicated /cancel route coexists.
  allowCancelSignalType: true,
} as const;

export type SignalRouteCompatibilityPolicy = {
  readonly allowCancelSignalType: boolean;
};
