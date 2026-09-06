import { z } from 'zod';

import { RUNTIME_PROVIDER_VALUES } from '../../types/contracts.js';
import {
  CREDENTIAL_REFERENCE_MESSAGE,
  isCredentialReference,
  isIsoUtcString,
  isNonBlankString,
  isSha256HexString,
  NON_BLANK_STRING_MESSAGE,
  SHA256_HEX_STRING_MESSAGE,
  STRICT_ISO_UTC_STRING_MESSAGE,
} from '../../utils/contractPrimitives.js';
import { ConnectionRefSchema } from '../source-import/ConnectedSourceRef.v1.js';

const NonBlankStringSchema = z
  .string()
  .min(1)
  .refine((value) => isNonBlankString(value), {
    message: NON_BLANK_STRING_MESSAGE,
  })
  .brand<'NonBlankString'>();
const IsoUtcStringSchema = NonBlankStringSchema.refine((value) => isIsoUtcString(value), {
  message: STRICT_ISO_UTC_STRING_MESSAGE,
}).brand<'IsoUtcString'>();
const Sha256HexStringSchema = NonBlankStringSchema.refine((value) => isSha256HexString(value), {
  message: SHA256_HEX_STRING_MESSAGE,
}).brand<'Sha256HexString'>();
const CredentialReferenceSchema = NonBlankStringSchema.refine(isCredentialReference, {
  message: CREDENTIAL_REFERENCE_MESSAGE,
});

const ProviderSchema = z.enum(RUNTIME_PROVIDER_VALUES);
export const DbtProjectBundleRefSchema = z
  .object({
    uri: NonBlankStringSchema,
    kind: z.literal('dbt-project-bundle'),
    sha256: Sha256HexStringSchema,
    tenantId: NonBlankStringSchema,
    sizeBytes: z.number().int().nonnegative().optional(),
    expiresAt: IsoUtcStringSchema.optional(),
  })
  .superRefine((input, ctx) => {
    const locatorError = getDbtProjectBundleLocatorValidationError(
      input.uri,
      input.tenantId,
      input.sha256
    );
    if (locatorError !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['uri'],
        message: locatorError,
      });
    }
  })
  .strict();

export const PluginContextValueSchema = z.union([
  NonBlankStringSchema,
  DbtProjectBundleRefSchema,
  ConnectionRefSchema,
]);
export const GenericPluginContextSchema = z
  .record(z.string().min(1), PluginContextValueSchema)
  .refine((ctx) => Object.keys(ctx).length > 0, 'Plugin context must include at least one key');
export const DbtPluginContextSchema = z
  .object({
    projectBundleRef: DbtProjectBundleRefSchema,
    targetProfile: NonBlankStringSchema.optional(),
    credentialRef: CredentialReferenceSchema,
  })
  .strict();
export type DbtPluginContextSchemaT = z.infer<typeof DbtPluginContextSchema>;
export const RunExecutionContextRefSchema = z
  .object({
    uri: NonBlankStringSchema,
    sha256: Sha256HexStringSchema,
    schemaVersion: NonBlankStringSchema,
    planId: NonBlankStringSchema,
    planVersion: NonBlankStringSchema,
    pluginCompatibilityFingerprint: Sha256HexStringSchema.optional(),
  })
  .strict();

export const RunExecutionContextSchema = z
  .object({
    schemaVersion: NonBlankStringSchema,
    planId: NonBlankStringSchema,
    planVersion: NonBlankStringSchema,
    planSha256: Sha256HexStringSchema,
    pluginCompatibilityFingerprint: Sha256HexStringSchema.optional(),
    tenantId: NonBlankStringSchema,
    projectId: NonBlankStringSchema,
    environmentId: NonBlankStringSchema,
    targetAdapter: ProviderSchema,
    createdAtIso: IsoUtcStringSchema,
    createdBy: NonBlankStringSchema,
    pluginContexts: z.record(z.string().min(1), GenericPluginContextSchema),
  })
  .superRefine((input, ctx) => {
    const dbtContext = input.pluginContexts['dbt'];
    if (dbtContext !== undefined) {
      addPluginContextIssues('dbt', DbtPluginContextSchema.safeParse(dbtContext), ctx);
    }
  })
  .strict();

function addPluginContextIssues(
  contextKey: string,
  result: z.ZodSafeParseResult<unknown>,
  ctx: z.RefinementCtx
): void {
  if (result.success) {
    return;
  }

  for (const issue of result.error.issues) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: issue.message,
      path: ['pluginContexts', contextKey, ...issue.path],
    });
  }
}

export function getDbtProjectBundleLocatorValidationError(
  uri: string,
  tenantId: string,
  sha256: string
): string | undefined {
  let parsedUri: globalThis.URL;
  try {
    parsedUri = new globalThis.URL(uri);
  } catch {
    return 'DBT project bundle URI must be a valid file:// or s3:// locator';
  }

  const scheme = parsedUri.protocol.replace(/:$/, '').toLowerCase();
  if (scheme === 's3') {
    const actualKey = decodeURIComponent(parsedUri.pathname.replace(/^\/+/, ''));
    const expectedKey = buildCanonicalDbtProjectBundleRelativePath(tenantId, sha256);
    if (actualKey !== expectedKey) {
      return `DBT project bundle URI must resolve to s3://${parsedUri.hostname}/${expectedKey}`;
    }
    return undefined;
  }

  if (scheme === 'file') {
    const actualPath = normalizePath(decodedPathname(parsedUri));
    const expectedSuffix = normalizePath(
      buildCanonicalDbtProjectBundleRelativePath(tenantId, sha256)
    );
    if (!actualPath.endsWith(expectedSuffix)) {
      return `DBT project bundle file URI must end with /${expectedSuffix}`;
    }
    return undefined;
  }

  return 'DBT project bundle URI must use file:// or s3://';
}

function decodedPathname(uri: globalThis.URL): string {
  return decodeURIComponent(uri.pathname);
}

function normalizePath(value: string): string {
  return value.replace(/\\/g, '/').replace(/^\/+/, '');
}

export function buildCanonicalDbtProjectBundleRelativePath(
  tenantId: string,
  sha256: string
): string {
  return `tenants/${tenantId}/${sha256}`;
}
