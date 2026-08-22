/** Owned concern: guard Templates route Monaco preview semantics and documentation closure. */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = path.resolve(__dirname, '../../../../../..');
const WEB_SOURCE_ROOT = path.resolve(__dirname, '../../..');
const APP_ROOT = path.resolve(__dirname, '../..');

type MonacoAuthoritySurface = 'templates-route' | 'templates-preview' | 'canvas-production';

interface MonacoAuthorityFixture {
  label: string;
  surface: MonacoAuthoritySurface;
  modulePath: string;
  source: string;
}

const CANVAS_MONACO_EDITOR_OWNERS = new Set([
  'views/canvas/DbtModelCodeAuthoringSection.tsx',
  'views/canvas/DvtSqlTransformAuthoringSection.tsx',
]);
const TEMPLATES_MONACO_PREVIEW_OWNER = 'views/templates/TemplateMonacoPreviewPanel.tsx';
const MONACO_INTERNAL_AUTHORITIES = [
  'MonacoCodeEditor',
  'MonacoCodeViewer',
  'MonacoDiffViewer',
  'MonacoCodeSurface',
  'MonacoDiffSurface',
  'useMonacoCodeSurface',
] as const;
const MONACO_INTERNAL_AUTHORITY_SOURCE_PATHS = MONACO_INTERNAL_AUTHORITIES.map((authority) =>
  authority === 'useMonacoCodeSurface'
    ? `src/app/components/monaco/${authority}.ts`
    : `src/app/components/monaco/${authority}.tsx`
);
const MONACO_AUTHORITY_SOURCE_SIGNALS = [
  '@monaco-editor/react',
  'monaco-editor',
  'import.meta.glob',
  ...MONACO_INTERNAL_AUTHORITIES,
] as const;
const MONACO_RUNTIME_AUTHORITY_OWNERS = {
  '@monaco-editor/react': new Set([
    'app/components/monaco/MonacoCodeSurface.tsx',
    'app/components/monaco/MonacoDiffSurface.tsx',
    'app/components/monaco/monacoLocalWorkers.ts',
  ]),
  'monaco-editor runtime import': new Set(['app/components/monaco/monacoLocalWorkers.ts']),
  MonacoCodeEditor: new Set([
    ...[...CANVAS_MONACO_EDITOR_OWNERS].map((owner) => `app/${owner}`),
    'app/views/code/CodeWorkspaceFileSurface.tsx',
  ]),
  MonacoCodeViewer: new Set([
    `app/${TEMPLATES_MONACO_PREVIEW_OWNER}`,
    'app/components/inspector/NodePropertySectionView.tsx',
    'app/views/artifacts/ArtifactMonacoPreviewPanel.tsx',
    'app/views/code/CodeWorkspaceFileSurface.tsx',
  ]),
  MonacoDiffViewer: new Set([
    'app/views/diff/CatalogDiffPanel.tsx',
    'app/views/diff/SqlDiffPanel.tsx',
  ]),
  MonacoCodeSurface: new Set(['app/components/monaco/useMonacoCodeSurface.ts']),
  MonacoDiffSurface: new Set(['app/components/monaco/MonacoDiffViewer.tsx']),
  useMonacoCodeSurface: new Set([
    'app/components/monaco/MonacoCodeEditor.tsx',
    'app/components/monaco/MonacoCodeViewer.tsx',
  ]),
} as const;

