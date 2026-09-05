/**
 * @ownedConcern Own the web Vitest suite catalog, including primary suite
 * ownership, focus-suite overlap, and CI-facing config construction.
 */
import type { UserConfig } from 'vitest/config';

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

export type WebVitestChangedCommandPlanEntry =
  | Readonly<{ kind: 'shell'; command: string }>
  | Readonly<{ kind: 'vitest-files'; config: string; filePaths: readonly string[] }>;

type WebVitestSuiteDefinition = Readonly<{
  include: readonly string[];
  exclude: readonly string[];
}>;

const WEB_VITEST_DEFAULT_EXCLUDE = ['node_modules/**', 'dist/**'] as const;
export const WEB_VITEST_CI_WORKER_COUNT = 1;
export const WEB_VITEST_CI_WORKER_MAX_OLD_SPACE_MB = 4096;
export const WEB_VITEST_CI_NODE_OPTIONS = `--max-old-space-size=${WEB_VITEST_CI_WORKER_MAX_OLD_SPACE_MB}`;

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

export const WEB_VITEST_CHANGED_SUITE_COMMANDS: Record<WebVitestChangedSuiteName, string> = {
  unit: 'pnpm run test:unit:run',
  presentation: 'pnpm run test:presentation:run',
  architecture: 'pnpm run test:architecture:run',
  'canvas-unit': 'pnpm run test:canvas-unit:run',
  'canvas-presentation': 'pnpm run test:canvas-presentation:run',
  'canvas-architecture': 'pnpm run test:canvas-architecture:run',
  monaco: 'pnpm run test:monaco:run',
  'shell-session': 'pnpm run test:shell-session:run',
  'workspace-services': 'pnpm run test:workspace-services:run',
};

const WEB_VITEST_CHANGED_SUITE_CONFIGS: Record<WebVitestChangedSuiteName, string> = {
  unit: 'vitest.unit.config.ts',
  presentation: 'vitest.presentation.config.ts',
  architecture: 'vitest.architecture.config.ts',
  'canvas-unit': 'vitest.canvas-unit.config.ts',
  'canvas-presentation': 'vitest.canvas-presentation.config.ts',
  'canvas-architecture': 'vitest.canvas-architecture.config.ts',
  monaco: 'vitest.monaco.config.ts',
  'shell-session': 'vitest.shell-session.config.ts',
  'workspace-services': 'vitest.workspace-services.config.ts',
};

const WEB_VITEST_CHANGED_SUITE_ORDER: readonly WebVitestChangedSuiteName[] = [
  'canvas-unit',
  'canvas-presentation',
  'canvas-architecture',
  'monaco',
  'shell-session',
  'workspace-services',
  'unit',
  'presentation',
  'architecture',
] as const;

export function createWebVitestConfig(suiteName: WebVitestSuiteName): UserConfig {
  const suite = WEB_VITEST_SUITES[suiteName];

  return {
    test: {
      globals: true,
      environment: suiteName === 'unit' || suiteName === 'architecture' ? 'node' : 'jsdom',
      include: [...suite.include],
      exclude: [...suite.exclude],
      ...(isWebVitestCi() ? createWebVitestCiWorkerConfig() : {}),
    },
  };
}

function isWebVitestCi(): boolean {
  return process.env.DVT_CI === '1' || process.env.CI === 'true';
}

function createWebVitestCiWorkerConfig(): NonNullable<UserConfig['test']> {
  return {
    pool: 'forks',
    minWorkers: 1,
    maxWorkers: WEB_VITEST_CI_WORKER_COUNT,
    poolOptions: {
      forks: {
        singleFork: false,
        isolate: true,
        minForks: 1,
        maxForks: WEB_VITEST_CI_WORKER_COUNT,
        execArgv: [WEB_VITEST_CI_NODE_OPTIONS],
      },
    },
  };
}

