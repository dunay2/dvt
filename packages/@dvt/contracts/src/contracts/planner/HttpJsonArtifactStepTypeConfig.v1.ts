/**
 * Owned concern: define one bounded HTTPS GET to immutable JSON artifact step.
 *
 * @baseline ADR-0003: Execution Model Sovereignty
 * @baseline ADR-0035: Planner Public Contract Evolution Protocol
 * @baseline ADR-0043: Plan record, plan store, and artifacts ownership
 * @decision Plans carry only opaque endpoint/credential references and a predeclared content address.
 * @consequence Admission rejects arbitrary URLs, methods, bodies, secret headers, unbounded responses, and scope drift.
 * @version 1.0.0
 */
import { z } from 'zod';

import { CommonStepTypeConfigSchema } from '../../step-registry/CommonStepTypeConfig.js';
import { isSha256HexString, SHA256_HEX_STRING_MESSAGE } from '../../utils/contractPrimitives.js';

import type { PlanOwnership } from './ExecutionPlan.v1.js';
import { LoadObjectFileToPostgresStepTypeConfigSchema } from './ObjectFileToPostgresStepTypeConfig.v1.js';

export const ACQUIRE_HTTP_JSON_ARTIFACT_MAX_BYTES = 50_000_000 as const;
export const ACQUIRE_HTTP_JSON_ARTIFACT_REQUIRED_CAPABILITY =
  'executor.http-json-acquisition' as const;

