import { ZodError, type ZodType } from 'zod';

import {
  CONTRACTS_ERROR_CODE,
  CONTRACTS_ERROR_MESSAGE_KEY,
  DvtContractError,
  type ContractsErrorMessageParams,
  defaultContractsErrorMessage,
} from '../errorContract.js';

export interface ValidationIssue {
  path: string;
  code: string;
  message: string;
}

export interface ValidationErrorResponse {
  statusCode: 400;
  error: 'Bad Request';
  code: typeof CONTRACTS_ERROR_CODE.CONTRACT_VALIDATION_FAILED;
  messageKey: typeof CONTRACTS_ERROR_MESSAGE_KEY.CONTRACT_VALIDATION_FAILED;
  messageParams: ContractsErrorMessageParams<'CONTRACT_VALIDATION_FAILED'>;
  message: string;
  details: ValidationIssue[];
}

export class ContractValidationError extends DvtContractError<'CONTRACT_VALIDATION_FAILED'> {
  readonly code = CONTRACTS_ERROR_CODE.CONTRACT_VALIDATION_FAILED;
  readonly statusCode: 400;
  readonly error: 'Bad Request';
  readonly details: ValidationIssue[];

  constructor(details: ValidationIssue[]) {
    super(CONTRACTS_ERROR_CODE.CONTRACT_VALIDATION_FAILED, 'CONTRACT_VALIDATION_FAILED', {
      details,
    });
    this.name = 'ContractValidationError';
    this.statusCode = 400;
    this.error = 'Bad Request';
    this.details = details;
  }

  toResponse(): ValidationErrorResponse {
    return {
      statusCode: this.statusCode,
      error: this.error,
      code: this.code,
      messageKey: this.messageKey,
      messageParams: this.messageParams,
      message: this.message,
      details: this.details,
    };
  }
}

export function toValidationErrorResponse(error: unknown): ValidationErrorResponse {
  if (error instanceof ContractValidationError) {
    return error.toResponse();
  }

  if (error instanceof ZodError) {
    return {
      statusCode: 400,
      error: 'Bad Request',
      code: CONTRACTS_ERROR_CODE.CONTRACT_VALIDATION_FAILED,
      messageKey: CONTRACTS_ERROR_MESSAGE_KEY.CONTRACT_VALIDATION_FAILED,
      messageParams: {},
      message: defaultContractsErrorMessage('CONTRACT_VALIDATION_FAILED', {}),
      details: mapZodIssues(error),
    };
  }

  return {
    statusCode: 400,
    error: 'Bad Request',
    code: CONTRACTS_ERROR_CODE.CONTRACT_VALIDATION_FAILED,
    messageKey: CONTRACTS_ERROR_MESSAGE_KEY.CONTRACT_VALIDATION_FAILED,
    messageParams: {},
    message: defaultContractsErrorMessage('CONTRACT_VALIDATION_FAILED', {}),
    details: [
      {
        path: '$',
        code: 'unknown',
        message: 'Unknown validation error',
      },
    ],
  };
}

export function parseWithSchema<T>(schema: ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (result.success) {
    return result.data;
  }

  throw new ContractValidationError(mapZodIssues(result.error));
}

function mapZodIssues(error: ZodError): ValidationIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.length > 0 ? issue.path.join('.') : '$',
    code: issue.code,
    message: issue.message,
  }));
}