export function classifyWebVitestFile(filePath: string): {
  primarySuites: WebVitestPrimarySuiteName[];
  focusSuites: WebVitestFocusSuiteName[];
} | null {
  const normalizedPath = normalizeWebVitestPath(filePath);
  if (!/\.(?:test|spec)\.(?:ts|tsx)$/.test(normalizedPath)) {
    return null;
  }

  const primarySuites: WebVitestPrimarySuiteName[] = [];
  if (isArchitectureTestPath(normalizedPath)) {
    primarySuites.push('architecture');
  } else if (/\.(?:test|spec)\.tsx$/.test(normalizedPath)) {
    primarySuites.push('presentation');
  } else if (/\.(?:test|spec)\.ts$/.test(normalizedPath)) {
    primarySuites.push('unit');
  }

  const focusSuites: WebVitestFocusSuiteName[] = [];
  if (isCanvasFocusPath(normalizedPath)) {
    focusSuites.push('canvas');
    const canvasChangedSuite = resolveCanvasChangedSuite(normalizedPath);
    focusSuites.push(canvasChangedSuite);
  }

  if (isMonacoFocusPath(normalizedPath)) {
    focusSuites.push('monaco');
  }

  if (isShellSessionFocusPath(normalizedPath)) {
    focusSuites.push('shell-session');
  }

  if (isWorkspaceServicesFocusPath(normalizedPath)) {
    focusSuites.push('workspace-services');
  }

  return {
    primarySuites,
    focusSuites,
  };
}

function tryAddGovernanceSuite(
  filePath: string,
  webPath: string,
  selectedSuites: Set<WebVitestChangedSuiteName>,
  forcedSuites: Set<WebVitestChangedSuiteName>
): boolean {
  if (isWebVitestGovernancePath(filePath) || isWebVitestGovernancePath(webPath)) {
    selectedSuites.add('architecture');
    forcedSuites.add('architecture');
    return true;
  }
  return false;
}

function tryAddFocusSuite(
  webPath: string,
  selectedSuites: Set<WebVitestChangedSuiteName>
): boolean {
  if (isCanvasFocusPath(webPath)) {
    selectedSuites.add(resolveCanvasChangedSuite(webPath));
    return true;
  }

  if (isMonacoFocusPath(webPath)) {
    selectedSuites.add('monaco');
    return true;
  }

  if (isShellSessionFocusPath(webPath)) {
    selectedSuites.add('shell-session');
    return true;
  }

  if (isWorkspaceServicesFocusPath(webPath)) {
    selectedSuites.add('workspace-services');
    return true;
  }

  return false;
}

function tryAddClassifiedSuite(
  webPath: string,
  selectedSuites: Set<WebVitestChangedSuiteName>
): boolean {
  const classification = classifyWebVitestFile(webPath);
  const primarySuite = classification?.primarySuites[0];
  if (primarySuite) {
    selectedSuites.add(primarySuite);
    return true;
  }

  if (webPath.endsWith('.tsx')) {
    selectedSuites.add('presentation');
    return true;
  }

  if (webPath.endsWith('.ts')) {
    selectedSuites.add('unit');
    return true;
  }

  return false;
}

function resolveSuiteForWebPath(
  filePath: string,
  webPath: string,
  selectedSuites: Set<WebVitestChangedSuiteName>,
  forcedSuites: Set<WebVitestChangedSuiteName>
): void {
  if (
    tryAddGovernanceSuite(filePath, webPath, selectedSuites, forcedSuites) ||
    tryAddFocusSuite(webPath, selectedSuites) ||
    tryAddClassifiedSuite(webPath, selectedSuites)
  ) {
    return;
  }
}

function resolveChangedSuiteForWebPath(
  filePath: string,
  webPath: string
): WebVitestChangedSuiteName | null {
  const selectedSuites = new Set<WebVitestChangedSuiteName>();
  resolveSuiteForWebPath(filePath, webPath, selectedSuites, new Set<WebVitestChangedSuiteName>());

  return WEB_VITEST_CHANGED_SUITE_ORDER.find((suiteName) => selectedSuites.has(suiteName)) ?? null;
}

function isWebVitestTestPath(filePath: string): boolean {
  return /\.(?:test|spec)\.(?:ts|tsx)$/.test(filePath);
}

function createExactChangedTestCommandPlanEntry(
  suiteName: WebVitestChangedSuiteName,
  webPaths: readonly string[]
): WebVitestChangedCommandPlanEntry {
  return {
    kind: 'vitest-files',
    config: WEB_VITEST_CHANGED_SUITE_CONFIGS[suiteName],
    filePaths: [...webPaths],
  };
}

function quoteShellArg(value: string): string {
  if (/^[A-Za-z0-9_@%+=:,./-]+$/.test(value)) {
    return value;
  }

  return `'${value.replaceAll("'", "'\\''")}'`;
}

