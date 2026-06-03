import { defineConfig } from 'vitest/config';

import { createWebVitestConfig } from './vitest.suites';

export default defineConfig(createWebVitestConfig('monaco'));
