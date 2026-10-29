/** Owned concern: coordinate the single-editor laboratory session and exact fixture verification. */

import * as monaco from 'monaco-editor/editor/editor.api.js';
import 'monaco-editor/languages/definitions/sql/register.js';
import EditorWorker from 'monaco-editor/editor/editor.worker.js?worker';
import {
  configureMonacoVisualTheme,
  createMonacoCodeOptions,
  monacoTheme,
} from '../../apps/web/src/app/components/monaco/monacoVisualTokens.ts';
import { fixture } from './fixture.mjs';
import { attachCards } from './cards.mjs';

self.MonacoEnvironment = { getWorker: () => new EditorWorker() };
configureMonacoVisualTheme(monaco);
const model = monaco.editor.createModel(fixture.sql, 'sql', monaco.Uri.parse(fixture.path));
const editor = monaco.editor.create(document.querySelector('#editor'), {
  ...createMonacoCodeOptions({ ariaLabel: 'SQL del piloto', readOnly: false }),
  model,
  theme: monacoTheme,
  fontSize: 13,
  lineHeight: 22,
  padding: { top: 18, bottom: 18 },
});
const state = document.querySelector('#state');
const count = document.querySelector('#card-count');
const verifyButton = document.querySelector('#verify');
const details = document.querySelector('#details');
const initialDetails = details.cloneNode(true);
const title = document.querySelector('#detail-title');
const closeDetails = document.querySelector('#close-details');
let cards;
let generation = 0;
let inspectOpener;
const checksum = async (text) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
};
const fixtureRevision = checksum(fixture.sql);

function showState(phase, message) {
  state.dataset.state = phase;
  state.textContent = message;
  count.textContent = phase === 'ready' ? `${fixture.references.length} componentes` : '';
}

function hideCards() {
  cards?.dispose();
  cards = undefined;
}

function appendText(parent, tag, text, className) {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  parent.append(element);
  return element;
}

function inspect(reference) {
  inspectOpener = document.activeElement;
  title.textContent = reference.name;
  closeDetails.hidden = false;
  details.replaceChildren();
  appendText(details, 'p', 'Definición · solo lectura', 'muted');
  appendText(details, 'pre', reference.definition, 'definition-code');
  for (const [label, ports] of [
    ['Entrada', reference.inputs],
    ['Salida', [reference.output]],
  ]) {
    for (const port of ports) {
      appendText(details, 'h2', `${label} · ${port.name}`, 'schema-heading');
      for (const column of port.columns) {
        const row = appendText(details, 'div', '', 'schema-field');
        appendText(row, 'span', column.name);
        appendText(row, 'span', column.type);
      }
    }
  }
  title.focus();
}

async function verifyFixture() {
  const requestGeneration = ++generation;
  const version = model.getVersionId();
  const value = model.getValue();
  hideCards();
  verifyButton.disabled = true;
  showState('verifying', 'Comprobando documento de ejemplo…');
  const [actualRevision, expectedRevision] = await Promise.all([checksum(value), fixtureRevision]);
  if (requestGeneration !== generation || version !== model.getVersionId()) return;
  verifyButton.disabled = false;
  if (
    actualRevision !== expectedRevision ||
    fixture.references.some(
      (ref) => value.slice(ref.startOffset, ref.endOffset) !== ref.referenceSource
    )
  ) {
    showState('unsupported', 'Texto fuera del ejemplo · usa Deshacer para volver a validarlo');
    return;
  }
  cards = attachCards(editor, monaco, fixture.references, inspect);
  showState('ready', 'Ejemplo verificado');
}

const contentSubscription = model.onDidChangeContent(() => {
  generation += 1;
  hideCards();
  verifyButton.disabled = false;
  showState('dirty', 'Cambios sin verificar · tarjetas ocultas');
});
verifyButton.addEventListener('click', () => void verifyFixture());
document.querySelector('#read-only').addEventListener('change', (event) => {
  editor.updateOptions({ readOnly: event.target.checked, domReadOnly: event.target.checked });
});
closeDetails.addEventListener('click', () => {
  title.textContent = 'El documento';
  details.replaceChildren(...[...initialDetails.childNodes].map((node) => node.cloneNode(true)));
  closeDetails.hidden = true;
  if (inspectOpener?.isConnected) inspectOpener.focus();
  else editor.focus();
});

// Laboratory browser-proof access to the real editor; no alternate buffer or history.
window.codecompPilot = Object.freeze({ editor, model });
window.addEventListener(
  'pagehide',
  () => {
    generation += 1;
    hideCards();
    contentSubscription.dispose();
    editor.dispose();
    model.dispose();
  },
  { once: true }
);
await verifyFixture();
