/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-contracts-to-dvt-runtime',
      severity: 'error',
      from: { path: '^packages/@dvt/contracts/(?:src/|index\\.ts$)' },
      to: { path: '^packages/@dvt/(?!contracts(?:/|$)|crypto(?:/|$))' },
    },
    {
      name: 'no-planner-to-engine-or-adapters',
      severity: 'error',
      from: { path: '^packages/@dvt/planner/src/' },
      to: { path: '^packages/@dvt/(?:engine|adapter-[^/]+)(?:/|$)' },
    },
    {
      name: 'no-engine-to-concrete-adapters',
      severity: 'error',
      from: { path: '^packages/@dvt/engine/src/' },
      to: { path: '^packages/@dvt/adapter-[^/]+(?:/|$)' },
    },
    {
      name: 'no-adapters-to-contract-internals',
      severity: 'error',
      from: { path: '^packages/@dvt/adapter-[^/]+/src/' },
      to: {
        path: '^packages/@dvt/contracts/src/(?!index\\.ts$)',
      },
    },
    {
      name: 'no-web-to-backend-adapters',
      severity: 'error',
      from: { path: '^apps/web/src/' },
      to: { path: '^packages/@dvt/adapter-[^/]+(?:/|$)' },
    },
    {
      name: 'no-presentation-to-infrastructure',
      severity: 'error',
      from: { path: '(^|/)presentation/' },
      to: { path: '(^|/)infrastructure/' },
    },
    {
      name: 'no-domain-to-framework-or-infrastructure',
      severity: 'error',
      from: { path: '(^|/)domain/' },
      to: {
        path: [
          '^node:fs$',
          '^fs$',
          '^node:http$',
          '^http$',
          '^node:https$',
          '^https$',
          '^node_modules/.pnpm/(?:react|react-dom|fastify|@fastify|pg|@temporalio)',
        ],
      },
    },
    {
      name: 'no-dvt-package-cycles',
      severity: 'error',
      from: { path: '^packages/@dvt/[^/]+/src/' },
      to: {
        circular: true,
        dependencyTypesNot: ['type-only'],
        viaOnly: {
          path: '^packages/@dvt/[^/]+/src/',
          dependencyTypesNot: ['type-only'],
        },
      },
    },
    {
      name: 'no-cross-package-deep-imports',
      severity: 'error',
      from: { path: '^apps/' },
      to: {
        path: '^packages/@dvt/[^/]+/src/(?!index\\.ts$|runtime\\.ts$|testing\\.ts$|contracts/planner/)',
      },
    },
    ...(require('node:fs').existsSync('packages/@dvt')
      ? require('node:fs')
          .readdirSync('packages/@dvt', { withFileTypes: true })
          .filter((entry) => entry.isDirectory())
          .map((entry) => ({
            name: 'no-cross-package-deep-imports',
            severity: 'error',
            from: { path: `^packages/@dvt/${entry.name}/src/` },
            to: {
              path: `^packages/@dvt/(?!${entry.name}(?:/|$))[^/]+/src/(?!index\\.ts$|runtime\\.ts$|testing\\.ts$|contracts/planner/)`,
            },
          }))
      : []),
    {
      name: 'no-runtime-packages-to-scripts-or-tools',
      severity: 'error',
      from: { path: '^packages/@dvt/[^/]+/src/' },
      to: { path: '^(scripts|tools)/' },
    },
    {
      name: 'no-api-domain-to-application',
      severity: 'error',
      from: { path: '^apps/api/src/domain/' },
      to: { path: '^apps/api/src/(?:application|entrypoints|infrastructure)/' },
    },
    {
      name: 'no-api-application-to-fastify-or-jwt',
      severity: 'error',
      from: { path: '^apps/api/src/application/' },
      to: { path: '^(?:fastify|@fastify|jose)(?:/|$)' },
    },
    {
      name: 'no-api-application-to-oidc-libs',
      severity: 'error',
      from: { path: '^apps/api/src/application/' },
      to: { path: '^(?:openid-client|oidc-provider)(?:/|$)' },
    },
    {
      name: 'no-api-ports-to-http-types',
      severity: 'error',
      from: { path: '^apps/api/src/application/ports/' },
      to: { path: '^(?:fastify|@fastify|http|node:http)(?:/|$)' },
    },
    {
      name: 'no-api-non-root-state-store-role-binding',
      severity: 'error',
      from: { path: '^apps/api/src/(?!modules/|runtime/)' },
      to: {
        path: '^apps/api/src/modules/stateStoreRoles\\.ts$',
        dependencyTypesNot: ['type-only', 'type-import'],
      },
    },
    {
      name: 'no-api-production-to-test-support',
      severity: 'error',
      from: { path: '^apps/api/src/' },
      to: { path: '^apps/api/test/' },
    },
  ],

  options: {
    doNotFollow: {
      path: 'node_modules|(^|/)(dist|coverage|\\.turbo|\\.generated-docs)(/|$)',
    },
    exclude: {
      path: '(^|/)(dist|coverage|node_modules)(/|$)',
    },
    tsConfig: {
      fileName: 'tsconfig.json',
    },
    tsPreCompilationDeps: true,
    reporterOptions: {
      text: {
        highlightFocused: true,
      },
    },
  },
};