const ScopeIdentifierSchema = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u);
const EndpointReferenceSchema = z
  .string()
  .regex(/^http-endpoint:[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u);
const AuthCredentialReferenceSchema = z
  .string()
  .regex(/^http-auth:[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u);
const ObjectStoreCredentialReferenceSchema = z
  .string()
  .regex(/^object-store:[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u);
const Sha256Schema = z.string().refine(isSha256HexString, SHA256_HEX_STRING_MESSAGE);
const SizeSchema = z.number().int().positive().max(ACQUIRE_HTTP_JSON_ARTIFACT_MAX_BYTES);

const ScopeSchema = z
  .object({
    tenantId: ScopeIdentifierSchema,
    projectId: ScopeIdentifierSchema,
    environmentId: ScopeIdentifierSchema,
  })
  .strict();

const JsonRequestSchema = z
  .object({
    method: z.literal('GET'),
    endpointRef: EndpointReferenceSchema,
    headers: z
      .object({
        accept: z.enum(['application/json', 'application/x-ndjson']),
      })
      .strict()
      .optional(),
    authCredentialRef: AuthCredentialReferenceSchema.optional(),
  })
  .strict();

const JsonResponseCommonSchema = z.object({
  acceptedStatus: z.literal(200),
  encoding: z.literal('utf-8'),
  expectedSha256: Sha256Schema,
  expectedSizeBytes: SizeSchema,
  maxBytes: SizeSchema,
});

const JsonResponseSchema = z.discriminatedUnion('format', [
  JsonResponseCommonSchema.extend({
    format: z.literal('json'),
    mediaType: z.literal('application/json'),
  }).strict(),
  JsonResponseCommonSchema.extend({
    format: z.literal('jsonl'),
    mediaType: z.literal('application/x-ndjson'),
  }).strict(),
]);

const ArtifactOutputSchema = z
  .object({
    storageUri: z.string().min(1),
    credentialRef: ObjectStoreCredentialReferenceSchema,
  })
  .strict();

const AcquisitionLimitsSchema = z
  .object({
    connectTimeoutMs: z.number().int().min(100).max(30_000),
    requestTimeoutMs: z.number().int().min(100).max(60_000),
    maxRedirects: z.number().int().min(0).max(5),
  })
  .strict();

export const HttpJsonArtifactStepTypeConfigSchema = CommonStepTypeConfigSchema.pick({
  stepTimeoutMs: true,
  concurrency: true,
})
  .extend({
    scope: ScopeSchema,
    request: JsonRequestSchema,
    response: JsonResponseSchema,
    artifact: ArtifactOutputSchema,
    limits: AcquisitionLimitsSchema,
  })
  .strict()
  .superRefine((config, context) => {
    if (config.response.expectedSizeBytes > config.response.maxBytes) {
      context.addIssue({
        code: 'custom',
        path: ['response', 'expectedSizeBytes'],
        message: 'response.expectedSizeBytes must not exceed response.maxBytes',
      });
    }
    if (config.limits.connectTimeoutMs > config.limits.requestTimeoutMs) {
      context.addIssue({
        code: 'custom',
        path: ['limits', 'connectTimeoutMs'],
        message: 'limits.connectTimeoutMs must not exceed limits.requestTimeoutMs',
      });
    }
    if (
      config.request.headers?.accept !== undefined &&
      config.request.headers.accept !== config.response.mediaType
    ) {
      context.addIssue({
        code: 'custom',
        path: ['request', 'headers', 'accept'],
        message: 'request.headers.accept must match response.mediaType',
      });
    }

    const locatorError = validateContentAddressedArtifactUri(
      config.artifact.storageUri,
      config.scope.tenantId,
      config.response.expectedSha256
    );
    if (locatorError !== undefined) {
      context.addIssue({
        code: 'custom',
        path: ['artifact', 'storageUri'],
        message: locatorError,
      });
    }
  });

export type HttpJsonArtifactStepTypeConfig = z.infer<typeof HttpJsonArtifactStepTypeConfigSchema>;

export function validateHttpJsonArtifactPlanOwnership(
  config: unknown,
  planOwnership: PlanOwnership | undefined
): string | undefined {
  const parsed = HttpJsonArtifactStepTypeConfigSchema.safeParse(config);
  if (!parsed.success) {
    return 'ACQUIRE_HTTP_JSON_ARTIFACT config must satisfy its canonical schema';
  }
  if (planOwnership === undefined) {
    return 'ACQUIRE_HTTP_JSON_ARTIFACT requires plan ownership';
  }

  for (const key of ['tenantId', 'projectId', 'environmentId'] as const) {
    if (parsed.data.scope[key] !== planOwnership[key]) {
      return `ACQUIRE_HTTP_JSON_ARTIFACT scope.${key} must match plan ownership`;
    }
  }
  return undefined;
}

export function validateHttpJsonObjectFileHandoff(
  acquisitionConfig: unknown,
  loadConfig: unknown
): string | undefined {
  const acquisition = HttpJsonArtifactStepTypeConfigSchema.safeParse(acquisitionConfig);
  const load = LoadObjectFileToPostgresStepTypeConfigSchema.safeParse(loadConfig);
  if (!acquisition.success) return 'HTTP JSON acquisition config is invalid';
  if (!load.success) return 'Object-file load config is invalid';
  if (acquisition.data.response.format !== 'jsonl') {
    return 'HET1 handoff requires JSON Lines acquisition';
  }

  const expected = acquisition.data.response;
  const artifact = acquisition.data.artifact;
  const actual = load.data.source;
  if (artifact.storageUri !== actual.storageUri) return 'Artifact storageUri handoff mismatch';
  if (artifact.credentialRef !== actual.credentialRef) {
    return 'Artifact credentialRef handoff mismatch';
  }
  if (expected.expectedSha256 !== actual.sha256) return 'Artifact sha256 handoff mismatch';
  if (expected.expectedSizeBytes !== actual.sizeBytes) return 'Artifact sizeBytes handoff mismatch';
  if (expected.maxBytes !== actual.maxBytes) return 'Artifact maxBytes handoff mismatch';
  if (expected.mediaType !== actual.mediaType) return 'Artifact mediaType handoff mismatch';
  return undefined;
}

export function validateHttpJsonArtifactHandoffs(
  steps: readonly {
    stepId: string;
    kind: string;
    dependsOn: readonly string[];
    stepTypeConfig?: Record<string, unknown>;
  }[]
): string | undefined {
  const stepsById = new Map(steps.map((step) => [step.stepId, step]));

  for (const loadStep of steps) {
    if (loadStep.kind !== 'LOAD_OBJECT_FILE_TO_POSTGRES') continue;
    const acquisitionDependencies = loadStep.dependsOn
      .map((stepId) => stepsById.get(stepId))
      .filter((step) => step?.kind === 'ACQUIRE_HTTP_JSON_ARTIFACT');
    if (acquisitionDependencies.length === 0) continue;
    if (acquisitionDependencies.length !== 1) {
      return `HTTP JSON artifact handoff for ${loadStep.stepId} requires exactly one acquisition dependency`;
    }

    const error = validateHttpJsonObjectFileHandoff(
      acquisitionDependencies[0]?.stepTypeConfig,
      loadStep.stepTypeConfig
    );
    if (error !== undefined) {
      return `HTTP JSON artifact handoff for ${loadStep.stepId} is invalid: ${error}`;
    }
  }

  return undefined;
}

function validateContentAddressedArtifactUri(
  storageUri: string,
  tenantId: string,
  sha256: string
): string | undefined {
  const expectedPath = `tenants/${tenantId}/${sha256}`;
  const match = /^s3:\/\/([a-z0-9][a-z0-9.-]{1,61}[a-z0-9])\/(.+)$/u.exec(storageUri);
  return match?.[2] === expectedPath
    ? undefined
    : `artifact.storageUri must match s3://<bucket>/${expectedPath}`;
}
