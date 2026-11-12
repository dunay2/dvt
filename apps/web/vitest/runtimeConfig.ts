/**
 * Owned concern: construct Vitest execution configuration from the governed suite catalog.
 * @baseline GH-3765: one module mixed catalog, runtime and plan policies.
 * @decision Keep one owner per reason to change and reuse the existing rails.
 * @consequence Consumers import the real owner without compatibility re-exports.
 */
import type { UserConfig } from 'vitest/config';

import { WEB_VITEST_SUITES, type WebVitestSuiteName } from '../vitest.suites';

const WEB_VITEST_LOCAL_WORKER_COUNT = 4;

export const WEB_VITEST_CI_WORKER_COUNT = 1;

export const WEB_VITEST_CI_WORKER_MAX_OLD_SPACE_MB = 4096;

export const WEB_VITEST_CI_NODE_OPTIONS = `--max-old-space-size=${WEB_VITEST_CI_WORKER_MAX_OLD_SPACE_MB}`;

export function createWebVitestConfig(suiteName: WebVitestSuiteName): UserConfig {
  const suite = WEB_VITEST_SUITES[suiteName];
  const environment =
    suiteName === 'unit' ||
    suiteName === 'architecture' ||
    suiteName === 'canvas-unit' ||
    suiteName === 'canvas-architecture'
      ? 'node'
      : 'jsdom';

  return {
    ...(environment === 'jsdom' ? { resolve: { conditions: ['browser'] } } : {}),
    test: {
      globals: true,
      environment,
      include: [...suite.include],
      exclude: [...suite.exclude],
      ...createWebVitestWorkerConfig(),
    },
  };
}

function isWebVitestCi(): boolean {
  return process.env.DVT_CI === '1' || process.env.CI === 'true';
}

function createWebVitestWorkerConfig(): NonNullable<UserConfig['test']> {
  const ci = isWebVitestCi();
  const workerCount = ci ? WEB_VITEST_CI_WORKER_COUNT : WEB_VITEST_LOCAL_WORKER_COUNT;
  return {
    pool: 'forks',
    minWorkers: 1,
    maxWorkers: workerCount,
    poolOptions: {
      forks: {
        singleFork: false,
        isolate: true,
        minForks: 1,
        maxForks: workerCount,
        ...(ci ? { execArgv: [WEB_VITEST_CI_NODE_OPTIONS] } : {}),
      },
    },
  };
}
