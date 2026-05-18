/**
 * @ownedConcern Expose the web presentation-test Vitest config from the
 * governed suite catalog without duplicating include and exclude rules.
 */
import { defineConfig } from 'vitest/config';

import { createWebVitestConfig } from './vitest.suites';

export default defineConfig(createWebVitestConfig('presentation'));
