import type {
  AuthenticationFailureCode,
  AuthenticationResult,
  IAuthenticator,
} from '../../application/ports/auth.js';

export type JwtVerificationFailureCode = Exclude<AuthenticationFailureCode, 'MISSING_TOKEN'>;

export interface VerifiedJwtClaims {
  readonly sub: string;
  readonly iss: string;
  readonly aud: string;
  readonly exp: number;
  readonly iat?: number;
  readonly jti?: string;
  readonly scope?: string;
  readonly tenant_ids?: ReadonlyArray<string>;
  readonly project_ids?: ReadonlyArray<string>;
  readonly principal_type?: 'user' | 'service';
}

export type JwtVerificationResult =
  | { readonly ok: true; readonly claims: VerifiedJwtClaims }
  | { readonly ok: false; readonly code: JwtVerificationFailureCode };

export interface IJwtVerifierGateway {
  verify(token: string): Promise<JwtVerificationResult>;
}

export class OidcAuthenticator implements IAuthenticator {
  public constructor(private readonly jwtVerifier: IJwtVerifierGateway) {}

  public async authenticateBearerToken(token: string | undefined): Promise<AuthenticationResult> {
    if (!token) {
      return { ok: false, code: 'MISSING_TOKEN' };
    }

    const verification = await this.jwtVerifier.verify(token);
    if (!verification.ok) {
      return { ok: false, code: verification.code };
    }

    const claims = verification.claims;
    const tokenFields = {
      ...(claims.jti ? { tokenId: claims.jti } : {}),
      ...(claims.iat ? { issuedAt: new Date(claims.iat * 1000) } : {}),
    };

    return {
      ok: true,
      principal: {
        principalId: claims.sub,
        subjectId: claims.sub,
        issuer: claims.iss,
        audience: claims.aud,
        principalType: claims.principal_type ?? 'user',
        expiresAt: new Date(claims.exp * 1000),
        rawScopes: claims.scope ? claims.scope.split(' ') : [],
        assertedTenantIds: claims.tenant_ids ?? [],
        assertedProjectIds: claims.project_ids ?? [],
        ...tokenFields,
      },
    };
  }
}
