/**
 * @ownedConcern Own the web Vitest suite catalog, including primary suite
 * ownership and focus-suite overlap. Runtime and selection have separate owners.
 */
export const WEB_VITEST_PRIMARY_SUITE_NAMES = ['unit', 'presentation', 'architecture'] as const;

export const WEB_VITEST_FOCUS_SUITE_NAMES = [
  'canvas',
  'canvas-unit',
  'canvas-presentation',
  'canvas-architecture',
  'monaco',
  'shell-session',
  'workspace-services',
] as const;

export type WebVitestPrimarySuiteName = (typeof WEB_VITEST_PRIMARY_SUITE_NAMES)[number];

export type WebVitestFocusSuiteName = (typeof WEB_VITEST_FOCUS_SUITE_NAMES)[number];

export type WebVitestSuiteName = 'all' | WebVitestPrimarySuiteName | WebVitestFocusSuiteName;

export type WebVitestChangedSuiteName =
  WebVitestPrimarySuiteName | Exclude<WebVitestFocusSuiteName, 'canvas'>;

type WebVitestSuiteDefinition = Readonly<{
  include: readonly string[];
  exclude: readonly string[];
}>;

const WEB_VITEST_DEFAULT_EXCLUDE = ['node_modules/**', 'dist/**'] as const;

/** Literal test-support ownership; executable evidence validates the complete closure. */
export const WEB_VITEST_TEST_SOURCE_OWNERS = [
  {
    entries: ['src/testing/vitestSuites.browserRouting.architecture.test.ts'],
    helpers: [
      'src/testing/vitestSuites.browserRouting.cli.test-cases.ts',
      'src/testing/vitestSuites.browserRouting.comparison.test-cases.ts',
      'src/testing/vitestSuites.browserRouting.fixtureClosure.test-cases.ts',
      'src/testing/vitestSuites.browserRouting.gestures.test-cases.ts',
      'src/testing/vitestSuites.browserRouting.helperClosure.test-cases.ts',
      'src/testing/vitestSuites.browserRouting.moduleGraph.ts',
      'src/testing/vitestSuites.browserRouting.ownership.test-cases.ts',
      'src/testing/vitestSuites.browserRouting.partitions.test-cases.ts',
      'src/testing/vitestSuites.browserRouting.retirement.test-cases.ts',
      'src/testing/vitestSuites.browserRouting.runtime.test-cases.ts',
      'src/testing/vitestSuites.browserRouting.runtime.test-support.ts',
      'src/testing/vitestSuites.browserRouting.surfaces.test-cases.ts',
    ],
  },
  {
    entries: [
      'src/testing/vitestSuites.browserRouting.architecture.test.ts',
      'src/testing/vitestSuites.browserNativePlatform.architecture.test.ts',
    ],
    helpers: ['src/testing/vitestSuites.browserRouting.fixtures.ts'],
  },
  {
    entries: ['src/testing/vitestSuites.testSourceOwnership.architecture.test.ts'],
    helpers: [
      'src/testing/vitestSuites.testSourceOwnership.test-support.ts',
      'src/testing/vitestSuites.testSourceOwnership.moduleReferences.test-support.ts',
    ],
  },
] as const;

/** Conservative observation, not direct runtime ownership; proven against current source facts. */
export const WEB_VITEST_TEST_SOURCE_OBSERVERS = [
  'src/app/bootstrap/appBootstrapScreen.test.ts',
  'src/app/plugins/createDeferredView.test.tsx',
  'src/app/components/canvas/CanvasNodeShell.test.tsx',
  'src/app/services/workspace/workspacePorts.api.test.ts',
  'src/app/views/canvas/canvasDraftScenarioFixtures.test.ts',
  'src/app/views/canvas/canvasGraphSearchPresentation.test.ts',
  'src/app/views/canvas/canvasNodeDropAggregate.test.ts',
  'src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx',
] as const;

