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
] as const;

export type WebVitestPrimarySuiteName = (typeof WEB_VITEST_PRIMARY_SUITE_NAMES)[number];
export type WebVitestFocusSuiteName = (typeof WEB_VITEST_FOCUS_SUITE_NAMES)[number];
export type WebVitestSuiteName = 'all' | WebVitestPrimarySuiteName | WebVitestFocusSuiteName;
export type WebVitestChangedSuiteName =
  | WebVitestPrimarySuiteName
  | Exclude<WebVitestFocusSuiteName, 'canvas'>;

type WebVitestSuiteDefinition = Readonly<{
  include: readonly string[];
  exclude: readonly string[];
}>;

const WEB_VITEST_DEFAULT_EXCLUDE = ['node_modules/**', 'dist/**'] as const;

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
    ],
    exclude: WEB_VITEST_DEFAULT_EXCLUDE,
  },
  'canvas-unit': {
    include: ['src/app/views/canvas/**/*.{test,spec}.ts'],
    exclude: [...WEB_VITEST_DEFAULT_EXCLUDE, 'src/app/views/canvas/**/*.architecture.test.ts'],
  },
  'canvas-presentation': {
    include: ['src/app/views/Canvas*.{test,spec}.tsx', 'src/app/views/canvas/**/*.{test,spec}.tsx'],
    exclude: [
      ...WEB_VITEST_DEFAULT_EXCLUDE,
      'src/app/views/Canvas*.architecture.test.tsx',
      'src/app/views/canvas/**/*.architecture.test.tsx',
    ],
  },
  'canvas-architecture': {
    include: [
      'src/app/views/Canvas*.architecture.test.tsx',
      'src/app/views/canvas/**/*.architecture.test.{ts,tsx}',
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
      'src/app/components/monaco/**/*.{test,spec}.{ts,tsx}',
    ],
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
};

const WEB_VITEST_CHANGED_SUITE_ORDER: readonly WebVitestChangedSuiteName[] = [
  'canvas-unit',
  'canvas-presentation',
  'canvas-architecture',
  'monaco',
  'unit',
  'presentation',
  'architecture',
] as const;

export function createWebVitestConfig(suiteName: WebVitestSuiteName): UserConfig {
  const suite = WEB_VITEST_SUITES[suiteName];

  return {
    test: {
      globals: true,
      environment: 'jsdom',
      include: [...suite.include],
      exclude: [...suite.exclude],
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

  return {
    primarySuites,
    focusSuites,
  };
}

function tryAddGovernanceSuite(
  filePath: string,
  webPath: string,
  selectedSuites: Set<WebVitestChangedSuiteName>
): boolean {
  if (isWebVitestGovernancePath(filePath) || isWebVitestGovernancePath(webPath)) {
    selectedSuites.add('architecture');
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
  selectedSuites: Set<WebVitestChangedSuiteName>
): void {
  if (
    tryAddGovernanceSuite(filePath, webPath, selectedSuites) ||
    tryAddFocusSuite(webPath, selectedSuites) ||
    tryAddClassifiedSuite(webPath, selectedSuites)
  ) {
    return;
  }
}

export function resolveWebVitestChangedSuitePlan(filePaths: readonly string[]): {
  suites: WebVitestChangedSuiteName[];
  commands: string[];
} {
  const selectedSuites = new Set<WebVitestChangedSuiteName>();

  for (const filePath of filePaths) {
    const webPath = normalizeWebVitestChangedPath(filePath);
    if (!webPath) {
      if (isWebVitestGovernancePath(filePath)) {
        selectedSuites.add('architecture');
      }
      continue;
    }

    resolveSuiteForWebPath(filePath, webPath, selectedSuites);
  }

  const suites = WEB_VITEST_CHANGED_SUITE_ORDER.filter((suiteName) =>
    selectedSuites.has(suiteName)
  );

  return {
    suites,
    commands: suites.map((suiteName) => WEB_VITEST_CHANGED_SUITE_COMMANDS[suiteName]),
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
    /^src\/app\/views\/Canvas.*\.(?:test|spec)\.tsx$/.test(filePath) ||
    filePath.startsWith('src/app/views/canvas/')
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
    filePath === 'src/app/views/diff/diffMonacoReviewSurface.architecture.test.ts'
  );
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
