/** Owned concern: serve the isolated browser pilot using existing pinned dependencies. */

import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import tailwindcss from '../../apps/web/node_modules/@tailwindcss/vite/dist/index.mjs';

const localPath = (path) => fileURLToPath(new URL(path, import.meta.url));
const monacoRoot = realpathSync(localPath('../../apps/web/node_modules/monaco-editor'));
const fontRoot = realpathSync(localPath('../../apps/web/node_modules/@fontsource/ibm-plex-sans'));
const monoFontRoot = realpathSync(
  localPath('../../apps/web/node_modules/@fontsource/ibm-plex-mono')
);

export default {
  plugins: [tailwindcss()],
  resolve: { alias: { 'monaco-editor': `${monacoRoot}/esm/vs` } },
  optimizeDeps: {
    noDiscovery: true,
    include: [
      'monaco-editor/editor/editor.api.js',
      'monaco-editor/languages/definitions/sql/register.js',
    ],
  },
  server: {
    host: '127.0.0.1',
    port: 5188,
    strictPort: true,
    fs: {
      allow: [
        localPath('.'),
        localPath('../../apps/web/src/styles'),
        localPath('../../apps/web/src/app/components/monaco'),
        monacoRoot,
        fontRoot,
        monoFontRoot,
      ],
    },
  },
  build: { outDir: '../../.dvt/codecomp1-monaco-build', emptyOutDir: false },
};