export function resolveWebVitestChangedSuitePlan(filePaths: readonly string[]): {
  suites: WebVitestChangedSuiteName[];
  commands: string[];
  commandPlan: WebVitestChangedCommandPlanEntry[];
  requiresDependencies: boolean;
} {
  const selectedSuites = new Set<WebVitestChangedSuiteName>();
  const forcedSuites = new Set<WebVitestChangedSuiteName>();
  const exactTestPaths = new Map<WebVitestChangedSuiteName, Set<string>>();
  const changedWebPaths = new Set(
    filePaths
      .map((filePath) => normalizeWebVitestChangedPath(filePath))
      .filter((webPath): webPath is string => webPath !== null)
  );

  function addExactTestPath(suiteName: WebVitestChangedSuiteName, webPath: string): void {
    const paths = exactTestPaths.get(suiteName) ?? new Set<string>();
    paths.add(webPath);
    exactTestPaths.set(suiteName, paths);
  }

  function findDirectChangedTestPath(webPath: string): string | null {
    if (!webPath.startsWith('src/') || isWebVitestTestPath(webPath)) {
      return null;
    }

    const match = /^(.*)\.(ts|tsx)$/.exec(webPath);
    if (!match) {
      return null;
    }

    const [, stem, extension] = match;
    const alternateExtension = extension === 'ts' ? 'tsx' : 'ts';
    const candidates = [
      `${stem}.test.${extension}`,
      `${stem}.spec.${extension}`,
      `${stem}.test.${alternateExtension}`,
      `${stem}.spec.${alternateExtension}`,
    ];

    return candidates.find((candidate) => changedWebPaths.has(candidate)) ?? null;
  }

  for (const filePath of filePaths) {
    const webPath = normalizeWebVitestChangedPath(filePath);
    if (!webPath) {
      if (isWebVitestGovernancePath(filePath)) {
        addExactTestPath('architecture', 'src/testing/vitestSuites.architecture.test.ts');
      }
      continue;
    }

    if (isWebVitestGovernancePath(filePath) || isWebVitestGovernancePath(webPath)) {
      addExactTestPath('architecture', 'src/testing/vitestSuites.architecture.test.ts');
      continue;
    }

    if (isWebVitestTestPath(webPath) && !isWebVitestGovernancePath(filePath)) {
      const suiteName = resolveChangedSuiteForWebPath(filePath, webPath);
      if (suiteName) {
        addExactTestPath(suiteName, webPath);
      }
      continue;
    }

    const directChangedTestPath = findDirectChangedTestPath(webPath);
    if (directChangedTestPath && !isWebVitestGovernancePath(filePath)) {
      const suiteName = resolveChangedSuiteForWebPath(filePath, directChangedTestPath);
      if (suiteName) {
        addExactTestPath(suiteName, directChangedTestPath);
        continue;
      }
    }

    resolveSuiteForWebPath(filePath, webPath, selectedSuites, forcedSuites);
  }

  const suites = WEB_VITEST_CHANGED_SUITE_ORDER.filter(
    (suiteName) => selectedSuites.has(suiteName) || exactTestPaths.has(suiteName)
  );
  const commandPlan = suites.flatMap((suiteName): WebVitestChangedCommandPlanEntry[] => {
    const exactPaths = [...(exactTestPaths.get(suiteName) ?? [])].sort((left, right) =>
      left.localeCompare(right)
    );

    if (selectedSuites.has(suiteName) && (exactPaths.length === 0 || forcedSuites.has(suiteName))) {
      return [{ kind: 'shell', command: WEB_VITEST_CHANGED_SUITE_COMMANDS[suiteName] }];
    }

    return exactPaths.length === 0
      ? []
      : [createExactChangedTestCommandPlanEntry(suiteName, exactPaths)];
  });

  return {
    suites,
    commands: commandPlan.map((entry) =>
      entry.kind === 'shell'
        ? entry.command
        : `pnpm exec vitest run --config ${entry.config} ${entry.filePaths
            .map((filePath) => quoteShellArg(filePath))
            .join(' ')}`
    ),
    commandPlan,
    requiresDependencies: commandPlan.some((entry) => entry.kind === 'shell'),
  };
}

