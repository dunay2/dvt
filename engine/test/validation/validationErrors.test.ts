import { describe, it, expect } from 'vitest';
import { z } from 'zod';

import {
  toValidationErrorResponse,
  formatZodPath,
} from '../../src/contracts/validation/validationErrors';

describe('validationErrors utilities', () => {
  it('formats zod path arrays into canonical strings', () => {
    expect(formatZodPath(['a', 'b', 0, 'c'])).toBe('a.b[0].c');
    expect(formatZodPath([])).toBe('');
    expect(formatZodPath([0])).toBe('[0]');
    expect(formatZodPath(['root'])).toBe('root');
  });

  it('maps a ZodError into ValidationErrorResponse', () => {
    const schema = z.object({
      id: z.string(),
      items: z.array(z.object({ value: z.number() })),
    });

    const res = schema.safeParse({ id: 123, items: [{ value: 'x' }] });
    expect(res.success).toBe(false);
    if (!res.success) {
      const resp = toValidationErrorResponse(res.error, 'req-1');
      expect(resp.errorCode).toBe('VALIDATION_ERROR');
      expect(resp.requestId).toBe('req-1');
      expect(Array.isArray(resp.issues)).toBe(true);
      // at least one issue with canonical path
      expect(resp.issues.some((i) => typeof i.path === 'string')).toBe(true);
    }
  });
});