const ACCEPTED_MONACO_AUTHORITY_FIXTURES: readonly MonacoAuthorityFixture[] = [
  {
    label: 'Templates preview delegates read-only rendering to MonacoCodeViewer',
    surface: 'templates-preview',
    modulePath: 'views/templates/TemplateMonacoPreviewPanel.tsx',
    source: [
      "import { MonacoCodeViewer } from '../../components/monaco/MonacoCodeViewer';",
      'void MonacoCodeViewer;',
    ].join('\n'),
  },
  ...[...CANVAS_MONACO_EDITOR_OWNERS].map((modulePath) => ({
    label: `${modulePath} owns a focused Canvas authoring editor`,
    surface: 'canvas-production' as const,
    modulePath,
    source: [
      "import { MonacoCodeEditor } from '../../components/monaco/MonacoCodeEditor';",
      'void MonacoCodeEditor;',
    ].join('\n'),
  })),
  {
    label: 'Canvas production may consume Monaco compile-time types without runtime authority',
    surface: 'canvas-production',
    modulePath: 'views/canvas/canvasMonacoTypes.ts',
    source: [
      "import type { editor } from 'monaco-editor';",
      "import { type IDisposable } from 'monaco-editor';",
      "export { type IPosition } from 'monaco-editor';",
      "import {} from 'monaco-editor';",
      "export {} from 'monaco-editor';",
      "import { editor as MonacoEditorNamespace } from 'monaco-editor';",
      'type EditorOptions = MonacoEditorNamespace.IEditorOptions;',
    ].join('\n'),
  },
  {
    label: 'Canvas production may consume internal Monaco surface types without hosting them',
    surface: 'canvas-production',
    modulePath: 'views/canvas/canvasMonacoTypes.ts',
    source:
      "import type { MonacoCodeSurfaceProps } from '../../components/monaco/MonacoCodeSurface';",
  },
  {
    label: 'Canvas production may mention a Monaco surface without importing its authority',
    surface: 'canvas-production',
    modulePath: 'views/canvas/canvasAnalytics.ts',
    source: "const analyticsLabel = 'MonacoCodeSurface'; void analyticsLabel;",
  },
  {
    label: 'Canvas production may explicitly exclude Monaco from a broad Vite glob',
    surface: 'canvas-production',
    modulePath: 'views/canvas/canvasAnalytics.ts',
    source: [
      'void import.meta.glob([',
      "  '../../components/**/*.tsx',",
      "  '!../../components/monaco/**',",
      ']);',
    ].join('\n'),
  },
];

