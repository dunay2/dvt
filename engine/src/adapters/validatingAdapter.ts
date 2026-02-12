import { ZodError } from 'zod';

import { parseExecutionPlan } from '../contracts/schemas';
import {
  ValidationException,
  toValidationErrorResponse,
} from '../contracts/validation/validationErrors';

import type { IWorkflowEngineAdapter, EngineRunRef } from './IWorkflowEngineAdapter.v1';

export type ValidatingAdapterOptions = {
  warnOnValidation?: boolean;
  logger?: { warn: (msg: string) => void };
};

export function createValidatingAdapter(
  adapter: IWorkflowEngineAdapter,
  opts?: ValidatingAdapterOptions
): IWorkflowEngineAdapter {
  const logger = opts?.logger ?? console;

  // Create shallow wrapper that delegates to the underlying adapter
  const wrapper: Partial<IWorkflowEngineAdapter> = { ...adapter } as any;

  // Wrap startRun: call parseExecutionPlan (throws ZodError), convert to ValidationException
  wrapper.startRun = async function (plan: unknown): Promise<EngineRunRef> {
    try {
      const validated = parseExecutionPlan(plan);
      return await adapter.startRun(validated as any);
    } catch (err) {
      if (err instanceof ZodError) {
        const resp = toValidationErrorResponse(err, undefined, 'PLAN_INTEGRITY_VALIDATION_FAILED');
        if (opts?.warnOnValidation) {
          logger.warn?.(`Validation failed: ${JSON.stringify(resp)}`);
        }
        throw new ValidationException(resp);
      }
      // Pass through other errors
      throw err;
    }
  };

  return wrapper as IWorkflowEngineAdapter;
}
