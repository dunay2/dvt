/**
 * @file apps/api/test/integration/protectedRuntime.integration.auth.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @baseline ADR-0004: Event Sourcing Strategy
 * @decision Isolate JWKS bootstrap and bearer-token issuance from test runtime orchestration
 * @date 2026-04-18
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';

import { exportJWK, generateKeyPair, SignJWT, type JWK } from 'jose';

import {
  PROTECTED_RUNTIME_AUDIENCE,
  PROTECTED_RUNTIME_ISSUER,
} from './protectedRuntime.integration.shared.js';

export type SigningKey = Awaited<ReturnType<typeof generateKeyPair>>['privateKey'];
export type JwksServerHandle = {
  readonly server: Server;
  readonly jwksUri: string;
  readonly privateKey: SigningKey;
};

export async function startJwksServer(): Promise<JwksServerHandle> {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const jwk = await exportPublicJwk(publicKey);
  const payload = JSON.stringify({ keys: [jwk] });

  const server = createServer((_request: IncomingMessage, response: ServerResponse) => {
    response.statusCode = 200;
    response.setHeader('content-type', 'application/json');
    response.end(payload);
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('Unable to resolve JWKS server address');
  }

  return {
    server,
    jwksUri: `http://127.0.0.1:${address.port}/.well-known/jwks.json`,
    privateKey,
  };
}

export async function signBearerToken(
  privateKey: SigningKey,
  claims: {
    sub: string;
    tenant_ids: ReadonlyArray<string>;
    project_ids: ReadonlyArray<string>;
  }
): Promise<string> {
  const nowSeconds = Math.floor(Date.now() / 1000);

  return new SignJWT({
    scope: 'dvt:runtime',
    tenant_ids: [...claims.tenant_ids],
    project_ids: [...claims.project_ids],
  })
    .setProtectedHeader({ alg: 'RS256', kid: 'api-integration-key' })
    .setSubject(claims.sub)
    .setIssuer(PROTECTED_RUNTIME_ISSUER)
    .setAudience(PROTECTED_RUNTIME_AUDIENCE)
    .setIssuedAt(nowSeconds)
    .setExpirationTime(nowSeconds + 60 * 5)
    .sign(privateKey);
}

export async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

async function exportPublicJwk(
  publicKey: Awaited<ReturnType<typeof generateKeyPair>>['publicKey']
): Promise<JWK> {
  const jwk = await exportJWK(publicKey);
  return {
    ...jwk,
    use: 'sig',
    alg: 'RS256',
    kid: 'api-integration-key',
  };
}
