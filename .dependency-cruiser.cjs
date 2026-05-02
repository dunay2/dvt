/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-contracts-to-dvt-runtime',
      severity: 'error',
      from: { path: '^packages/@dvt/contracts/(?:src/|index\\.ts$)' },
      to: { path: '^packages/@dvt/(?!contracts(?:/|$))' },
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
        viaOnly: { path: '^packages/@dvt/[^/]+/src/' },
      },
    },
    {
      name: 'no-cross-package-deep-imports',
      severity: 'error',
      from: { path: '^apps/' },
      to: {
        path: '^packages/@dvt/[^/]+/src/(?!index\\.ts$|testing\\.ts$|contracts/planner/)',
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
              path: `^packages/@dvt/(?!${entry.name}(?:/|$))[^/]+/src/(?!index\\.ts$|testing\\.ts$|contracts/planner/)`,
            },
          }))
      : []),
    {
      name: 'no-runtime-packages-to-scripts-or-tools',
      severity: 'error',
      from: { path: '^packages/@dvt/[^/]+/src/' },
      to: { path: '^(scripts|tools)/' },
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
    reporterOptions: {
      text: {
        highlightFocused: true,
      },
    },
  },
};
