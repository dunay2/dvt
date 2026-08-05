import { readFileSync } from 'node:fs';

import type { TemporalStepPluginProfile } from '@dvt/adapter-temporal';
import {
  createHttpJsonArtifactPluginProfile,
  HttpJsonArtifactPluginRunner,
  type HttpJsonAcquisitionClient,
} from '@dvt/temporal-http-json-plugin';
import { Context } from '@temporalio/activity';

import type { Env } from '../plugins/env.js';

import { NodeHttpsJsonClient } from './nodeHttpsJsonClient.js';
import type { CreateTemporalWorkerRuntimeOptions } from './runtimeTypes.js';
import { createTemporalWorkerHttpJsonArtifactStore } from './temporalWorkerHttpJsonArtifactStore.js';

export interface TemporalWorkerHttpJsonProfile {
  readonly pluginProfile?: TemporalStepPluginProfile;
}

export function createTemporalWorkerHttpJsonProfile(
  env: Env,
  options: CreateTemporalWorkerRuntimeOptions
): TemporalWorkerHttpJsonProfile {
  if (!env.DVT_TEMPORAL_HTTP_JSON_ENABLED) return {};

  const client = options.httpJsonClientFactory?.(env) ?? createHttpJsonClient(env);
  const artifactStore =
    options.contentAddressedArtifactStoreFactory?.(env) ??
    createTemporalWorkerHttpJsonArtifactStore(env);
  const runner = new HttpJsonArtifactPluginRunner({
    client,
    artifactStore,
    expectedArtifactCredentialRef: requireBinding(
      env.DVT_HTTP_JSON_ARTIFACT_CREDENTIAL_REF,
      'DVT_HTTP_JSON_ARTIFACT_CREDENTIAL_REF'
    ),
    getCancellationSignal: () => Context.current().cancellationSignal,
  });
  return { pluginProfile: createHttpJsonArtifactPluginProfile(runner) };
}

function createHttpJsonClient(env: Env): HttpJsonAcquisitionClient {
  return new NodeHttpsJsonClient({
    endpoints: parseBindings(env.DVT_HTTP_JSON_ENDPOINTS),
    authTokens: parseBindings(env.DVT_HTTP_JSON_AUTH_TOKENS),
    nodeEnv: env.NODE_ENV,
    allowLoopbackFixture: env.DVT_HTTP_JSON_ALLOW_LOOPBACK_FIXTURE,
    ...(env.DVT_HTTP_JSON_CA_FILE === undefined
      ? {}
      : { ca: readFileSync(env.DVT_HTTP_JSON_CA_FILE) }),
  });
}

function parseBindings(value: string | undefined): ReadonlyMap<string, string> {
  if (value === undefined) return new Map();
  const parsed = JSON.parse(value) as Record<string, string>;
  return new Map(Object.entries(parsed));
}

function requireBinding(value: string | undefined, field: string): string {
  if (value === undefined || value.trim().length === 0) {
    throw new Error(`${field} is required for the HTTP JSON worker profile.`);
  }
  return value;
}
