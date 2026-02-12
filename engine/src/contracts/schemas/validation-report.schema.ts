/**
 * ValidationReport Schema (Zod)
 *
 * Schema for workflow engine capability validation reports.
 * Defines the contract for cross-adapter capability validation.
 *
 * @see IWorkflowEngine.v1.1.md § 4 - Cross-Adapter Capability Validation
 */

import { z, SafeParseReturnType } from 'zod';

/**
 * Validation error codes
 */
export const ValidationErrorCodeSchema = z.enum([
  'CAPABILITY_NOT_SUPPORTED',
  'PLUGIN_TRUST_TIER_MISSING',
  'INVALID_TARGET_ADAPTER',
  'SCHEMA_VERSION_UNKNOWN',
]);

/**
 * Validation warning codes
 */
export const ValidationWarningCodeSchema = z.enum([
  'CAPABILITY_EMULATED',
  'CAPABILITY_DEGRADED',
  'LATENCY_EXPECTED',
  'PERFORMANCE_IMPACT',
]);

/**
 * Capability support level
 */
export const CapabilitySupportLevelSchema = z.enum(['native', 'emulated', 'degraded']);

/**
 * Capability check result
 */
export const CapabilityCheckSchema = z.object({
  /** Capability name being checked */
  capability: z.string(),

  /** Whether the capability is supported */
  supported: z.boolean(),

  /** How the adapter supports this capability */
  adapterSupport: CapabilitySupportLevelSchema.optional(),

  /** Recommendation for user */
  recommendation: z.string().optional(),
});

/**
 * Validation error
 */
export const ValidationErrorSchema = z.object({
  code: ValidationErrorCodeSchema,
  capability: z.string().optional(),
  message: z.string(),
});

/**
 * Validation warning
 */
export const ValidationWarningSchema = z.object({
  code: ValidationWarningCodeSchema,
  message: z.string(),
});

/**
 * Validation status enum
 */
export const ValidationStatusSchema = z.enum(['VALID', 'WARNINGS', 'ERRORS']);

/**
 * Complete validation report schema
 */
export const ValidationReportSchema = z
  .object({
    /** Plan identifier */
    planId: z.string(),

    /** Plan version */
    planVersion: z.string(),

    /** When this report was generated */
    generatedAt: z.string().datetime({
      message: 'Must be ISO 8601 datetime',
    }),

    /** Target adapter being validated against */
    targetAdapter: z.enum(['temporal', 'conductor', 'auto']),

    /** Version of the adapter */
    adapterVersion: z.string(),

    /** Capabilities supported by this adapter */
    adapterCapabilities: z.array(z.string()).default([]),

    /** Overall validation status */
    status: ValidationStatusSchema,

    /** Detailed capability checks */
    capabilityChecks: z.array(CapabilityCheckSchema).default([]),

    /** Validation errors (blocking issues) */
    errors: z.array(ValidationErrorSchema).default([]),

    /** Validation warnings (non-blocking concerns) */
    warnings: z.array(ValidationWarningSchema).default([]),
  })
  .strict();

/**
 * Inferred TypeScript types
 */
export type ValidationReport = z.infer<typeof ValidationReportSchema>;
export type ValidationStatus = z.infer<typeof ValidationStatusSchema>;
export type CapabilityCheck = z.infer<typeof CapabilityCheckSchema>;
export type ValidationError = z.infer<typeof ValidationErrorSchema>;
export type ValidationWarning = z.infer<typeof ValidationWarningSchema>;
export type ValidationErrorCode = z.infer<typeof ValidationErrorCodeSchema>;
export type ValidationWarningCode = z.infer<typeof ValidationWarningCodeSchema>;

/**
 * Safe validation with error details
 */
export function parseValidationReport(data: unknown): ValidationReport {
  try {
    return ValidationReportSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`);
      throw new Error(`ValidationReport validation failed:\n  - ${messages.join('\n  - ')}`);
    }
    throw error;
  }
}

/**
 * Safe validation without throwing
 */
export function safeParseValidationReport(
  data: unknown
): SafeParseReturnType<unknown, ValidationReport> {
  return ValidationReportSchema.safeParse(data);
}
