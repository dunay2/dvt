/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    /**
     * Rule 1 (§16.2-1): domain must not import from application, entrypoints, or infrastructure.
     * Domain objects and policy are pure — no orchestration or HTTP framework dependencies.
     */
    {
      name: 'no-domain-to-application',
      severity: 'error',
      from: { path: '^src/domain/' },
      to: { path: '^src/(application|entrypoints|infrastructure)/' },
    },

    /**
     * Rule 2 (§16.2-2): application services must not import Fastify or JWT libraries directly.
     * JWT concerns belong in infrastructure; Fastify concerns belong in entrypoints.
     */
    {
      name: 'no-application-to-fastify-or-jwt',
      severity: 'error',
      from: { path: '^src/application/' },
      to: { path: '^(fastify|@fastify|jose)' },
    },

    /**
     * Rule 3 (§16.2-3): engine/core packages must not import IAM or JWT dependencies.
     * Verifying here that the local engine integration (EngineStartRunUseCase) does not
     * directly import jose or OIDC libraries.
     */
    {
      name: 'no-application-to-oidc-libs',
      severity: 'error',
      from: { path: '^src/application/' },
      to: { path: '^(openid-client|oidc-provider)' },
    },

    /**
     * Rule 4 (§16.2-5): application/ports must not export HTTP response models or mapping functions.
     * HTTP mapping belongs only in entrypoints/http/authErrorMapper.ts.
     * Enforced by ensuring application/ports does not import from fastify or HTTP framework types.
     */
    {
      name: 'no-ports-to-http-types',
      severity: 'error',
      from: { path: '^src/application/ports/' },
      to: { path: '^(fastify|@fastify|http|node:http)' },
    },

    /**
     * Rule 5 (§16.2-4): routes must not implement authorization policy logic.
     * Routes are adapters; policy lives in domain/auth/policy.ts.
     * Enforced by preventing routes from importing directly from domain/auth/policy.ts.
     */
    {
      name: 'no-routes-direct-policy',
      severity: 'error',
      from: { path: '^src/(routes|entrypoints)/' },
      to: { path: '^src/domain/auth/policy' },
    },
  ],

  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    tsConfig: {
      fileName: 'tsconfig.json',
    },
    reporterOptions: {
      text: {
        highlightFocused: true,
      },
    },
  },
};
