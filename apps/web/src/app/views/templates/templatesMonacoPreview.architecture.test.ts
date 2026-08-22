/** Owned concern: guard Templates route Monaco preview semantics and documentation closure. */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

import picomatch from 'picomatch';
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

interface RuntimeModuleAccess {
  specifiers: ReadonlySet<string>;
  reExportedSpecifiers: ReadonlySet<string>;
}

const CANVAS_MONACO_EDITOR_OWNERS = new Set([
  'views/canvas/DbtModelCodeAuthoringSection.tsx',
  'views/canvas/DvtSqlTransformAuthoringSection.tsx',
]);
const CANVAS_EDITABLE_MONACO_LEAVES = [
  'DbtModelCodeAuthoringSection',
  'DvtSqlTransformAuthoringSection',
] as const;
const CANVAS_WORKSPACE_FILE_CODE_CONTRIBUTION_AUTHORITIES = [
  'dbtWorkspaceFileCodeContribution',
  'graphDraftWorkspaceFileCodeContribution',
] as const;
const TEMPLATES_MONACO_PREVIEW_OWNER = 'views/templates/TemplateMonacoPreviewPanel.tsx';
const MONACO_INTERNAL_AUTHORITIES = [
  'MonacoCodeEditor',
  'MonacoCodeViewer',
  'MonacoDiffViewer',
  'MonacoCodeSurface',
  'MonacoDiffSurface',
  'useMonacoCodeSurface',
  'CodeWorkspaceFileSurface',
  'WorkspaceFileCodeEditor',
  ...CANVAS_WORKSPACE_FILE_CODE_CONTRIBUTION_AUTHORITIES,
  ...CANVAS_EDITABLE_MONACO_LEAVES,
] as const;
const MONACO_INTERNAL_AUTHORITY_SOURCE_PATHS = MONACO_INTERNAL_AUTHORITIES.map((authority) =>
  CANVAS_EDITABLE_MONACO_LEAVES.includes(
    authority as (typeof CANVAS_EDITABLE_MONACO_LEAVES)[number]
  )
    ? `src/app/views/canvas/${authority}.tsx`
    : CANVAS_WORKSPACE_FILE_CODE_CONTRIBUTION_AUTHORITIES.includes(
          authority as (typeof CANVAS_WORKSPACE_FILE_CODE_CONTRIBUTION_AUTHORITIES)[number]
        )
      ? `src/app/views/canvas/${authority}.tsx`
      : authority === 'CodeWorkspaceFileSurface' || authority === 'WorkspaceFileCodeEditor'
        ? `src/app/views/code/${authority}.tsx`
        : authority === 'useMonacoCodeSurface'
          ? `src/app/components/monaco/${authority}.ts`
          : `src/app/components/monaco/${authority}.tsx`
);
const MONACO_AUTHORITY_SOURCE_SIGNALS = [
  '@monaco-editor/react',
  'monaco-editor',
  'import.meta.glob',
  ...MONACO_INTERNAL_AUTHORITIES,
] as const;
const WEB_VITE_ALIAS_ROOTS = new Map([['@', 'src']]);
const CANVAS_COMPONENT_PUBLIC_CONSUMERS = {
  CanvasWorkspaceMenuControls: new Set([
    'app/components/TopAppBar.tsx',
    'app/components/shell/ShellMenu.tsx',
  ]),
} as const;
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
  CodeWorkspaceFileSurface: new Set(['app/views/code/WorkspaceFileCodeEditor.tsx']),
  WorkspaceFileCodeEditor: new Set([
    'app/views/CodeView.tsx',
    'app/views/canvas/dbtWorkspaceFileCodeContribution.tsx',
    'app/views/canvas/graphDraftWorkspaceFileCodeContribution.tsx',
  ]),
  dbtWorkspaceFileCodeContribution: new Set(['app/views/canvas/DbtProjectFileCanvasView.tsx']),
  graphDraftWorkspaceFileCodeContribution: new Set(['app/views/canvas/CanvasShell.tsx']),
  DbtModelCodeAuthoringSection: new Set(['app/views/canvas/DbtAuthoringFields.tsx']),
  DvtSqlTransformAuthoringSection: new Set(['app/views/canvas/DvtAuthoringFields.tsx']),
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
    label: 'Templates may consume erased Canvas authoring types without runtime authority',
    surface: 'templates-route',
    modulePath: 'views/templates/templateCanvasTypes.ts',
    source: "import type { DbtAuthoringFieldsProps } from '../canvas/DbtAuthoringFields';",
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
  {
    label: 'Canvas production may exclude Monaco from a source-alias Vite glob',
    surface: 'canvas-production',
    modulePath: 'views/canvas/canvasAnalytics.ts',
    source: [
      'void import.meta.glob([',
      "  '@/app/components/**/*.tsx',",
      "  '!@/app/components/monaco/**',",
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
    label: 'Templates route cannot dynamically import a variable Monaco surface',
    surface: 'templates-route',
    modulePath: 'views/templates/TemplatesRouteWorkbench.tsx',
    source: [
      "const surface = 'MonacoCodeSurface';",
      'void import(`../../components/monaco/${surface}.tsx`);',
    ].join('\n'),
    expectedViolation: 'MonacoCodeSurface',
  },
  {
    label: 'Templates route cannot acquire a parent Canvas authoring surface',
    surface: 'templates-route',
    modulePath: 'views/templates/TemplatesRouteWorkbench.tsx',
    source: [
      "import { DbtAuthoringFields } from '../canvas/DbtAuthoringFields';",
      'void DbtAuthoringFields;',
    ].join('\n'),
    expectedViolation: 'Canvas authoring context',
  },
  {
    label: 'Templates route cannot acquire the editable workspace-file wrapper',
    surface: 'templates-route',
    modulePath: 'views/templates/TemplatesRouteWorkbench.tsx',
    source: [
      "import { WorkspaceFileCodeEditor } from '../code/WorkspaceFileCodeEditor';",
      'void WorkspaceFileCodeEditor;',
    ].join('\n'),
    expectedViolation: 'WorkspaceFileCodeEditor',
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
  {
    label: 'A capability cannot reach Monaco through the configured source alias',
    modulePath: 'capabilities/runtime-capabilities/presentation/MonacoCapabilityPanel.tsx',
    source: "export const panels = import.meta.glob('@/app/components/monaco/*.tsx');",
    expectedViolation: 'MonacoCodeSurface outside a governed owner',
  },
  {
    label: 'A capability cannot concatenate a variable Monaco dynamic import',
    modulePath: 'capabilities/runtime-capabilities/presentation/MonacoCapabilityPanel.tsx',
    source: [
      "const surface = 'MonacoCodeSurface';",
      "void import('../../../app/components/monaco/' + surface + '.tsx');",
    ].join('\n'),
    expectedViolation: 'MonacoCodeSurface outside a governed owner',
  },
  {
    label: 'Templates cannot import an allowlisted Canvas editable leaf',
    modulePath: 'app/views/templates/TemplatesRouteWorkbench.tsx',
    source: [
      "import { DbtModelCodeAuthoringSection } from '../canvas/DbtModelCodeAuthoringSection';",
      'void DbtModelCodeAuthoringSection;',
    ].join('\n'),
    expectedViolation: 'DbtModelCodeAuthoringSection outside a governed owner',
  },
  {
    label: 'An external wrapper cannot acquire a Canvas authoring parent',
    modulePath: 'app/components/CanvasAuthoringWrapper.tsx',
    source: [
      "import { DbtAuthoringFields } from '../views/canvas/DbtAuthoringFields';",
      'export const CanvasAuthoringWrapper = DbtAuthoringFields;',
    ].join('\n'),
    expectedViolation: 'DbtAuthoringFields outside the Canvas bounded context',
  },
  {
    label: 'A governed viewer cannot re-export its underlying Monaco loader',
    modulePath: 'app/components/monaco/MonacoCodeViewer.tsx',
    source: "export { useMonacoCodeSurface } from './useMonacoCodeSurface';",
    expectedViolation: 'useMonacoCodeSurface re-exported',
  },
  {
    label: 'A governed editor consumer cannot leak an imported editor binding',
    modulePath: 'app/views/code/CodeWorkspaceFileSurface.tsx',
    source: [
      "import { MonacoCodeEditor as InternalEditor } from '../../components/monaco/MonacoCodeEditor';",
      'export { InternalEditor as EditableSurface };',
    ].join('\n'),
    expectedViolation: 'MonacoCodeEditor re-exported',
  },
  {
    label: 'A governed editor consumer cannot leak an aliased editor binding',
    modulePath: 'app/views/code/CodeWorkspaceFileSurface.tsx',
    source: [
      "import { MonacoCodeEditor as InternalEditor } from '../../components/monaco/MonacoCodeEditor';",
      'const LeakedEditor = InternalEditor;',
      'export { LeakedEditor };',
    ].join('\n'),
    expectedViolation: 'MonacoCodeEditor re-exported',
  },
  {
    label: 'A governed viewer cannot hide its loader inside an exported callback',
    modulePath: 'app/components/monaco/MonacoCodeViewer.tsx',
    source: [
      "import { useMonacoCodeSurface } from './useMonacoCodeSurface';",
      'export const internals = { load: () => useMonacoCodeSurface };',
    ].join('\n'),
    expectedViolation: 'useMonacoCodeSurface re-exported',
  },
  {
    label: 'Templates cannot acquire the editable workspace-file wrapper',
    modulePath: 'app/views/templates/TemplatesRouteWorkbench.tsx',
    source: [
      "import { WorkspaceFileCodeEditor } from '../code/WorkspaceFileCodeEditor';",
      'void WorkspaceFileCodeEditor;',
    ].join('\n'),
    expectedViolation: 'WorkspaceFileCodeEditor outside a governed owner',
  },
  {
    label: 'An external wrapper cannot acquire the editable dbt Canvas contribution factory',
    modulePath: 'app/components/DbtCodeContributionWrapper.tsx',
    source: [
      "import { buildDbtWorkspaceFileCodeContributions } from '../views/canvas/dbtWorkspaceFileCodeContribution';",
      'export const buildCodeContributions = buildDbtWorkspaceFileCodeContributions;',
    ].join('\n'),
    expectedViolation: 'dbtWorkspaceFileCodeContribution outside a governed owner',
  },
  {
    label: 'An external wrapper cannot acquire the graph-draft Canvas contribution factory',
    modulePath: 'app/components/GraphDraftCodeContributionWrapper.tsx',
    source: [
      "import { buildGraphDraftWorkspaceFileCodeContributions } from '../views/canvas/graphDraftWorkspaceFileCodeContribution';",
      'export const buildCodeContributions = buildGraphDraftWorkspaceFileCodeContributions;',
    ].join('\n'),
    expectedViolation: 'graphDraftWorkspaceFileCodeContribution outside a governed owner',
  },
  {
    label: 'A governed editor consumer cannot return its editor from an exported function',
    modulePath: 'app/views/code/CodeWorkspaceFileSurface.tsx',
    source: [
      "import { MonacoCodeEditor } from '../../components/monaco/MonacoCodeEditor';",
      'export function getEditor() { return MonacoCodeEditor; }',
    ].join('\n'),
    expectedViolation: 'MonacoCodeEditor re-exported',
  },
  {
    label: 'A governed editor consumer cannot expose its editor through an exported class',
    modulePath: 'app/views/code/CodeWorkspaceFileSurface.tsx',
    source: [
      "import { MonacoCodeEditor } from '../../components/monaco/MonacoCodeEditor';",
      'export class EditorRegistry { getEditor() { return MonacoCodeEditor; } }',
    ].join('\n'),
    expectedViolation: 'MonacoCodeEditor re-exported',
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

function resolveWebViteAlias(modulePath: string): string | undefined {
  const normalizedModulePath = modulePath.replaceAll('\\', '/');
  for (const [alias, root] of WEB_VITE_ALIAS_ROOTS) {
    if (normalizedModulePath === alias) return root;
    if (normalizedModulePath.startsWith(`${alias}/`)) {
      return path.posix.join(root, normalizedModulePath.slice(alias.length + 1));
    }
  }
  return undefined;
}

function resolveViteGlobPattern(
  modulePath: string,
  globPattern: string,
  base: string | undefined
): string {
  const negated = globPattern.startsWith('!');
  const pattern = (negated ? globPattern.slice(1) : globPattern).replaceAll('\\', '/');
  const importerDirectory = path.posix.dirname(resolveWebPackageModulePath(modulePath));
  const aliasedBase = base ? resolveWebViteAlias(base) : undefined;
  const baseDirectory = aliasedBase
    ? aliasedBase
    : base
      ? base.startsWith('/')
        ? base.slice(1)
        : path.posix.join(importerDirectory, base)
      : importerDirectory;
  const aliasedPattern = resolveWebViteAlias(pattern);
  const resolvedPattern = aliasedPattern
    ? aliasedPattern
    : pattern.startsWith('/')
      ? pattern.slice(1)
      : path.posix.join(baseDirectory, pattern);

  return `${negated ? '!' : ''}${path.posix.normalize(resolvedPattern)}`;
}

function collectRuntimeModuleSpecifiers(
  emittedSource: string,
  modulePath: string
): RuntimeModuleAccess {
  const sourceFile = ts.createSourceFile(
    'monaco-authority-emitted.js',
    emittedSource,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS
  );
  const runtimeModuleSpecifiers = new Set<string>();
  const runtimeReExportedSpecifiers = new Set<string>();
  const runtimeImportedBindings = new Map<string, string>();

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

  function addImportedBindings(node: ts.ImportDeclaration): void {
    if (!ts.isStringLiteralLike(node.moduleSpecifier) || !node.importClause) return;

    const moduleSpecifier = node.moduleSpecifier.text;
    if (node.importClause.name) {
      runtimeImportedBindings.set(node.importClause.name.text, moduleSpecifier);
    }

    const namedBindings = node.importClause.namedBindings;
    if (namedBindings && ts.isNamespaceImport(namedBindings)) {
      runtimeImportedBindings.set(namedBindings.name.text, moduleSpecifier);
    }
    if (namedBindings && ts.isNamedImports(namedBindings)) {
      for (const element of namedBindings.elements) {
        runtimeImportedBindings.set(element.name.text, moduleSpecifier);
      }
    }
  }

  function addAliasedBindingNames(name: ts.BindingName, moduleSpecifier: string): void {
    if (ts.isIdentifier(name)) {
      runtimeImportedBindings.set(name.text, moduleSpecifier);
      return;
    }

    for (const element of name.elements) {
      if (!ts.isOmittedExpression(element)) {
        addAliasedBindingNames(element.name, moduleSpecifier);
      }
    }
  }

  function getImportedSpecifier(node: ts.Expression): string | undefined {
    if (ts.isIdentifier(node)) return runtimeImportedBindings.get(node.text);
    if (ts.isParenthesizedExpression(node)) return getImportedSpecifier(node.expression);
    if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
      return getImportedSpecifier(node.expression);
    }
    return undefined;
  }

  function addReExportedExpression(node: ts.Node): void {
    if (ts.isExpression(node)) {
      const importedSpecifier = getImportedSpecifier(node);
      if (importedSpecifier) runtimeReExportedSpecifiers.add(importedSpecifier);
    }
    if (ts.isCallExpression(node) || ts.isNewExpression(node)) return;
    ts.forEachChild(node, addReExportedExpression);
  }

  function addExportedDeclarationAuthorities(
    node: ts.FunctionDeclaration | ts.ClassDeclaration
  ): void {
    function visitExportedDeclaration(child: ts.Node): void {
      if (ts.isReturnStatement(child) && child.expression) {
        addReExportedExpression(child.expression);
        return;
      }
      if (ts.isPropertyDeclaration(child) && child.initializer) {
        addReExportedExpression(child.initializer);
        return;
      }
      if (ts.isHeritageClause(child)) {
        for (const heritageType of child.types) {
          addReExportedExpression(heritageType.expression);
        }
        return;
      }
      ts.forEachChild(child, visitExportedDeclaration);
    }

    ts.forEachChild(node, visitExportedDeclaration);
  }

  function readVariableImportPattern(node: ts.Expression): {
    pattern: string;
    hasStaticText: boolean;
  } {
    if (ts.isStringLiteralLike(node)) {
      return { pattern: node.text, hasStaticText: node.text.length > 0 };
    }

    if (ts.isTemplateExpression(node)) {
      let pattern = node.head.text;
      let hasStaticText = node.head.text.length > 0;
      for (const span of node.templateSpans) {
        pattern += `*${span.literal.text}`;
        hasStaticText ||= span.literal.text.length > 0;
      }
      return { pattern, hasStaticText };
    }

    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
      const left = readVariableImportPattern(node.left);
      const right = readVariableImportPattern(node.right);
      return {
        pattern: `${left.pattern}${right.pattern}`,
        hasStaticText: left.hasStaticText || right.hasStaticText,
      };
    }

    return { pattern: '*', hasStaticText: false };
  }

  function addDynamicImportSpecifiers(node: ts.Expression): void {
    if (ts.isStringLiteralLike(node)) {
      addSpecifier(node);
      return;
    }

    const variableImport = readVariableImportPattern(node);
    if (!variableImport.hasStaticText) return;

    const pattern = variableImport.pattern.replaceAll('\\', '/');
    if (!pattern.startsWith('.') && !pattern.startsWith('/') && !resolveWebViteAlias(pattern)) {
      runtimeModuleSpecifiers.add(pattern);
      return;
    }

    const resolvedPattern = resolveViteGlobPattern(modulePath, pattern, undefined);
    runtimeModuleSpecifiers.add(resolvedPattern);
    const matches = picomatch(resolvedPattern);
    for (const authorityPath of MONACO_INTERNAL_AUTHORITY_SOURCE_PATHS) {
      if (matches(authorityPath)) runtimeModuleSpecifiers.add(authorityPath);
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
    const positiveMatchers = resolvedPatterns
      .filter((globPattern) => !globPattern.startsWith('!'))
      .map((globPattern) => picomatch(globPattern));
    const negativeMatchers = resolvedPatterns
      .filter((globPattern) => globPattern.startsWith('!'))
      .map((globPattern) => picomatch(globPattern.slice(1)));

    for (const authorityPath of MONACO_INTERNAL_AUTHORITY_SOURCE_PATHS) {
      const matchesPositivePattern = positiveMatchers.some((matches) => matches(authorityPath));
      const matchesNegativePattern = negativeMatchers.some((matches) => matches(authorityPath));
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
      if (ts.isStringLiteralLike(node.moduleSpecifier)) {
        runtimeReExportedSpecifiers.add(node.moduleSpecifier.text);
      }
      return;
    }

    if (ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause)) {
      for (const element of node.exportClause.elements) {
        const localBinding = element.propertyName ?? element.name;
        const importedSpecifier = runtimeImportedBindings.get(localBinding.text);
        if (importedSpecifier) runtimeReExportedSpecifiers.add(importedSpecifier);
      }
      return;
    }

    if (ts.isExportAssignment(node)) {
      addReExportedExpression(node.expression);
      return;
    }

    if (
      ts.isVariableStatement(node) &&
      node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      for (const declaration of node.declarationList.declarations) {
        if (declaration.initializer) addReExportedExpression(declaration.initializer);
      }
    }

    if (
      (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) &&
      node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      addExportedDeclarationAuthorities(node);
    }

    if (ts.isCallExpression(node) && node.arguments[0]) {
      if (isViteGlobCall(node)) {
        addViteGlobSpecifiers(node);
        return;
      }

      if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        addDynamicImportSpecifiers(node.arguments[0]);
        return;
      }

      if (ts.isIdentifier(node.expression) && node.expression.text === 'require') {
        addSpecifier(node.arguments[0]);
        return;
      }
    }

    ts.forEachChild(node, visit);
  }

  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement)) addImportedBindings(statement);
  }

  let discoveredAlias = true;
  while (discoveredAlias) {
    discoveredAlias = false;
    for (const statement of sourceFile.statements) {
      if (!ts.isVariableStatement(statement)) continue;

      for (const declaration of statement.declarationList.declarations) {
        if (!declaration.initializer) continue;

        const importedSpecifier = getImportedSpecifier(declaration.initializer);
        const bindingCountBefore = runtimeImportedBindings.size;
        if (importedSpecifier) addAliasedBindingNames(declaration.name, importedSpecifier);
        if (runtimeImportedBindings.size > bindingCountBefore) discoveredAlias = true;
      }
    }
  }

  visit(sourceFile);
  return {
    specifiers: runtimeModuleSpecifiers,
    reExportedSpecifiers: runtimeReExportedSpecifiers,
  };
}

