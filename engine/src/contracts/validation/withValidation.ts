import { ZodError } from 'zod';

import {
  parseExecutionPlan,
  parseValidationReport,
  type ExecutionPlan,
  type ValidationReport,
} from '../schemas';

import { ValidationException } from './validationErrors';

// Note: schemas exports are expected to provide parseExecutionPlan and parseValidationReport

export function validateExecutionPlan(input: unknown, requestId?: string): ExecutionPlan {
  try {
    return parseExecutionPlan(input);
  } catch (err) {
    if (err instanceof ZodError) {
      throw ValidationException.fromZodError(
        err,
        requestId,
        'PLAN_INTEGRITY_VALIDATION_FAILED',
        'Invalid execution plan payload'
      );
    }
    throw err;
  }
}

export function validateValidationReport(input: unknown, requestId?: string): ValidationReport {
  try {
    return parseValidationReport(input);
  } catch (err) {
    if (err instanceof ZodError) {
      throw ValidationException.fromZodError(
        err,
        requestId,
        'VALIDATION_ERROR',
        'Invalid validation report payload'
      );
    }
    throw err;
  }
}

// Helper to wrap adapter methods that accept an ExecutionPlan-like unknown input
export function withExecutionPlanValidation<Rest extends unknown[], R>(
  fn: (plan: ExecutionPlan, ...args: Rest) => R
) {
  return (plan: unknown, ...args: Rest): R => {
    const validated = validateExecutionPlan(plan);
    return fn(validated, ...args);
  };
}
