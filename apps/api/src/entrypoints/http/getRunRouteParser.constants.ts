export const GET_RUN_PARSE_ERROR_CODE = {
  INVALID_RUN_ID: 'INVALID_RUN_ID',
  MISSING_TENANT_SCOPE: 'MISSING_TENANT_SCOPE',
  INVALID_TENANT_ID: 'INVALID_TENANT_ID',
  INVALID_ENRICHED_FLAG: 'INVALID_ENRICHED_FLAG',
} as const;

export type GetRunParseErrorCode =
  (typeof GET_RUN_PARSE_ERROR_CODE)[keyof typeof GET_RUN_PARSE_ERROR_CODE];

export const GET_RUN_PARSE_ERROR_RESPONSE = {
  BAD_REQUEST: 'BAD_REQUEST',
  FORBIDDEN: 'FORBIDDEN',
} as const;

export const GET_RUN_ACTION = {
  kind: 'query',
  name: 'run:view',
} as const;
