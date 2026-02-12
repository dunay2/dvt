import { ZodError } from 'zod';

export type ValidationIssue = {
  path: string; // canonical: a.b[0].c
  code: string;
  message: string;
};

export type ValidationErrorResponse = {
  errorCode: string;
  message: string;
  issues: ValidationIssue[];
  requestId?: string;
};

export function formatZodPath(path: Array<string | number>): string {
  // Convert zod path array into canonical string: a.b[0].c
  let out = '';
  for (const p of path) {
    if (typeof p === 'number') {
      out += `[${p}]`;
    } else {
      if (out.length > 0 && !out.endsWith(']')) out += '.';
      out += p;
    }
  }
  return out;
}

export function toValidationErrorResponse(
  err: ZodError,
  requestId?: string,
  errorCode = 'VALIDATION_ERROR',
  message = 'Invalid request payload'
): ValidationErrorResponse {
  const issues = err.issues.map((i) => ({
    path: formatZodPath(i.path),
    code: i.code,
    message: i.message,
  }));

  return {
    errorCode,
    message,
    issues,
    requestId,
  };
}

export class ValidationException extends Error {
  response: ValidationErrorResponse;
  constructor(response: ValidationErrorResponse) {
    super(response.message);
    this.name = 'ValidationException';
    this.response = response;
  }

  static fromZodError(
    err: ZodError,
    requestId?: string,
    errorCode = 'VALIDATION_ERROR',
    message?: string
  ): ValidationException {
    return new ValidationException(toValidationErrorResponse(err, requestId, errorCode, message));
  }
}