export const WEB_VITEST_SUITES: Record<WebVitestSuiteName, WebVitestSuiteDefinition> = {
  all: {
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: WEB_VITEST_DEFAULT_EXCLUDE,
  },
  unit: {
    include: ['src/**/*.{test,spec}.ts'],
    exclude: [...WEB_VITEST_DEFAULT_EXCLUDE, 'src/**/*.architecture.test.ts'],
  },
  presentation: {
    include: ['src/**/*.{test,spec}.tsx'],
    exclude: [...WEB_VITEST_DEFAULT_EXCLUDE, 'src/**/*.architecture.test.tsx'],
  },
  architecture: {
    include: ['src/**/*.architecture.test.{ts,tsx}'],
    exclude: WEB_VITEST_DEFAULT_EXCLUDE,
  },
  canvas: {
    include: [
      'src/app/views/Canvas*.{test,spec}.tsx',
      'src/app/views/canvas/**/*.{test,spec}.{ts,tsx}',
      'src/app/components/canvas/**/*.{test,spec}.{ts,tsx}',
      'src/app/components/inspector/**/*.{test,spec}.{ts,tsx}',
    ],
    exclude: WEB_VITEST_DEFAULT_EXCLUDE,
  },
  'canvas-unit': {
    include: [
      'src/app/views/canvas/**/*.{test,spec}.ts',
      'src/app/components/canvas/**/*.{test,spec}.ts',
      'src/app/components/inspector/**/*.{test,spec}.ts',
    ],
    exclude: [
      ...WEB_VITEST_DEFAULT_EXCLUDE,
      'src/app/views/canvas/**/*.architecture.test.ts',
      'src/app/components/canvas/**/*.architecture.test.ts',
      'src/app/components/inspector/**/*.architecture.test.ts',
    ],
  },
  'canvas-presentation': {
    include: [
      'src/app/views/Canvas*.{test,spec}.tsx',
      'src/app/views/canvas/**/*.{test,spec}.tsx',
      'src/app/components/canvas/**/*.{test,spec}.tsx',
      'src/app/components/inspector/**/*.{test,spec}.tsx',
    ],
    exclude: [
      ...WEB_VITEST_DEFAULT_EXCLUDE,
      'src/app/views/Canvas*.architecture.test.tsx',
      'src/app/views/canvas/**/*.architecture.test.tsx',
      'src/app/components/canvas/**/*.architecture.test.tsx',
      'src/app/components/inspector/**/*.architecture.test.tsx',
    ],
  },
  'canvas-architecture': {
    include: [
      'src/app/views/Canvas*.architecture.test.tsx',
      'src/app/views/canvas/**/*.architecture.test.{ts,tsx}',
      'src/app/components/canvas/**/*.architecture.test.{ts,tsx}',
      'src/app/components/inspector/**/*.architecture.test.{ts,tsx}',
    ],
    exclude: WEB_VITEST_DEFAULT_EXCLUDE,
  },
  monaco: {
    include: [
      'src/app/views/CodeView.test.tsx',
      'src/app/views/code/**/*.{test,spec}.{ts,tsx}',
      'src/app/views/artifacts/ArtifactMonacoPreviewPanel.test.tsx',
      'src/app/views/artifacts/artifactsMonacoReadonlyViewer.architecture.test.ts',
      'src/app/views/diff/diffMonacoReviewSurface.architecture.test.ts',
      'src/app/components/monaco/monacoBundleIsolation.architecture.test.ts',
      'src/app/components/monaco/**/*.{test,spec}.{ts,tsx}',
    ],
    exclude: WEB_VITEST_DEFAULT_EXCLUDE,
  },
  'shell-session': {
    include: [
      'src/app/components/TopAppBar.{test,spec}.{ts,tsx}',
      'src/app/components/TopAppBar.architecture.test.ts',
      'src/app/components/shell/**/*.{test,spec}.{ts,tsx}',
      'src/app/services/AppServicesContext.{test,spec}.{ts,tsx}',
      'src/app/services/api/createApiClient.{test,spec}.{ts,tsx}',
      'src/app/services/composition/appServices*.{test,spec}.{ts,tsx}',
      'src/app/services/session/**/*.{test,spec}.{ts,tsx}',
      'src/app/stores/sessionStore.{test,spec}.{ts,tsx}',
      'src/testing/appServicesTestDoubles.{test,spec}.{ts,tsx}',
      'src/testing/runsPortDoubles.{test,spec}.{ts,tsx}',
    ],
    exclude: WEB_VITEST_DEFAULT_EXCLUDE,
  },
  'workspace-services': {
    include: ['src/app/services/workspace/**/*.{test,spec}.{ts,tsx}'],
    exclude: WEB_VITEST_DEFAULT_EXCLUDE,
  },
};