const REJECTED_MONACO_AUTHORITY_FIXTURES: readonly (MonacoAuthorityFixture & {
  expectedViolation: string;
})[] = [
  {
    label: 'Templates preview cannot acquire editable Monaco authority',
    surface: 'templates-preview',
    modulePath: 'views/templates/TemplateMonacoPreviewPanel.tsx',
    source: [
      "import { MonacoCodeEditor } from '../../components/monaco/MonacoCodeEditor';",
      'void MonacoCodeEditor;',
    ].join('\n'),
    expectedViolation: 'MonacoCodeEditor',
  },
  {
    label: 'Templates route cannot bypass its preview panel',
    surface: 'templates-route',
    modulePath: 'views/templates/TemplatesRouteWorkbench.tsx',
    source: [
      "import { MonacoCodeViewer } from '../../components/monaco/MonacoCodeViewer';",
      'void MonacoCodeViewer;',
    ].join('\n'),
    expectedViolation: 'MonacoCodeViewer',
  },
  {
    label: 'Canvas shell cannot become an editable Monaco owner',
    surface: 'canvas-production',
    modulePath: 'views/canvas/CanvasShell.tsx',
    source: [
      "import { MonacoCodeEditor } from '../../components/monaco/MonacoCodeEditor';",
      'void MonacoCodeEditor;',
    ].join('\n'),
    expectedViolation: 'MonacoCodeEditor outside a governed Canvas authoring leaf',
  },
  {
    label: 'Canvas authoring cannot bypass the shared lazy Monaco gateway',
    surface: 'canvas-production',
    modulePath: 'views/canvas/DvtSqlTransformAuthoringSection.tsx',
    source: ["import Editor from '@monaco-editor/react';", 'void Editor;'].join('\n'),
    expectedViolation: '@monaco-editor/react',
  },
  {
    label: 'Templates preview cannot import the underlying code surface directly',
    surface: 'templates-preview',
    modulePath: 'views/templates/TemplateMonacoPreviewPanel.tsx',
    source: [
      "import MonacoCodeSurface from '../../components/monaco/MonacoCodeSurface';",
      'void MonacoCodeSurface;',
    ].join('\n'),
    expectedViolation: 'MonacoCodeSurface',
  },
  {
    label: 'Templates preview cannot bypass the viewer through the code-surface loader',
    surface: 'templates-preview',
    modulePath: 'views/templates/TemplateMonacoPreviewPanel.tsx',
    source: [
      "import { useMonacoCodeSurface } from '../../components/monaco/useMonacoCodeSurface';",
      'void useMonacoCodeSurface();',
    ].join('\n'),
    expectedViolation: 'useMonacoCodeSurface',
  },
  {
    label: 'Canvas authoring cannot import the underlying code surface directly',
    surface: 'canvas-production',
    modulePath: 'views/canvas/DvtSqlTransformAuthoringSection.tsx',
    source: [
      "import MonacoCodeSurface from '../../components/monaco/MonacoCodeSurface';",
      'void MonacoCodeSurface;',
    ].join('\n'),
    expectedViolation: 'MonacoCodeSurface',
  },
  {
    label: 'Canvas production cannot import the underlying diff surface directly',
    surface: 'canvas-production',
    modulePath: 'views/canvas/CanvasShell.tsx',
    source: [
      "import MonacoDiffSurface from '../../components/monaco/MonacoDiffSurface';",
      'void MonacoDiffSurface;',
    ].join('\n'),
    expectedViolation: 'MonacoDiffSurface',
  },
  {
    label: 'Templates route cannot dynamically import an internal Monaco surface',
    surface: 'templates-route',
    modulePath: 'views/templates/TemplatesRouteWorkbench.tsx',
    source: "void import('../../components/monaco/MonacoCodeSurface');",
    expectedViolation: 'MonacoCodeSurface',
  },
  {
    label: 'Templates route cannot re-export an internal Monaco surface',
    surface: 'templates-route',
    modulePath: 'views/templates/TemplatesRouteWorkbench.tsx',
    source:
      "export { default as MonacoCodeSurface } from '../../components/monaco/MonacoCodeSurface';",
    expectedViolation: 'MonacoCodeSurface',
  },
  {
    label: 'Canvas production cannot require an internal Monaco surface',
    surface: 'canvas-production',
    modulePath: 'views/canvas/CanvasShell.tsx',
    source: "void require('../../components/monaco/MonacoDiffSurface');",
    expectedViolation: 'MonacoDiffSurface',
  },
  {
    label: 'Templates route cannot eagerly load a Monaco surface through a Vite glob',
    surface: 'templates-route',
    modulePath: 'views/templates/TemplatesRouteWorkbench.tsx',
    source:
      "void import.meta.glob('../../components/monaco/MonacoCodeSurface.tsx', { eager: true });",
    expectedViolation: 'MonacoCodeSurface',
  },
  {
    label: 'Canvas production cannot load Monaco surfaces through the legacy Vite glob helper',
    surface: 'canvas-production',
    modulePath: 'views/canvas/CanvasShell.tsx',
    source: "void import.meta.globEager('../../components/monaco/*.tsx');",
    expectedViolation: 'MonacoCodeSurface',
  },
  {
    label: 'Templates route cannot hide a Monaco Vite glob behind a static base option',
    surface: 'templates-route',
    modulePath: 'views/templates/TemplatesRouteWorkbench.tsx',
    source: [
      "void import.meta.glob('./*.tsx', {",
      "  base: '../../components/monaco',",
      '  eager: true,',
      '});',
    ].join('\n'),
    expectedViolation: 'MonacoCodeSurface',
  },
  {
    label: 'Templates route cannot reach Monaco through a broad parent-directory glob',
    surface: 'templates-route',
    modulePath: 'views/templates/TemplatesRouteWorkbench.tsx',
    source: "void import.meta.glob('../../components/**/*.tsx', { eager: true });",
    expectedViolation: 'MonacoCodeSurface',
  },
  {
    label: 'Canvas route cannot acquire raw Monaco runtime authority',
    surface: 'canvas-production',
    modulePath: 'views/Canvas.tsx',
    source: [
      "import { editor } from 'monaco-editor';",
      "editor.create(document.body, { value: '' });",
    ].join('\n'),
    expectedViolation: 'monaco-editor runtime import',
  },
];

