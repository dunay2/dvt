/** Owned concern: configure Monaco editor workers from the local Vite bundle. */
import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import CssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import HtmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import TypescriptWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

const MONACO_LOCAL_WORKER_FACTORIES = {
  css: () => new CssWorker(),
  editor: () => new EditorWorker(),
  html: () => new HtmlWorker(),
  json: () => new JsonWorker(),
  typescript: () => new TypescriptWorker(),
} as const;

export function configureMonacoLocalWorkers(): void {
  Object.assign(globalThis, {
    MonacoEnvironment: {
      getWorker(_workerId: string, label: string): Worker {
        switch (label) {
          case 'css':
          case 'scss':
          case 'less':
            return MONACO_LOCAL_WORKER_FACTORIES.css();
          case 'html':
          case 'handlebars':
          case 'razor':
            return MONACO_LOCAL_WORKER_FACTORIES.html();
          case 'json':
            return MONACO_LOCAL_WORKER_FACTORIES.json();
          case 'javascript':
          case 'typescript':
            return MONACO_LOCAL_WORKER_FACTORIES.typescript();
          default:
            return MONACO_LOCAL_WORKER_FACTORIES.editor();
        }
      },
    },
  });
  loader.config({ monaco });
}
