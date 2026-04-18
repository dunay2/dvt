import { fileURLToPath, URL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = env.VITE_API_BASE_URL?.trim() || 'http://127.0.0.1:3000';
  const appVersion = process.env.npm_package_version?.trim() || '0.0.0';
  // Keep the bundle deterministic under Turbo cache; callers may inject an
  // explicit build date when they need one, whether it comes from package-local
  // .env files or the invoking shell environment.
  const appBuildDate = env.VITE_APP_BUILD_DATE?.trim() || process.env.VITE_APP_BUILD_DATE?.trim() || '';
  const allowedHosts =
    env.VITE_ALLOWED_HOSTS
      ?.split(',')
      .map((host) => host.trim())
      .filter((host) => host.length > 0) ?? ['host.docker.internal'];

  return {
    plugins: [
      // The React and Tailwind plugins are both required for Make, even if
      // Tailwind is not being actively used - do not remove them
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      allowedHosts,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          rewrite: (requestPath) => requestPath.replace(/^\/api/, ''),
        },
      },
    },
    preview: {
      allowedHosts,
    },

    // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
    assetsInclude: ['**/*.svg', '**/*.csv'],

    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('@monaco-editor') || id.includes('monaco-editor')) {
              return 'monaco-vendor';
            }

            if (id.includes('@xterm')) {
              return 'terminal-vendor';
            }
          },
        },
      },
    },
    define: {
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
      'import.meta.env.VITE_APP_BUILD_DATE': JSON.stringify(appBuildDate),
    },
  };
});