const REJECTED_REPOSITORY_MONACO_OWNER_FIXTURES = [
  {
    label: 'An external wrapper cannot become an editable Monaco gateway',
    modulePath: 'app/components/EditableCodePanel.tsx',
    source: [
      "import { MonacoCodeEditor } from './monaco/MonacoCodeEditor';",
      'export const EditableCodePanel = MonacoCodeEditor;',
    ].join('\n'),
    expectedViolation: 'MonacoCodeEditor outside a governed owner',
  },
  {
    label: 'An external wrapper cannot import the raw Monaco React package',
    modulePath: 'app/components/RawMonacoPanel.tsx',
    source: ["import Editor from '@monaco-editor/react';", 'void Editor;'].join('\n'),
    expectedViolation: '@monaco-editor/react outside a governed owner',
  },
  {
    label: 'A capability cannot hide a Monaco surface behind a Vite glob wrapper',
    modulePath: 'capabilities/runtime-capabilities/presentation/MonacoCapabilityPanel.tsx',
    source:
      "export const panels = import.meta.glob('../../../app/components/monaco/MonacoCodeSurface.tsx', { eager: true });",
    expectedViolation: 'MonacoCodeSurface outside a governed owner',
  },
  {
    label: 'A capability cannot relocate a Monaco Vite glob through its base option',
    modulePath: 'capabilities/runtime-capabilities/presentation/MonacoCapabilityPanel.tsx',
    source: [
      "export const panels = import.meta.glob(['./*.tsx'], {",
      "  base: '../../../app/components/monaco',",
      '  eager: true,',
      '});',
    ].join('\n'),
    expectedViolation: 'MonacoCodeSurface outside a governed owner',
  },
  {
    label: 'A capability cannot reach Monaco through a broad source-root glob',
    modulePath: 'capabilities/runtime-capabilities/presentation/MonacoCapabilityPanel.tsx',
    source: "export const panels = import.meta.glob('../../../app/components/**/*.tsx');",
    expectedViolation: 'MonacoCodeSurface outside a governed owner',
  },
] as const;

function readAppSource(relativePath: string): string {
  return readFileSync(path.join(APP_ROOT, relativePath), 'utf8');
}

function readRepoDoc(relativePath: string): string {
  return readFileSync(path.join(REPO_ROOT, relativePath), 'utf8');
}

function collectProductionSourceFiles(root: string): string[] {
  return readdirSync(root).flatMap((entry) => {
    const fullPath = path.join(root, entry);
    if (statSync(fullPath).isDirectory()) {
      return collectProductionSourceFiles(fullPath);
    }

    if (!isProductionSourceFileName(entry)) {
      return [];
    }

    return [fullPath];
  });
}

function isProductionSourceFileName(fileName: string): boolean {
  return /\.(?:ts|tsx)$/.test(fileName) && !/\.(?:test|spec)\./.test(fileName);
}

function emitWebModuleSource(source: string): string {
  return ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      verbatimModuleSyntax: false,
    },
  }).outputText;
}

function resolveWebPackageModulePath(modulePath: string): string {
  const normalizedModulePath = modulePath.replaceAll('\\', '/');
  return normalizedModulePath.startsWith('app/') ||
    normalizedModulePath.startsWith('capabilities/') ||
    normalizedModulePath.startsWith('testing/') ||
    !normalizedModulePath.includes('/')
    ? `src/${normalizedModulePath}`
    : `src/app/${normalizedModulePath}`;
}

function resolveViteGlobPattern(
  modulePath: string,
  globPattern: string,
  base: string | undefined
): string {
  const negated = globPattern.startsWith('!');
  const pattern = (negated ? globPattern.slice(1) : globPattern).replaceAll('\\', '/');
  const importerDirectory = path.posix.dirname(resolveWebPackageModulePath(modulePath));
  const baseDirectory = base
    ? base.startsWith('/')
      ? base.slice(1)
      : path.posix.join(importerDirectory, base)
    : importerDirectory;
  const resolvedPattern = pattern.startsWith('/')
    ? pattern.slice(1)
    : path.posix.join(baseDirectory, pattern);

  return `${negated ? '!' : ''}${path.posix.normalize(resolvedPattern)}`;
}

