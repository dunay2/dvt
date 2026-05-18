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
};

export const WEB_VITEST_CHANGED_SUITE_COMMANDS: Record<WebVitestChangedSuiteName, string> = {
  unit: 'pnpm run test:unit:run',
  presentation: 'pnpm run test:presentation:run',
  architecture: 'pnpm run test:architecture:run',
  'canvas-unit': 'pnpm run test:canvas-unit:run',
  'canvas-presentation': 'pnpm run test:canvas-presentation:run',
  'canvas-architecture': 'pnpm run test:canvas-architecture:run',
};

const WEB_VITEST_CHANGED_SUITE_ORDER: readonly WebVitestChangedSuiteName[] = [
  'canvas-unit',
  'canvas-presentation',
  'canvas-architecture',
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

  return {
    primarySuites,
    focusSuites,
  };
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

    if (isWebVitestGovernancePath(filePath) || isWebVitestGovernancePath(webPath)) {
      selectedSuites.add('architecture');
      continue;
    }

    if (isCanvasFocusPath(webPath)) {
      selectedSuites.add(resolveCanvasChangedSuite(webPath));
      continue;
    }

    const classification = classifyWebVitestFile(webPath);
    const primarySuite = classification?.primarySuites[0];
    if (primarySuite) {
      selectedSuites.add(primarySuite);
      continue;
    }

    if (/\.tsx$/.test(webPath)) {
      selectedSuites.add('presentation');
      continue;
    }

    if (/\.ts$/.test(webPath)) {
      selectedSuites.add('unit');
    }
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
  return filePath.replace(/\\/g, '/').replace(/^\.?\//, '');
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
    /^src\/app\/views\/canvas\//.test(filePath)
  );
}

function resolveCanvasChangedSuite(filePath: string): Exclude<WebVitestFocusSuiteName, 'canvas'> {
  if (isArchitectureTestPath(filePath)) {
    return 'canvas-architecture';
  }

  if (/\.tsx$/.test(filePath)) {
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
