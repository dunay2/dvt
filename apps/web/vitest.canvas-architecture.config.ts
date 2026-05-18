/**
 * @ownedConcern Expose the Canvas architecture focus-suite Vitest config from
 * the governed suite catalog without turning focus coverage into primary ownership.
 */
import { defineConfig } from 'vitest/config';

import { createWebVitestConfig } from './vitest.suites';

export default defineConfig(createWebVitestConfig('canvas-architecture'));
