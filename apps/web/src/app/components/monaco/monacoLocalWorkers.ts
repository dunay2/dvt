/** Owned concern: configure Monaco editor workers from the local Vite bundle. */
import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import CssWorker from 'monaco-editor/language/css/css.worker.js?worker';
import EditorWorker from 'monaco-editor/editor/editor.worker.js?worker';
import HtmlWorker from 'monaco-editor/language/html/html.worker.js?worker';
import JsonWorker from 'monaco-editor/language/json/json.worker.js?worker';
import TypescriptWorker from 'monaco-editor/language/typescript/ts.worker.js?worker';

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
