import { defineConfig } from 'vitest/config';

import { createWebVitestConfig } from './vitest/runtimeConfig';

export default defineConfig(createWebVitestConfig('workspace-services'));
