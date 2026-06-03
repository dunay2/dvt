import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const COMPONENT_DOC_PATH = 'docs/guides/docs-markdown-governance-parser-component.md';

const markdownModules = [
  {
    path: 'tools/docs/lib/markdown.ts',
    ownedConcern:
      'Owned concern: expose the stable markdown parsing facade for docs governance tools.',
  },
  {
    path: 'tools/docs/lib/markdownAdrFields.ts',
    ownedConcern:
      'Owned concern: extract ADR-style metadata fields from frontmatter and ADR preambles.',
  },
  {
    path: 'tools/docs/lib/markdownAnchors.ts',
    ownedConcern:
      'Owned concern: derive linkable markdown anchors from headings and explicit anchor tags.',
  },
  {
    path: 'tools/docs/lib/markdownFrontmatter.ts',
    ownedConcern:
      'Owned concern: split, parse, and read YAML frontmatter for docs governance tools.',
  },
  {
    path: 'tools/docs/lib/markdownLinks.ts',
    ownedConcern:
      'Owned concern: extract markdown links while ignoring fenced and inline code examples.',
  },
  {
    path: 'tools/docs/lib/markdownRegex.ts',
    ownedConcern:
      'Owned concern: provide deterministic regex iteration for markdown parser subcomponents.',
  },
];

const facadeConsumers = [
  'tools/docs/check-adr-catalog.ts',
  'tools/docs/check-frontmatter.ts',
  'tools/docs/check-links.ts',
  'tools/docs/generate-docs-manifest.ts',
];

function read(path) {
  return readFileSync(path, 'utf8');
}

test('docs markdown governance parser has a local component guide', () => {
  assert.equal(existsSync(COMPONENT_DOC_PATH), true);

  const docText = read(COMPONENT_DOC_PATH);
  for (const section of [
    '## Public API',
    '## Invariants',
    '## Transitions',
    '## Consumers',
    '## Component Flow',
    '## Drift To Prevent',
    '## Fowler Reading',
  ]) {
    assert.match(docText, new RegExp(section));
  }

  assert.match(docText, /```mermaid/);
  assert.match(docText, /tools\/docs\/lib\/markdown\.ts/);
  assert.match(docText, /docs governance tools must import the facade/);
});

test('markdown parser modules state their owned concerns at module start', () => {
  for (const module of markdownModules) {
    const leadingSource = read(module.path).slice(0, 260);
    assert.match(leadingSource, /Owned concern:/, `${module.path} lacks an owned concern`);
    assert.ok(
      leadingSource.includes(module.ownedConcern),
      `${module.path} has drifted from its expected semantic ownership`
    );
  }
});

test('docs tools consume markdown parsing through the facade', () => {
  for (const consumer of facadeConsumers) {
    assert.match(
      read(consumer),
      /from '\.\/lib\/markdown\.js'/,
      `${consumer} should import the markdown facade instead of helper internals`
    );
  }

  const facadeSource = read('tools/docs/lib/markdown.ts');
  assert.match(facadeSource, /from '\.\/markdownAdrFields\.js'/);
  assert.match(facadeSource, /from '\.\/markdownAnchors\.js'/);
  assert.match(facadeSource, /from '\.\/markdownFrontmatter\.js'/);
  assert.match(facadeSource, /from '\.\/markdownLinks\.js'/);
  assert.doesNotMatch(facadeSource, /\bconst\s+[A-Z_]+_RE\b/);
  assert.doesNotMatch(
    facadeSource,
    /\bfunction\s+(?!readIfExists\b|parseFrontmatter\b|splitFrontmatter\b)/
  );
});

test('markdown helper imports preserve semantic subcomponent boundaries', () => {
  const adrFieldsSource = read('tools/docs/lib/markdownAdrFields.ts');
  assert.match(adrFieldsSource, /from '\.\/markdownFrontmatter\.js'/);
  assert.match(adrFieldsSource, /from '\.\/markdownRegex\.js'/);
  assert.doesNotMatch(adrFieldsSource, /readFileSync/);
  assert.doesNotMatch(adrFieldsSource, /MARKDOWN_LINK_RE/);

  const linksSource = read('tools/docs/lib/markdownLinks.ts');
  assert.match(linksSource, /from '\.\/markdownRegex\.js'/);
  assert.doesNotMatch(linksSource, /parseFrontmatter/);
  assert.doesNotMatch(linksSource, /HEADING_RE/);

  const anchorsSource = read('tools/docs/lib/markdownAnchors.ts');
  assert.match(anchorsSource, /from '\.\/markdownRegex\.js'/);
  assert.doesNotMatch(anchorsSource, /parseFrontmatter/);
  assert.doesNotMatch(anchorsSource, /MARKDOWN_LINK_RE/);

  const regexSource = read('tools/docs/lib/markdownRegex.ts');
  assert.doesNotMatch(regexSource, /from '\.\/markdown/);
});
