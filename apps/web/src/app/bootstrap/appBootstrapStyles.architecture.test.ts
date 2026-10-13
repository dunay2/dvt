// @vitest-environment jsdom
/**
 * Owned concern: verify bootstrap stylesheet and HTML ownership independently of screen state.
 * Reason: appearance declarations and load boundaries are architecture evidence, not DOM commands.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const WEB_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const INDEX_HTML_PATH = resolve(WEB_ROOT, 'index.html');
const BOOTSTRAP_SCREEN_SOURCE_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  'appBootstrapScreen.ts'
);
const FONT_SOURCE_PATH = resolve(WEB_ROOT, 'src/styles/fonts.css');
const ENTRY_SOURCE_PATH = resolve(WEB_ROOT, 'src/main.tsx');
const CASCADE_LAYER_SOURCE_PATH = resolve(WEB_ROOT, 'public/cascade-layers.css');
const BOOTSTRAP_STYLE_SOURCE_PATH = resolve(WEB_ROOT, 'public/app-bootstrap-screen.css');
const REGEXP_SYNTAX_CHARACTERS = new Set([
  '.',
  '*',
  '+',
  '?',
  '^',
  '$',
  '{',
  '}',
  '(',
  ')',
  '|',
  '[',
  ']',
  '\\',
]);

function escapeRegExpSyntax(value: string): string {
  return Array.from(value, (character) =>
    REGEXP_SYNTAX_CHARACTERS.has(character) ? `\\${character}` : character
  ).join('');
}

function extractCssRule(source: string, selector: string): string {
  const escapedSelector = escapeRegExpSyntax(selector);
  const rulePattern = new RegExp(String.raw`${escapedSelector}\s*\{(?<body>[^}]*)\}`);
  const match = rulePattern.exec(source);
  return match?.groups?.body ?? '';
}

describe('App bootstrap style architecture', () => {
  it('loads startup appearance through the second external stylesheet without inline CSS or a JS owner', () => {
    const screenTests = readFileSync(
      resolve(WEB_ROOT, 'src/app/bootstrap/appBootstrapScreen.test.ts'),
      'utf8'
    );
    expect(screenTests).not.toContain('extractCssRule');
    expect(screenTests).not.toContain('BOOTSTRAP_STYLE_SOURCE_PATH');
    const styleTests = readFileSync(fileURLToPath(import.meta.url), 'utf8');
    expect(styleTests).not.toMatch(
      /from\s+['"]\.\/appBootstrap(?:Screen|Commands|Presentation)['"]/u
    );
    const indexHtml = readFileSync(INDEX_HTML_PATH, 'utf8');
    const parsedDocument = new DOMParser().parseFromString(indexHtml, 'text/html');
    expect(parsedDocument.querySelectorAll('style, [style]')).toHaveLength(0);
    const stylesheets = Array.from(
      parsedDocument.head.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')
    );
    expect(stylesheets.slice(0, 2).map((link) => link.getAttribute('href'))).toEqual([
      '/cascade-layers.css',
      '/app-bootstrap-screen.css',
    ]);
    for (const href of ['/cascade-layers.css', '/app-bootstrap-screen.css']) {
      expect(stylesheets.filter((link) => link.getAttribute('href') === href)).toHaveLength(1);
    }
    const startupStylesheet = stylesheets[1]!;
    expect(startupStylesheet.hasAttribute('disabled')).toBe(false);
    expect(startupStylesheet.hasAttribute('media')).toBe(false);
    const moduleScripts = Array.from(parsedDocument.querySelectorAll('script[type="module"]'));
    expect(moduleScripts.length).toBeGreaterThan(0);
    moduleScripts.forEach((script) => {
      expect(
        startupStylesheet.compareDocumentPosition(script) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });
    const bootstrapCss = readFileSync(BOOTSTRAP_STYLE_SOURCE_PATH, 'utf8');
    expect(bootstrapCss).not.toMatch(/@(?:layer|import)\b/u);
    for (const ownerSourcePath of [ENTRY_SOURCE_PATH, BOOTSTRAP_SCREEN_SOURCE_PATH]) {
      expect(readFileSync(ownerSourcePath, 'utf8')).not.toContain('app-bootstrap-screen.css');
    }
  });

  it('registers the canonical CSS layer order through the first external HTML stylesheet without a duplicate JS owner', () => {
    const indexHtml = readFileSync(INDEX_HTML_PATH, 'utf8');
    const parsedDocument = new DOMParser().parseFromString(indexHtml, 'text/html');
    const firstStylesheet =
      parsedDocument.head.querySelector<HTMLLinkElement>('link[rel="stylesheet"]');
    expect(firstStylesheet?.getAttribute('href')).toBe('/cascade-layers.css');
    expect(firstStylesheet?.hasAttribute('disabled')).toBe(false);
    expect(firstStylesheet?.hasAttribute('media')).toBe(false);
    expect(parsedDocument.head.querySelector('link[rel="stylesheet"], style')).toBe(
      firstStylesheet
    );
    expect(parsedDocument.querySelectorAll('link[href="/cascade-layers.css"]')).toHaveLength(1);
    const moduleScripts = Array.from(parsedDocument.querySelectorAll('script[type="module"]'));
    expect(moduleScripts.length).toBeGreaterThan(0);
    moduleScripts.forEach((script) => {
      expect(
        firstStylesheet!.compareDocumentPosition(script) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });
    expect(indexHtml).not.toContain('@layer');
    const entrySource = readFileSync(ENTRY_SOURCE_PATH, 'utf8');
    expect(entrySource).not.toContain('cascadeLayers.css');
    expect(entrySource).not.toContain('cascade-layers.css');
    expect(existsSync(resolve(WEB_ROOT, 'src/styles/cascadeLayers.css'))).toBe(false);

    const layerSource = readFileSync(CASCADE_LAYER_SOURCE_PATH, 'utf8');
    expect(layerSource.replace(/\/\*[\s\S]*?\*\//g, '').trim()).toBe(
      '@layer properties, theme, base, components, utilities;'
    );
    const appImportPosition = entrySource.indexOf("import App from './app/App.tsx';");
    expect(appImportPosition).toBeGreaterThanOrEqual(0);
    expect(entrySource.indexOf("import './styles/index.css';")).toBeGreaterThan(appImportPosition);
  });

  it('uses the governed mature typography and neutral startup palette before React executes', () => {
    const bootstrapCss = readFileSync(BOOTSTRAP_STYLE_SOURCE_PATH, 'utf8');
    const fontSource = readFileSync(FONT_SOURCE_PATH, 'utf8');
    const screenRule = extractCssRule(bootstrapCss, '#app-loading-screen');
    const titleRule = extractCssRule(bootstrapCss, '#app-loading-title');

    expect(fontSource).toContain("--font-sans: 'IBM Plex Sans'");
    expect(fontSource).toContain("--font-mono: 'IBM Plex Mono'");
    expect(fontSource).toContain('@fontsource/ibm-plex-sans/latin-400.css');
    expect(fontSource).toContain('@fontsource/ibm-plex-sans/latin-600.css');
    expect(fontSource).toContain('@fontsource/ibm-plex-mono/latin-400.css');
    expect(screenRule).toContain('background-color: #0b0d10');
    expect(screenRule).toMatch(/font-family:\s*'IBM Plex Sans'/);
    expect(titleRule).toContain('font-size: 1.25rem');
    expect(bootstrapCss).toContain('@media (max-width: 900px)');
    expect(bootstrapCss).toContain('@media (max-width: 700px)');
    expect(bootstrapCss).toContain('@media (prefers-reduced-motion: reduce)');
    expect(bootstrapCss).toContain('@media (forced-colors: active)');
    expect(bootstrapCss).toContain('overflow: auto');
    expect(bootstrapCss).not.toContain('#60a5fa');
    expect(bootstrapCss).not.toContain("'JetBrains Mono'");
  });

  it('keeps pending neutral and failed red in the production bootstrap CSS', () => {
    const bootstrapCss = readFileSync(BOOTSTRAP_STYLE_SOURCE_PATH, 'utf8');
    const pendingRule = extractCssRule(
      bootstrapCss,
      "#app-loading-steps li[data-status='pending']::before"
    );
    const failedRule = extractCssRule(
      bootstrapCss,
      "#app-loading-steps li[data-status='failed']::before"
    );
    const failedSegmentRule = extractCssRule(
      bootstrapCss,
      ".app-loading-progress-segment[data-status='failed']"
    );

    expect(pendingRule).not.toContain('#f59e0b');
    expect(failedRule).toContain('#ef4444');
    expect(failedSegmentRule).toContain('#ef4444');
  });
});