function normalizeWebVitestPath(filePath: string): string {
  return filePath.replaceAll('\\', '/').replace(/^\.?\//, '');
}

function normalizeWebVitestChangedPath(filePath: string): string | null {
  const normalizedPath = normalizeWebVitestPath(filePath);
  if (normalizedPath.startsWith('apps/web/')) {
    return normalizedPath.slice('apps/web/'.length);
  }

  if (normalizedPath.startsWith('src/')) {
    return normalizedPath;
  }

  if (/^vitest(?:\.[a-z-]+)?\.config\.ts$/.test(normalizedPath)) {
    return normalizedPath;
  }

  if (normalizedPath === 'vitest.suites.ts' || normalizedPath === 'package.json') {
    return normalizedPath;
  }

  return null;
}

function isArchitectureTestPath(filePath: string): boolean {
  return /\.architecture\.test\.(?:ts|tsx)$/.test(filePath);
}

function isCanvasFocusPath(filePath: string): boolean {
  return (
    filePath === 'src/app/views/Canvas.tsx' ||
    filePath === 'src/app/views/Canvas.test.support.tsx' ||
    /^src\/app\/views\/Canvas.*\.(?:test|spec)\.tsx$/.test(filePath) ||
    filePath.startsWith('src/app/views/canvas/') ||
    filePath.startsWith('src/app/components/canvas/') ||
    filePath.startsWith('src/app/components/inspector/')
  );
}

function isMonacoFocusPath(filePath: string): boolean {
  return (
    filePath.startsWith('src/app/components/monaco/') ||
    filePath === 'src/app/views/CodeView.tsx' ||
    filePath === 'src/app/views/CodeView.test.tsx' ||
    filePath.startsWith('src/app/views/code/') ||
    filePath === 'src/app/views/artifacts/ArtifactMonacoPreviewPanel.tsx' ||
    filePath === 'src/app/views/artifacts/ArtifactMonacoPreviewPanel.test.tsx' ||
    filePath === 'src/app/views/artifacts/artifactsMonacoReadonlyViewer.architecture.test.ts' ||
    filePath === 'src/app/views/diff/diffMonacoReviewSurface.architecture.test.ts' ||
    filePath === 'src/app/components/monaco/monacoBundleIsolation.architecture.test.ts' ||
    filePath === 'vite.manualChunks.ts' ||
    filePath === 'vite.config.ts'
  );
}

function isShellSessionFocusPath(filePath: string): boolean {
  return (
    filePath.startsWith('src/app/components/shell/') ||
    filePath === 'src/app/components/TopAppBar.tsx' ||
    filePath === 'src/app/components/TopAppBar.test.tsx' ||
    filePath === 'src/app/components/TopAppBar.architecture.test.ts' ||
    filePath === 'src/app/services/AppServicesContext.tsx' ||
    filePath.startsWith('src/app/services/session/') ||
    filePath.startsWith('src/app/services/composition/') ||
    filePath === 'src/app/services/api/createApiClient.ts' ||
    filePath === 'src/app/services/api/createApiClient.test.ts' ||
    filePath === 'src/app/stores/sessionStore.ts' ||
    filePath === 'src/app/stores/sessionStore.test.ts' ||
    filePath === 'src/app/ports/workspaceScopeSelection.ts' ||
    filePath === 'src/testing/appServicesTestDoubles.ts' ||
    filePath === 'src/testing/runsPortDoubles.ts'
  );
}

function isWorkspaceServicesFocusPath(filePath: string): boolean {
  return filePath.startsWith('src/app/services/workspace/');
}

function resolveCanvasChangedSuite(filePath: string): Exclude<WebVitestFocusSuiteName, 'canvas'> {
  if (isArchitectureTestPath(filePath)) {
    return 'canvas-architecture';
  }

  if (filePath.endsWith('.tsx')) {
    return 'canvas-presentation';
  }

  return 'canvas-unit';
}

function isWebVitestGovernancePath(filePath: string): boolean {
  const normalizedPath = normalizeWebVitestPath(filePath);

  return (
    /^apps\/web\/vitest(?:\.suites|(?:\.[a-z-]+)?\.config)\.ts$/.test(normalizedPath) ||
    /^vitest(?:\.suites|(?:\.[a-z-]+)?\.config)\.ts$/.test(normalizedPath) ||
    normalizedPath === 'apps/web/scripts/run-vitest-changed-suites.ts' ||
    normalizedPath === 'scripts/run-vitest-changed-suites.ts' ||
    normalizedPath === 'apps/web/package.json' ||
    normalizedPath === 'package.json' ||
    normalizedPath === '.github/workflows/test.yml' ||
    normalizedPath === 'docs/architecture/components/web/frontend-test-governance-component.md' ||
    normalizedPath ===
      'docs/architecture/components/web/web-vitest-changed-suite-router-component.md' ||
    normalizedPath ===
      'docs/architecture/components/web/web-vitest-changed-suite-router-user-stories.md' ||
    normalizedPath === 'buzon/20260518-f14-fowler-frontend-test-governance-analysis.md' ||
    normalizedPath === 'buzon/20260518-f14a-fowler-web-vitest-changed-suite-routing-analysis.md'
  );
}
