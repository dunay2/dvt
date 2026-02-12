import { ZodError } from 'zod';

import { parseExecutionPlan, parseValidationReport } from '../schemas';

import { ValidationException, toValidationErrorResponse } from './validationErrors';

// Note: schemas exports are expected to provide parseExecutionPlan and parseValidationReport

export function validateExecutionPlan(input: unknown, requestId?: string) {
  try {
    return parseExecutionPlan(input);
  } catch (err) {
    if (err instanceof ZodError) {
      throw new ValidationException(toValidationErrorResponse(err, requestId));
    }
    throw err;
  }
}

export function validateValidationReport(input: unknown, requestId?: string) {
  try {
    return parseValidationReport(input);
  } catch (err) {
    if (err instanceof ZodError) {
      throw new ValidationException(toValidationErrorResponse(err, requestId));
    }
    throw err;
  }
}

// Helper to wrap adapter methods that accept an ExecutionPlan-like unknown input
export function withExecutionPlanValidation<Fn extends (plan: any, ...args: any[]) => any>(fn: Fn) {
  return function (plan: unknown, ...args: any[]) {
    const validated = validateExecutionPlan(plan);
    // @ts-expect-error allow forwarding typed value
    return fn(validated, ...args);
  } as unknown as Fn;
}
