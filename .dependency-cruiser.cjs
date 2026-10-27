const canvasPresentationDependencies = [
  '^apps/web/src/app/views/canvas/(?:canvasReadinessPresentation|canvasCopyCatalog|canvasCopyFormatting|canvasCopy\\.types|copy)\\.ts$',
  '^apps/web/src/app/stores/applicationLanguageStore\\.ts$',
  '^apps/web/src/app/services/api/dvtOperationalRejectionCopy\\.ts$',
];

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
          '^(?:node:)?(?:fs|https?)(?:/|$)',
          '(^|/)infrastructure/',
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
    {
      name: 'no-canvas-readiness-to-effects',
      severity: 'error',
      from: {
        path: '^apps/web/src/app/views/canvas/(?:canvasRuntimePolicy|canvasDraftAccessPostureModel|canvasPlanReadiness|canvasExecutionState|canvasExecutionGraph|canvasDbtExecutionProjection|canvasDvtPreviewProjection|canvasReadinessPresentation)\\.ts$',
      },
      to: {
        path: [
          '^apps/web/src/app/views/canvas/(?:canvasPlanAction|canvasRunStartAction|useCanvas(?:PlanActionHandler|RunStartHandler|ExecutionActions|Controller|ControllerRuntime|DraftAutosave)|useDbtProjectFileExecution|canvasDraftAutosave(?:Execution|Scheduling)|canvasDraftSaveExecution|canvasDraftPersistenceRuntime)\\.ts$',
          '^apps/web/src/app/services/(?!api/dvtOperationalRejectionCopy\\.ts$)',
        ],
      },
    },
    {
      name: 'no-canvas-readiness-evaluation-to-presentation',
      severity: 'error',
      from: {
        path: '^apps/web/src/app/views/canvas/(?:canvasPlanReadiness|canvasExecutionState|canvasExecutionGraph|canvasDbtExecutionProjection|canvasDvtPreviewProjection)\\.ts$',
      },
      to: {
        path: canvasPresentationDependencies,
      },
    },
    {
      name: 'no-canvas-run-command-to-presentation',
      severity: 'error',
      from: { path: '^apps/web/src/app/views/canvas/canvasRunStartAction\\.ts$' },
      to: { path: canvasPresentationDependencies },
    },
    {
      name: 'no-canvas-autosave-to-execution',
      severity: 'error',
      from: {
        path: '^apps/web/src/app/views/canvas/(?:useCanvasDraftAutosave|canvasDraftAutosave(?:Scheduling|Execution)|canvasDraftSaveExecution|canvasDraftPersistenceRuntime)\\.ts$',
      },
      to: {
        path: '^apps/web/src/app/views/canvas/(?:canvasPlanAction|canvasRunStartAction|useCanvas(?:PlanActionHandler|RunStartHandler|ExecutionActions|Controller|ControllerRuntime)|useDbtProjectFileExecution)\\.ts$',
      },
    },
    {
      name: 'no-canvas-execution-to-route-composition',
      severity: 'error',
      from: {
        path: '^apps/web/src/app/views/canvas/(?:canvasPlanAction|canvasRunStartAction|useCanvas(?:PlanActionHandler|RunStartHandler|ExecutionActions))\\.ts$',
      },
      to: {
        path: '^apps/web/src/app/views/canvas/(?:useCanvasController(?:Runtime)?|useDbtProjectFileExecution)\\.ts$',
      },
    },
    {
      name: 'no-dvt-publication-policy-to-adapters',
      severity: 'error',
      from: { path: '^apps/api/src/application/services/dvtWorkloadPublication\\.ts$' },
      to: {
        path: [
          '^apps/web/',
          '^apps/api/src/(?:entrypoints|infrastructure|modules|runtime)/',
          '^packages/@dvt/adapter-',
        ],
      },
    },
    {
      name: 'no-contracts-to-applications',
      severity: 'error',
      from: { path: '^packages/@dvt/contracts/(?:src/|index\\.ts$)' },
      to: { path: '^apps/' },
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
