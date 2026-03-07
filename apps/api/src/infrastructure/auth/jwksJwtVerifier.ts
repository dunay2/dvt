import { createRemoteJWKSet, jwtVerify, errors as joseErrors } from 'jose';

import type {
  IJwtVerifierGateway,
  JwtVerificationResult,
  VerifiedJwtClaims,
} from './oidcAuthenticator.js';

export interface JwksJwtVerifierConfig {
  readonly jwksUri: string;
  readonly issuer: string;
  readonly audience: string;
  readonly algorithms?: ReadonlyArray<string>;
}

export class JwksJwtVerifier implements IJwtVerifierGateway {
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;
  private readonly config: JwksJwtVerifierConfig;

  public constructor(config: JwksJwtVerifierConfig) {
    this.config = config;
    this.jwks = createRemoteJWKSet(new URL(config.jwksUri));
  }

  public async verify(token: string): Promise<JwtVerificationResult> {
    try {
      const verifyOptions = {
        issuer: this.config.issuer,
        audience: this.config.audience,
        ...(this.config.algorithms ? { algorithms: [...this.config.algorithms] } : {}),
      };
      const { payload } = await jwtVerify(token, this.jwks, verifyOptions);
      return mapPayloadToClaims(payload);
    } catch (err) {
      return mapJoseError(err);
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type JosePayload = Awaited<ReturnType<typeof jwtVerify>>['payload'];

function mapPayloadToClaims(payload: JosePayload): JwtVerificationResult {
  if (
    typeof payload.sub !== 'string' ||
    typeof payload.iss !== 'string' ||
    typeof payload.exp !== 'number'
  ) {
    return { ok: false, code: 'INVALID_TOKEN' };
  }

  const aud = Array.isArray(payload.aud) ? payload.aud[0] : payload.aud;
  if (typeof aud !== 'string') {
    return { ok: false, code: 'INVALID_AUDIENCE' };
  }

  const claims: VerifiedJwtClaims = {
    sub: payload.sub,
    iss: payload.iss,
    aud,
    exp: payload.exp,
    ...(typeof payload.iat === 'number' ? { iat: payload.iat } : {}),
    ...(typeof payload.jti === 'string' ? { jti: payload.jti } : {}),
    ...(typeof payload['scope'] === 'string' ? { scope: payload['scope'] } : {}),
    ...(Array.isArray(payload['tenant_ids']) ? { tenant_ids: payload['tenant_ids'] as string[] } : {}),
    ...(Array.isArray(payload['project_ids']) ? { project_ids: payload['project_ids'] as string[] } : {}),
    ...(payload['principal_type'] === 'service' ? { principal_type: 'service' as const } : {}),
  };

  return { ok: true, claims };
}

function mapJoseError(err: unknown): JwtVerificationResult {
  if (err instanceof joseErrors.JWTExpired) return { ok: false, code: 'TOKEN_EXPIRED' };
  if (err instanceof joseErrors.JOSENotSupported) return { ok: false, code: 'UNSUPPORTED_ALGORITHM' };
  if (err instanceof joseErrors.JWSInvalid || err instanceof joseErrors.JWSSignatureVerificationFailed) {
    return { ok: false, code: 'INVALID_SIGNATURE' };
  }
  if (err instanceof joseErrors.JWTClaimValidationFailed) return mapClaimError(err);
  return { ok: false, code: 'INVALID_TOKEN' };
}

function mapClaimError(err: joseErrors.JWTClaimValidationFailed): JwtVerificationResult {
  if (err.claim === 'iss') return { ok: false, code: 'INVALID_ISSUER' };
  if (err.claim === 'aud') return { ok: false, code: 'INVALID_AUDIENCE' };
  if (err.claim === 'nbf') return { ok: false, code: 'TOKEN_NOT_YET_VALID' };
  return { ok: false, code: 'INVALID_TOKEN' };
}
