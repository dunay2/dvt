import { defineConfig } from 'vitest/config';

const workspaceServicesVitestConfig = {
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/app/services/workspace/**/*.{test,spec}.{ts,tsx}'],
  },
};

export default defineConfig(workspaceServicesVitestConfig);