function collectRuntimeModuleSpecifiers(
  emittedSource: string,
  modulePath: string
): ReadonlySet<string> {
  const sourceFile = ts.createSourceFile(
    'monaco-authority-emitted.js',
    emittedSource,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS
  );
  const runtimeModuleSpecifiers = new Set<string>();

  function addSpecifier(node: ts.Expression): void {
    if (ts.isStringLiteralLike(node)) {
      runtimeModuleSpecifiers.add(node.text);
      return;
    }

    if (ts.isArrayLiteralExpression(node)) {
      for (const element of node.elements) {
        if (ts.isStringLiteralLike(element)) runtimeModuleSpecifiers.add(element.text);
      }
    }
  }

  function isViteGlobCall(node: ts.CallExpression): boolean {
    if (!ts.isPropertyAccessExpression(node.expression)) return false;
    if (node.expression.name.text !== 'glob' && node.expression.name.text !== 'globEager') {
      return false;
    }

    const receiver = node.expression.expression;
    return (
      ts.isMetaProperty(receiver) &&
      receiver.keywordToken === ts.SyntaxKind.ImportKeyword &&
      receiver.name.text === 'meta'
    );
  }

  function readStaticViteGlobBase(node: ts.CallExpression): string | undefined {
    const options = node.arguments[1];
    if (!options || !ts.isObjectLiteralExpression(options)) return undefined;

    for (const property of options.properties) {
      if (!ts.isPropertyAssignment(property)) continue;

      const propertyName = property.name;
      const isBaseProperty =
        (ts.isIdentifier(propertyName) && propertyName.text === 'base') ||
        (ts.isStringLiteralLike(propertyName) && propertyName.text === 'base');
      if (isBaseProperty && ts.isStringLiteralLike(property.initializer)) {
        return property.initializer.text;
      }
    }

    return undefined;
  }

  function addViteGlobSpecifiers(node: ts.CallExpression): void {
    const patterns: string[] = [];
    const pattern = node.arguments[0];
    if (pattern) {
      if (ts.isStringLiteralLike(pattern)) patterns.push(pattern.text);
      if (ts.isArrayLiteralExpression(pattern)) {
        for (const element of pattern.elements) {
          if (ts.isStringLiteralLike(element)) patterns.push(element.text);
        }
      }
    }

    const base = readStaticViteGlobBase(node)?.replaceAll('\\', '/');
    const resolvedPatterns = patterns.map((globPattern) =>
      resolveViteGlobPattern(modulePath, globPattern, base)
    );
    const positivePatterns = resolvedPatterns.filter((globPattern) => !globPattern.startsWith('!'));
    const negativePatterns = resolvedPatterns
      .filter((globPattern) => globPattern.startsWith('!'))
      .map((globPattern) => globPattern.slice(1));

    for (const authorityPath of MONACO_INTERNAL_AUTHORITY_SOURCE_PATHS) {
      const matchesPositivePattern = positivePatterns.some((globPattern) =>
        path.matchesGlob(authorityPath, globPattern)
      );
      const matchesNegativePattern = negativePatterns.some((globPattern) =>
        path.matchesGlob(authorityPath, globPattern)
      );
      if (matchesPositivePattern && !matchesNegativePattern) {
        runtimeModuleSpecifiers.add(authorityPath);
      }
    }
  }

  function visit(node: ts.Node): void {
    if (ts.isImportDeclaration(node)) {
      addSpecifier(node.moduleSpecifier);
      return;
    }

    if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
      addSpecifier(node.moduleSpecifier);
      return;
    }

    if (ts.isCallExpression(node) && node.arguments[0]) {
      if (isViteGlobCall(node)) {
        addViteGlobSpecifiers(node);
        return;
      }

      if (
        node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === 'require')
      ) {
        addSpecifier(node.arguments[0]);
        return;
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return runtimeModuleSpecifiers;
}

const RUNTIME_MODULE_SPECIFIER_CACHE = new Map<string, ReadonlySet<string>>();

function getRuntimeModuleSpecifiers(modulePath: string, source: string): ReadonlySet<string> {
  const cacheKey = `${modulePath}\0${source}`;
  const cachedSpecifiers = RUNTIME_MODULE_SPECIFIER_CACHE.get(cacheKey);
  if (cachedSpecifiers) return cachedSpecifiers;

  const runtimeModuleSpecifiers = collectRuntimeModuleSpecifiers(
    emitWebModuleSource(source),
    modulePath
  );
  RUNTIME_MODULE_SPECIFIER_CACHE.set(cacheKey, runtimeModuleSpecifiers);
  return runtimeModuleSpecifiers;
}

function containsPackageSpecifier(specifiers: ReadonlySet<string>, packageName: string): boolean {
  return [...specifiers].some(
    (specifier) => specifier === packageName || specifier.startsWith(`${packageName}/`)
  );
}

function containsInternalAuthoritySpecifier(
  specifiers: ReadonlySet<string>,
  authority: (typeof MONACO_INTERNAL_AUTHORITIES)[number]
): boolean {
  return [...specifiers].some((specifier) => {
    const normalizedSpecifier = specifier.replaceAll('\\', '/');
    const moduleName = normalizedSpecifier.split('/').at(-1);
    return moduleName?.replace(/\.[cm]?[jt]sx?$/, '') === authority;
  });
}

function collectMonacoAuthorityViolations({
  surface,
  modulePath,
  source,
}: Omit<MonacoAuthorityFixture, 'label'>): string[] {
  const violations: string[] = [];
  if (!MONACO_AUTHORITY_SOURCE_SIGNALS.some((signal) => source.includes(signal))) {
    return violations;
  }

  const runtimeModuleSpecifiers = getRuntimeModuleSpecifiers(modulePath, source);

  if (containsPackageSpecifier(runtimeModuleSpecifiers, '@monaco-editor/react')) {
    violations.push('@monaco-editor/react');
  }

  if (containsPackageSpecifier(runtimeModuleSpecifiers, 'monaco-editor')) {
    violations.push('monaco-editor runtime import');
  }

  if (surface === 'templates-route') {
    for (const gateway of MONACO_INTERNAL_AUTHORITIES) {
      if (containsInternalAuthoritySpecifier(runtimeModuleSpecifiers, gateway)) {
        violations.push(gateway);
      }
    }
  }

  if (surface === 'templates-preview') {
    for (const gateway of [
      'MonacoCodeEditor',
      'MonacoDiffViewer',
      'MonacoCodeSurface',
      'MonacoDiffSurface',
      'useMonacoCodeSurface',
    ] as const) {
      if (containsInternalAuthoritySpecifier(runtimeModuleSpecifiers, gateway)) {
        violations.push(gateway);
      }
    }
  }

  if (surface === 'canvas-production') {
    for (const gateway of [
      'MonacoCodeViewer',
      'MonacoDiffViewer',
      'MonacoCodeSurface',
      'MonacoDiffSurface',
      'useMonacoCodeSurface',
    ] as const) {
      if (containsInternalAuthoritySpecifier(runtimeModuleSpecifiers, gateway)) {
        violations.push(gateway);
      }
    }

    if (
      containsInternalAuthoritySpecifier(runtimeModuleSpecifiers, 'MonacoCodeEditor') &&
      !CANVAS_MONACO_EDITOR_OWNERS.has(modulePath)
    ) {
      violations.push('MonacoCodeEditor outside a governed Canvas authoring leaf');
    }
  }

  return violations;
}

function collectRepositoryMonacoOwnerViolations({
  modulePath,
  source,
}: Pick<MonacoAuthorityFixture, 'modulePath' | 'source'>): string[] {
  const violations: string[] = [];
  if (!MONACO_AUTHORITY_SOURCE_SIGNALS.some((signal) => source.includes(signal))) {
    return violations;
  }

  const runtimeModuleSpecifiers = getRuntimeModuleSpecifiers(modulePath, source);
  for (const [authority, owners] of Object.entries(MONACO_RUNTIME_AUTHORITY_OWNERS)) {
    const importsAuthority =
      authority === '@monaco-editor/react' || authority === 'monaco-editor runtime import'
        ? containsPackageSpecifier(
            runtimeModuleSpecifiers,
            authority === '@monaco-editor/react' ? authority : 'monaco-editor'
          )
        : containsInternalAuthoritySpecifier(
            runtimeModuleSpecifiers,
            authority as (typeof MONACO_INTERNAL_AUTHORITIES)[number]
          );

    if (importsAuthority && !owners.has(modulePath)) {
      violations.push(`${authority} outside a governed owner`);
    }
  }

  return violations;
}

function resolveTemplatesMonacoAuthoritySurface(modulePath: string): MonacoAuthoritySurface {
  return modulePath === TEMPLATES_MONACO_PREVIEW_OWNER ? 'templates-preview' : 'templates-route';
}

describe('Templates Monaco preview architecture', () => {
  it('excludes every Web Vitest suffix from production owner discovery', () => {
    expect(isProductionSourceFileName('MonacoCodeSurface.test.tsx')).toBe(false);
    expect(isProductionSourceFileName('MonacoCodeSurface.spec.tsx')).toBe(false);
    expect(isProductionSourceFileName('monacoAuthority.architecture.test.ts')).toBe(false);
    expect(isProductionSourceFileName('MonacoCodeSurface.tsx')).toBe(true);
  });

  it('distinguishes accepted and rejected Templates and Canvas Monaco authority fixtures', () => {
    for (const fixture of ACCEPTED_MONACO_AUTHORITY_FIXTURES) {
      expect(collectMonacoAuthorityViolations(fixture), fixture.label).toEqual([]);
    }

    for (const fixture of REJECTED_MONACO_AUTHORITY_FIXTURES) {
      expect(collectMonacoAuthorityViolations(fixture), fixture.label).toContain(
        fixture.expectedViolation
      );
    }

    for (const fixture of REJECTED_REPOSITORY_MONACO_OWNER_FIXTURES) {
      expect(collectRepositoryMonacoOwnerViolations(fixture), fixture.label).toContain(
        fixture.expectedViolation
      );
    }
  });

  it('documents API, invariants, transitions, consumers, stories, and Fowler analysis', () => {
    const componentGuide = readRepoDoc(
      'docs/architecture/components/web/templates/execution-template-monaco-preview-component.md'
    );
    const userStories = readRepoDoc(
      'docs/architecture/components/web/templates/execution-template-monaco-preview-user-stories.md'
    );
    const implementationPlan = readRepoDoc(
      'docs/planning/proposals/mandatory/frontend-and-ux/f17d-templates-monaco-preview-plan-20260522.md'
    );

    for (const requiredSection of [
      '## Public API',
      '## Invariants',
      '## Transitions',
      '## Consumers',
      '## Component Diagram',
      '```mermaid',
      'TemplateMonacoPreviewPanel',
      'MonacoCodeViewer',
      'MonacoCodeSurface',
      'ExecutionTemplatePreviewProjection',
      'read-only',
      'GenerateExecutionTemplatePreview',
    ]) {
      expect(componentGuide).toContain(requiredSection);
    }

    for (const requiredStory of [
      'US-F17D-001',
      'US-F17D-002',
      'US-F17D-003',
      'US-F17D-004',
      'US-F17D-005',
      '## Scenario Matrix',
      'read-only',
    ]) {
      expect(userStories).toContain(requiredStory);
    }

    for (const requiredPlanSignal of [
      '## Fowler Opportunity Matrix',
      'fowlerSignals:',
      'Documentation drift',
      'Hidden authority',
      'Semantic Fitness Function',
    ]) {
      expect(implementationPlan).toContain(requiredPlanSignal);
    }

    expect(implementationPlan).toContain('featureId: F17D-TEMPLATES-MONACO-PREVIEW-20260522');
    expect(implementationPlan).toContain('templatesMonacoPreview.architecture.test.ts');
  });

  it('keeps Monaco as a lazy read-only Templates preview panel instead of route, shell, or Canvas authority', () => {
    const templatesView = readAppSource('views/TemplatesView.tsx');
    const workbench = readAppSource('views/templates/TemplatesRouteWorkbench.tsx');
    const previewPanelPath = path.join(APP_ROOT, 'views/templates/TemplateMonacoPreviewPanel.tsx');
    expect(existsSync(previewPanelPath)).toBe(true);
    const previewPanel = readFileSync(previewPanelPath, 'utf8');
    const monacoViewer = readAppSource('components/monaco/MonacoCodeViewer.tsx');
    const monacoLoader = readAppSource('components/monaco/useMonacoCodeSurface.ts');
    const monacoSurface = readAppSource('components/monaco/MonacoCodeSurface.tsx');
    const monacoVisualTokens = readAppSource('components/monaco/monacoVisualTokens.ts');

    for (const [modulePath, source] of [
      ['views/TemplatesView.tsx', templatesView],
      ['views/templates/TemplatesRouteWorkbench.tsx', workbench],
      ['views/templates/TemplateMonacoPreviewPanel.tsx', previewPanel],
      ['components/monaco/MonacoCodeViewer.tsx', monacoViewer],
      ['components/monaco/useMonacoCodeSurface.ts', monacoLoader],
      ['components/monaco/MonacoCodeSurface.tsx', monacoSurface],
    ] as const) {
      expect(source.trimStart().startsWith('/** Owned concern:'), modulePath).toBe(true);
    }

    expect(templatesView).toContain('RouteWorkbenchFrame');
    expect(
      collectMonacoAuthorityViolations({
        surface: 'templates-route',
        modulePath: 'views/TemplatesView.tsx',
        source: templatesView,
      })
    ).toEqual([]);

    expect(workbench).toContain('TemplateMonacoPreviewPanel');
    expect(
      collectMonacoAuthorityViolations({
        surface: 'templates-route',
        modulePath: 'views/templates/TemplatesRouteWorkbench.tsx',
        source: workbench,
      })
    ).toEqual([]);
    expect(workbench).not.toContain('<pre');
    expect(workbench).toContain('templates-validation-state');

    expect(previewPanel).toContain('MonacoCodeViewer');
    expect(previewPanel).toContain('language={language}');
    expect(previewPanel).toContain('path={exportFileName}');
    expect(previewPanel).not.toContain('onChange');
    expect(previewPanel).not.toMatch(/\b(save|apply|dispatch|persist)\b/i);
    expect(
      collectMonacoAuthorityViolations({
        surface: 'templates-preview',
        modulePath: 'views/templates/TemplateMonacoPreviewPanel.tsx',
        source: previewPanel,
      })
    ).toEqual([]);

    expect(monacoViewer).toContain('useMonacoCodeSurface()');
    expect(monacoViewer).toContain('readOnly={true}');
    expect(monacoLoader).toContain("import('./MonacoCodeSurface')");
    expect(monacoLoader).toContain('active = false');
    expect(monacoSurface).toContain('<Editor');
    expect(monacoSurface).toContain('createMonacoCodeOptions({ ariaLabel, readOnly: isReadOnly })');
    expect(monacoVisualTokens).toContain('readOnly,');
    expect(monacoVisualTokens).toContain('domReadOnly: readOnly');

    expect(
      collectMonacoAuthorityViolations({
        surface: 'canvas-production',
        modulePath: 'views/Canvas.tsx',
        source: readAppSource('views/Canvas.tsx'),
      })
    ).toEqual([]);

    for (const templatesModule of collectProductionSourceFiles(
      path.join(APP_ROOT, 'views/templates')
    )) {
      const source = readFileSync(templatesModule, 'utf8');
      const modulePath = path.relative(APP_ROOT, templatesModule).replaceAll('\\', '/');
      expect(
        collectMonacoAuthorityViolations({
          surface: resolveTemplatesMonacoAuthoritySurface(modulePath),
          modulePath,
          source,
        }),
        modulePath
      ).toEqual([]);
    }

    for (const canvasModule of collectProductionSourceFiles(path.join(APP_ROOT, 'views/canvas'))) {
      const source = readFileSync(canvasModule, 'utf8');
      const modulePath = path.relative(APP_ROOT, canvasModule).replaceAll('\\', '/');
      expect(
        collectMonacoAuthorityViolations({ surface: 'canvas-production', modulePath, source }),
        modulePath
      ).toEqual([]);
    }

    for (const sourceModule of collectProductionSourceFiles(WEB_SOURCE_ROOT)) {
      const modulePath = path.relative(WEB_SOURCE_ROOT, sourceModule).replaceAll('\\', '/');
      if (/(^|\/)test(ing)?\//.test(modulePath)) continue;

      expect(
        collectRepositoryMonacoOwnerViolations({
          modulePath,
          source: readFileSync(sourceModule, 'utf8'),
        }),
        modulePath
      ).toEqual([]);
    }
  });
});