const RUNTIME_MODULE_SPECIFIER_CACHE = new Map<string, RuntimeModuleAccess>();

function getRuntimeModuleSpecifiers(modulePath: string, source: string): RuntimeModuleAccess {
  const cacheKey = `${modulePath}\0${source}`;
  const cachedSpecifiers = RUNTIME_MODULE_SPECIFIER_CACHE.get(cacheKey);
  if (cachedSpecifiers) return cachedSpecifiers;

  const runtimeModuleAccess = collectRuntimeModuleSpecifiers(
    emitWebModuleSource(source),
    modulePath
  );
  RUNTIME_MODULE_SPECIFIER_CACHE.set(cacheKey, runtimeModuleAccess);
  return runtimeModuleAccess;
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

function containsCanvasAuthoringContextSpecifier(
  specifiers: ReadonlySet<string>,
  modulePath: string
): boolean {
  return [...specifiers].some((specifier) =>
    resolveWebRuntimeModuleSpecifier(modulePath, specifier).startsWith('src/app/views/canvas/')
  );
}

function resolveWebRuntimeModuleSpecifier(modulePath: string, specifier: string): string {
  const normalizedSpecifier = specifier.replaceAll('\\', '/');
  const aliasedSpecifier = resolveWebViteAlias(normalizedSpecifier);
  if (aliasedSpecifier) return aliasedSpecifier;
  if (normalizedSpecifier.startsWith('.')) {
    return path.posix.normalize(
      path.posix.join(
        path.posix.dirname(resolveWebPackageModulePath(modulePath)),
        normalizedSpecifier
      )
    );
  }
  return normalizedSpecifier.startsWith('/') ? normalizedSpecifier.slice(1) : normalizedSpecifier;
}

function collectExternalCanvasComponentImports(
  specifiers: ReadonlySet<string>,
  modulePath: string
): string[] {
  if (modulePath.startsWith('app/views/canvas/') || modulePath === 'app/views/Canvas.tsx')
    return [];

  const violations: string[] = [];
  for (const specifier of specifiers) {
    const resolvedSpecifier = resolveWebRuntimeModuleSpecifier(modulePath, specifier);
    if (!resolvedSpecifier.startsWith('src/app/views/canvas/')) continue;

    const componentName = resolvedSpecifier
      .split('/')
      .at(-1)
      ?.replace(/\.[cm]?[jt]sx?$/, '');
    if (!componentName || !/^[A-Z]/.test(componentName)) continue;

    const publicConsumers =
      CANVAS_COMPONENT_PUBLIC_CONSUMERS[
        componentName as keyof typeof CANVAS_COMPONENT_PUBLIC_CONSUMERS
      ];
    if (!publicConsumers?.has(modulePath)) {
      violations.push(`${componentName} outside the Canvas bounded context`);
    }
  }
  return violations;
}

function collectMonacoAuthorityViolations({
  surface,
  modulePath,
  source,
}: Omit<MonacoAuthorityFixture, 'label'>): string[] {
  const violations: string[] = [];
  if (
    !MONACO_AUTHORITY_SOURCE_SIGNALS.some((signal) => source.includes(signal)) &&
    !/\bimport\s*\(/.test(source) &&
    !/['"`][^'"`]*\/canvas(?:\/|['"`])/.test(source)
  ) {
    return violations;
  }

  const { specifiers: runtimeModuleSpecifiers } = getRuntimeModuleSpecifiers(modulePath, source);

  if (
    (surface === 'templates-route' || surface === 'templates-preview') &&
    containsCanvasAuthoringContextSpecifier(runtimeModuleSpecifiers, modulePath)
  ) {
    violations.push('Canvas authoring context');
  }

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
      ...CANVAS_EDITABLE_MONACO_LEAVES,
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
  if (
    !MONACO_AUTHORITY_SOURCE_SIGNALS.some((signal) => source.includes(signal)) &&
    !/\bimport\s*\(/.test(source) &&
    !/['"`][^'"`]*\/canvas(?:\/|['"`])/.test(source)
  ) {
    return violations;
  }

  const { specifiers: runtimeModuleSpecifiers, reExportedSpecifiers: runtimeReExportedSpecifiers } =
    getRuntimeModuleSpecifiers(modulePath, source);
  violations.push(...collectExternalCanvasComponentImports(runtimeModuleSpecifiers, modulePath));
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

    const reExportsAuthority =
      authority === '@monaco-editor/react' || authority === 'monaco-editor runtime import'
        ? containsPackageSpecifier(
            runtimeReExportedSpecifiers,
            authority === '@monaco-editor/react' ? authority : 'monaco-editor'
          )
        : containsInternalAuthoritySpecifier(
            runtimeReExportedSpecifiers,
            authority as (typeof MONACO_INTERNAL_AUTHORITIES)[number]
          );
    if (reExportsAuthority) {
      violations.push(`${authority} re-exported`);
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
    expect(readRepoDoc('apps/web/vite.config.ts')).toContain(
      "'@': fileURLToPath(new URL('./src', import.meta.url))"
    );
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
