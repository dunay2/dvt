import { readFileSync } from 'node:fs';
import { URL } from 'node:url';

import { describe, expect, it } from 'vitest';

const SCHEMA_URL = new URL(
  '../../../../docs/contracts/shared/AdminRebuildSnapshotAccess.v1.schema.json',
  import.meta.url
);

interface AdminRebuildSnapshotAccessSchema {
  readonly properties: {
    readonly route: {
      readonly properties: {
        readonly method: { readonly const: string };
        readonly path: { readonly const: string };
        readonly featureFlag: { readonly const: string };
        readonly requiresProtectedRuntime: { readonly const: boolean };
        readonly requiredOidcEnv: {
          readonly prefixItems: ReadonlyArray<{ readonly const: string }>;
        };
      };
    };
    readonly authorization: {
      readonly properties: {
        readonly requiredAction: { readonly const: string };
        readonly pipeline: { readonly prefixItems: ReadonlyArray<{ readonly const: string }> };
      };
    };
    readonly responses: {
      readonly required: ReadonlyArray<string>;
      readonly properties: {
        readonly '401': {
          readonly properties: {
            readonly error: {
              readonly properties: {
                readonly reason: { readonly enum: ReadonlyArray<string> };
              };
            };
          };
        };
        readonly '403': {
          readonly properties: {
            readonly error: {
              readonly properties: {
                readonly reason: { readonly enum: ReadonlyArray<string> };
              };
            };
          };
        };
        readonly '404': {
          readonly properties: {
            readonly error: {
              readonly properties: {
                readonly reason: { readonly const: string };
              };
            };
          };
        };
      };
    };
  };
}

function loadSchema(): AdminRebuildSnapshotAccessSchema {
  const bytes = readFileSync(SCHEMA_URL);
  return JSON.parse(bytes.toString('utf-8')) as AdminRebuildSnapshotAccessSchema;
}

describe('AdminRebuildSnapshotAccess.v1.schema.json', () => {
  it('pins route auth invariants for admin rebuild-snapshot', () => {
    const schema = loadSchema();
    const route = schema.properties.route;
    const authorization = schema.properties.authorization;

    expect(route.properties.method.const).toBe('POST');
    expect(route.properties.path.const).toBe('/admin/runs/:runId/rebuild-snapshot');
    expect(route.properties.featureFlag.const).toBe('DVT_ADMIN_ROUTES_ENABLED');
    expect(route.properties.requiresProtectedRuntime.const).toBe(true);
    expect(route.properties.requiredOidcEnv.prefixItems.map((entry) => entry.const)).toEqual([
      'OIDC_JWKS_URI',
      'OIDC_ISSUER',
      'OIDC_AUDIENCE',
    ]);

    expect(authorization.properties.requiredAction.const).toBe('admin:run:rebuild-snapshot');
    expect(authorization.properties.pipeline.prefixItems.map((entry) => entry.const)).toEqual([
      'authenticate',
      'authorize',
      'audit',
      'execute',
    ]);
  });

  it('pins deny/error envelope reasons for auth and runtime failures', () => {
    const schema = loadSchema();
    const responses = schema.properties.responses;

    expect(responses.required).toEqual(['200', '400', '401', '403', '404', '500']);

    expect(responses.properties['401'].properties.error.properties.reason.enum).toEqual([
      'missing_token',
      'invalid_token',
      'invalid_signature',
      'invalid_issuer',
      'invalid_audience',
      'token_expired',
      'token_not_yet_valid',
      'unsupported_algorithm',
    ]);

    expect(responses.properties['403'].properties.error.properties.reason.enum).toEqual([
      'principal_suspended',
      'tenant_not_granted',
      'project_not_granted',
      'environment_not_granted',
      'action_not_granted',
      'token_assertion_conflict',
    ]);

    expect(responses.properties['404'].properties.error.properties.reason.const).toBe(
      'run_not_found'
    );
  });
});
