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
  'CodeView',
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
      : authority === 'CodeView'
        ? 'src/app/views/CodeView.tsx'
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
  CodeView: new Set(['app/views/canvas/SqlContextWorkbench.tsx']),
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
    label: 'Templates preview cannot import an alternate export from the viewer gateway',
    surface: 'templates-preview',
    modulePath: 'views/templates/TemplateMonacoPreviewPanel.tsx',
    source: [
      "import { EditableViewer } from '../../components/monaco/MonacoCodeViewer';",
      'void EditableViewer;',
    ].join('\n'),
    expectedViolation: 'MonacoCodeViewer public API',
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
    label: 'Templates route cannot acquire the editable Code workbench wrapper',
    surface: 'templates-route',
    modulePath: 'views/templates/TemplatesRouteWorkbench.tsx',
    source: ["import CodeView from '../CodeView';", 'void CodeView;'].join('\n'),
    expectedViolation: 'CodeView',
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
    label: 'Templates route cannot hide a Monaco Vite glob behind a computed base property',
    surface: 'templates-route',
    modulePath: 'views/templates/TemplatesRouteWorkbench.tsx',
    source: [
      "void import.meta.glob('./*.tsx', {",
      "  ['base']: '../../components/monaco',",
      '  eager: true,',
      '});',
    ].join('\n'),
    expectedViolation: 'MonacoCodeSurface',
  },
  {
    label: 'Templates route cannot hide a Monaco Vite glob behind static spread options',
    surface: 'templates-route',
    modulePath: 'views/templates/TemplatesRouteWorkbench.tsx',
    source: [
      "const sharedOptions = { base: '../../components/monaco' };",
      "void import.meta.glob('./*.tsx', { ...sharedOptions, eager: true });",
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
    label: 'An external wrapper cannot hide the raw Monaco package behind a Unicode escape',
    modulePath: 'app/components/RawMonacoPanel.js',
    source: ["import Editor from '@monaco\\u002deditor/react';", 'void Editor;'].join('\n'),
    expectedViolation: '@monaco-editor/react outside a governed owner',
  },
  {
    label: 'An external wrapper cannot hide an internal surface behind a Unicode escape',
    modulePath: 'app/components/RawMonacoPanel.mjs',
    source: ["import Surface from './monaco/Monaco\\u0043odeSurface';", 'void Surface;'].join('\n'),
    expectedViolation: 'MonacoCodeSurface outside a governed owner',
  },
  {
    label: 'A CommonJS wrapper cannot hide the raw Monaco package behind a Unicode escape',
    modulePath: 'app/components/RawMonacoPanel.cjs',
    source: "void require('@monaco\\u002deditor/react');",
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
    label: 'A shared source-root module resolves Vite globs from its real directory',
    modulePath: 'shared/EditablePanel.tsx',
    source: "export const panels = import.meta.glob('../app/components/**/*.tsx');",
    expectedViolation: 'MonacoCodeSurface outside a governed owner',
  },
  {
    label: 'A capability cannot reach Monaco through a leading double-star Vite glob',
    modulePath: 'capabilities/runtime-capabilities/presentation/MonacoCapabilityPanel.tsx',
    source:
      "export const panels = import.meta.glob('**/app/components/monaco/MonacoCodeSurface.tsx');",
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
    label: 'A governed viewer cannot separately export a local object that exposes its loader',
    modulePath: 'app/components/monaco/MonacoCodeViewer.tsx',
    source: [
      "import { useMonacoCodeSurface } from './useMonacoCodeSurface';",
      'const internals = { load: () => useMonacoCodeSurface };',
      'export { internals };',
    ].join('\n'),
    expectedViolation: 'useMonacoCodeSurface re-exported',
  },
  {
    label: 'A governed viewer cannot pass its loader through an exported identity call',
    modulePath: 'app/components/monaco/MonacoCodeViewer.tsx',
    source: [
      "import { useMonacoCodeSurface } from './useMonacoCodeSurface';",
      'declare function identity<T>(value: T): T;',
      'export const internals = identity(useMonacoCodeSurface);',
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
    label: 'Templates cannot acquire the editable Code workbench wrapper',
    modulePath: 'app/views/templates/TemplatesRouteWorkbench.tsx',
    source: ["import CodeView from '../CodeView';", 'void CodeView;'].join('\n'),
    expectedViolation: 'CodeView outside a governed owner',
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
    label: 'A governed viewer cannot return a function-local alias of its loader',
    modulePath: 'app/components/monaco/MonacoCodeViewer.tsx',
    source: [
      "import { useMonacoCodeSurface } from './useMonacoCodeSurface';",
      'export function getSurface() {',
      '  const Local = useMonacoCodeSurface;',
      '  return Local;',
      '}',
    ].join('\n'),
    expectedViolation: 'useMonacoCodeSurface re-exported',
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

const ACCEPTED_REPOSITORY_MONACO_OWNER_FIXTURES = [
  {
    label: 'A governed editor consumer may render its editor through React createElement',
    modulePath: 'app/views/code/CodeWorkspaceFileSurface.tsx',
    source: [
      "import { createElement as renderElement } from 'react';",
      "import { MonacoCodeEditor } from '../../components/monaco/MonacoCodeEditor';",
      'export const Panel = () => renderElement(MonacoCodeEditor, {});',
    ].join('\n'),
  },
  {
    label: 'A governed editor consumer may render its editor through React namespace access',
    modulePath: 'app/views/code/CodeWorkspaceFileSurface.tsx',
    source: [
      "import * as React from 'react';",
      "import { MonacoCodeEditor } from '../../components/monaco/MonacoCodeEditor';",
      'export const Panel = () => React.createElement(MonacoCodeEditor, {});',
    ].join('\n'),
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
  return (
    /\.(?:[cm]?[jt]sx?)$/.test(fileName) &&
    !/\.d\.[cm]?ts$/.test(fileName) &&
    !/\.(?:test|spec)\./.test(fileName)
  );
}

function collectPrefilterModuleSpecifiers(source: string): ReadonlySet<string> {
  const sourceFile = ts.createSourceFile(
    'monaco-authority-prefilter.tsx',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );
  const specifiers = new Set<string>();
  function visit(node: ts.Node): void {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteralLike(node.moduleSpecifier)
    ) {
      specifiers.add(node.moduleSpecifier.text);
      return;
    }
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'require' &&
      node.arguments[0] &&
      ts.isStringLiteralLike(node.arguments[0])
    ) {
      specifiers.add(node.arguments[0].text);
      return;
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return specifiers;
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

function collectBindingNames(name: ts.BindingName): string[] {
  if (ts.isIdentifier(name)) return [name.text];
  return name.elements.flatMap((element) =>
    ts.isOmittedExpression(element) ? [] : collectBindingNames(element.name)
  );
}

function collectRuntimeExportedNames(source: string): string[] {
  const sourceFile = ts.createSourceFile(
    'monaco-viewer-public-api.js',
    emitWebModuleSource(source),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS
  );
  const exportedNames = new Set<string>();
  for (const statement of sourceFile.statements) {
    if (ts.isExportAssignment(statement)) {
      exportedNames.add('default');
      continue;
    }
    if (ts.isExportDeclaration(statement) && statement.exportClause) {
      if (ts.isNamedExports(statement.exportClause)) {
        for (const element of statement.exportClause.elements) exportedNames.add(element.name.text);
      }
      continue;
    }
    const modifiers = ts.canHaveModifiers(statement) ? ts.getModifiers(statement) : undefined;
    const isExported = modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
    if (!isExported) continue;
    if (modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword)) {
      exportedNames.add('default');
    }
    if (
      (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) &&
      statement.name
    ) {
      exportedNames.add(statement.name.text);
    }
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        for (const name of collectBindingNames(declaration.name)) exportedNames.add(name);
      }
    }
  }
  return [...exportedNames].sort();
}

function collectMonacoViewerImportViolations(source: string): string[] {
  const sourceFile = ts.createSourceFile(
    'templates-monaco-viewer-imports.js',
    emitWebModuleSource(source),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS
  );
  for (const statement of sourceFile.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteralLike(statement.moduleSpecifier) ||
      !/\/?MonacoCodeViewer(?:\.[cm]?[jt]sx?)?$/.test(statement.moduleSpecifier.text)
    ) {
      continue;
    }
    const importClause = statement.importClause;
    if (!importClause) continue;
    if (importClause.name || !importClause.namedBindings) return ['MonacoCodeViewer public API'];
    if (ts.isNamespaceImport(importClause.namedBindings)) return ['MonacoCodeViewer public API'];
    if (
      importClause.namedBindings.elements.some(
        (element) => (element.propertyName ?? element.name).text !== 'MonacoCodeViewer'
      )
    ) {
      return ['MonacoCodeViewer public API'];
    }
  }
  return [];
}

function collectMonacoViewerReadOnlyViolations(source: string): string[] {
  const sourceFile = ts.createSourceFile(
    'monaco-viewer-read-only.tsx',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );
  const hookBindings = new Set(['useMonacoCodeSurface']);
  const surfaceBindings = new Set<string>();

  function unwrapExpression(expression: ts.Expression): ts.Expression {
    let unwrapped = expression;
    while (ts.isParenthesizedExpression(unwrapped)) unwrapped = unwrapped.expression;
    return unwrapped;
  }

  function readExpressionPath(node: ts.Node): string | undefined {
    if (ts.isIdentifier(node)) return node.text;
    if (ts.isPropertyAccessExpression(node)) {
      const ownerPath = readExpressionPath(node.expression);
      return ownerPath ? `${ownerPath}.${node.name.text}` : undefined;
    }
    if (
      ts.isElementAccessExpression(node) &&
      node.argumentExpression &&
      ts.isStringLiteralLike(node.argumentExpression)
    ) {
      const ownerPath = readExpressionPath(node.expression);
      return ownerPath ? `${ownerPath}.${node.argumentExpression.text}` : undefined;
    }
    return undefined;
  }

  function readStaticPropertyName(name: ts.PropertyName): string | undefined {
    if (ts.isIdentifier(name) || ts.isStringLiteralLike(name) || ts.isNumericLiteral(name)) {
      return name.text;
    }
    if (ts.isComputedPropertyName(name) && ts.isStringLiteralLike(name.expression)) {
      return name.expression.text;
    }
    return undefined;
  }

  function addSurfaceBinding(binding: string): boolean {
    if (surfaceBindings.has(binding)) return false;
    surfaceBindings.add(binding);
    return true;
  }

  function copySurfaceMembers(sourcePath: string, targetPath: string): boolean {
    let discovered = false;
    for (const binding of [...surfaceBindings]) {
      if (!binding.startsWith(`${sourcePath}.`)) continue;
      discovered =
        addSurfaceBinding(`${targetPath}${binding.slice(sourcePath.length)}`) || discovered;
    }
    return discovered;
  }

  function discoverObjectSurfaceBindings(
    objectPath: string,
    objectLiteral: ts.ObjectLiteralExpression
  ): boolean {
    let discovered = false;
    for (const property of objectLiteral.properties) {
      if (ts.isShorthandPropertyAssignment(property)) {
        const targetPath = `${objectPath}.${property.name.text}`;
        discovered =
          (surfaceBindings.has(property.name.text) && addSurfaceBinding(targetPath)) || discovered;
        discovered = copySurfaceMembers(property.name.text, targetPath) || discovered;
        continue;
      }
      if (!ts.isPropertyAssignment(property)) continue;
      const propertyName = readStaticPropertyName(property.name);
      if (!propertyName) continue;
      const targetPath = `${objectPath}.${propertyName}`;
      const initializer = unwrapExpression(property.initializer);
      const initializerPath = readExpressionPath(initializer);
      if (initializerPath) {
        discovered =
          (surfaceBindings.has(initializerPath) && addSurfaceBinding(targetPath)) || discovered;
        discovered = copySurfaceMembers(initializerPath, targetPath) || discovered;
      }
      if (ts.isObjectLiteralExpression(initializer)) {
        discovered = discoverObjectSurfaceBindings(targetPath, initializer) || discovered;
      }
    }
    return discovered;
  }

  for (const statement of sourceFile.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteralLike(statement.moduleSpecifier) ||
      !/\/?useMonacoCodeSurface(?:\.[cm]?[jt]s)?$/.test(statement.moduleSpecifier.text) ||
      !statement.importClause?.namedBindings ||
      !ts.isNamedImports(statement.importClause.namedBindings)
    ) {
      continue;
    }
    for (const element of statement.importClause.namedBindings.elements) {
      if ((element.propertyName ?? element.name).text === 'useMonacoCodeSurface') {
        hookBindings.add(element.name.text);
      }
    }
  }

  let discoveredSurfaceBinding = true;
  while (discoveredSurfaceBinding) {
    discoveredSurfaceBinding = false;
    function discoverSurfaceBindings(node: ts.Node): void {
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
        const initializer = unwrapExpression(node.initializer);
        const isHookResult =
          ts.isCallExpression(initializer) &&
          ts.isIdentifier(initializer.expression) &&
          hookBindings.has(initializer.expression.text);
        const initializerPath = readExpressionPath(initializer);
        if (isHookResult || (initializerPath && surfaceBindings.has(initializerPath))) {
          discoveredSurfaceBinding = addSurfaceBinding(node.name.text) || discoveredSurfaceBinding;
        }
        if (initializerPath) {
          discoveredSurfaceBinding =
            copySurfaceMembers(initializerPath, node.name.text) || discoveredSurfaceBinding;
        }
        if (ts.isObjectLiteralExpression(initializer)) {
          discoveredSurfaceBinding =
            discoverObjectSurfaceBindings(node.name.text, initializer) || discoveredSurfaceBinding;
        }
      }
      ts.forEachChild(node, discoverSurfaceBindings);
    }
    discoverSurfaceBindings(sourceFile);
  }

  function isStaticTrue(expression: ts.Expression): boolean {
    return expression.kind === ts.SyntaxKind.TrueKeyword;
  }

  function jsxAttributesAreReadOnly(attributes: ts.JsxAttributes): boolean {
    let readOnly: boolean | undefined;
    for (const property of attributes.properties) {
      if (ts.isJsxSpreadAttribute(property)) {
        readOnly = undefined;
        continue;
      }
      if (!ts.isIdentifier(property.name) || property.name.text !== 'readOnly') continue;
      readOnly =
        property.initializer == null ||
        (ts.isJsxExpression(property.initializer) &&
          property.initializer.expression != null &&
          isStaticTrue(property.initializer.expression));
    }
    return readOnly === true;
  }

  function objectPropertiesAreReadOnly(expression: ts.Expression | undefined): boolean {
    if (!expression || !ts.isObjectLiteralExpression(expression)) return false;
    let readOnly: boolean | undefined;
    for (const property of expression.properties) {
      if (ts.isSpreadAssignment(property)) {
        readOnly = undefined;
        continue;
      }
      const propertyName =
        ts.isPropertyAssignment(property) &&
        (ts.isIdentifier(property.name) || ts.isStringLiteralLike(property.name))
          ? property.name.text
          : undefined;
      if (ts.isPropertyAssignment(property) && propertyName === 'readOnly') {
        readOnly = isStaticTrue(property.initializer);
      }
    }
    return readOnly === true;
  }

  const violations: string[] = [];
  let renderedSurfaceCount = 0;
  function visit(node: ts.Node): void {
    if (
      (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
      surfaceBindings.has(readExpressionPath(node.tagName) ?? '')
    ) {
      renderedSurfaceCount += 1;
      if (!jsxAttributesAreReadOnly(node.attributes)) {
        violations.push('MonacoCodeViewer rendered a writable or dynamic surface');
      }
    }
    if (
      ts.isCallExpression(node) &&
      ((ts.isIdentifier(node.expression) && node.expression.text === 'createElement') ||
        (ts.isPropertyAccessExpression(node.expression) &&
          node.expression.name.text === 'createElement')) &&
      node.arguments[0] &&
      surfaceBindings.has(readExpressionPath(node.arguments[0]) ?? '')
    ) {
      renderedSurfaceCount += 1;
      if (!objectPropertiesAreReadOnly(node.arguments[1])) {
        violations.push('MonacoCodeViewer rendered a writable or dynamic surface');
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  if (renderedSurfaceCount === 0) violations.push('MonacoCodeViewer did not render its surface');
  return violations;
}

function resolveWebPackageModulePath(modulePath: string): string {
  const normalizedModulePath = modulePath.replaceAll('\\', '/');
  return normalizedModulePath.startsWith('src/')
    ? normalizedModulePath
    : `src/${normalizedModulePath}`;
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
      : pattern.startsWith('**')
        ? pattern
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
  const runtimeLocalBindingInitializers = new Map<string, ts.Expression>();
  const reactCreateElementBindings = new Set<string>();
  const reactNamespaceBindings = new Set<string>();

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
      if (moduleSpecifier === 'react') reactNamespaceBindings.add(node.importClause.name.text);
    }

    const namedBindings = node.importClause.namedBindings;
    if (namedBindings && ts.isNamespaceImport(namedBindings)) {
      runtimeImportedBindings.set(namedBindings.name.text, moduleSpecifier);
      if (moduleSpecifier === 'react') reactNamespaceBindings.add(namedBindings.name.text);
    }
    if (namedBindings && ts.isNamedImports(namedBindings)) {
      for (const element of namedBindings.elements) {
        runtimeImportedBindings.set(element.name.text, moduleSpecifier);
        if (
          moduleSpecifier === 'react' &&
          (element.propertyName ?? element.name).text === 'createElement'
        ) {
          reactCreateElementBindings.add(element.name.text);
        }
      }
    }
  }

  function addAliasedBindingNames(
    name: ts.BindingName,
    moduleSpecifier: string,
    bindings: Map<string, string> = runtimeImportedBindings
  ): void {
    if (ts.isIdentifier(name)) {
      bindings.set(name.text, moduleSpecifier);
      return;
    }

    for (const element of name.elements) {
      if (!ts.isOmittedExpression(element)) {
        addAliasedBindingNames(element.name, moduleSpecifier, bindings);
      }
    }
  }

  function addLocalBindingInitializers(name: ts.BindingName, initializer: ts.Expression): void {
    if (ts.isIdentifier(name)) {
      runtimeLocalBindingInitializers.set(name.text, initializer);
      return;
    }
    for (const element of name.elements) {
      if (!ts.isOmittedExpression(element)) {
        addLocalBindingInitializers(element.name, initializer);
      }
    }
  }

  function getImportedSpecifier(
    node: ts.Expression,
    bindings: ReadonlyMap<string, string> = runtimeImportedBindings
  ): string | undefined {
    if (ts.isIdentifier(node)) return bindings.get(node.text);
    if (ts.isParenthesizedExpression(node)) return getImportedSpecifier(node.expression, bindings);
    if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
      return getImportedSpecifier(node.expression, bindings);
    }
    return undefined;
  }

  function isReactCreateElementCall(node: ts.CallExpression): boolean {
    if (ts.isIdentifier(node.expression)) {
      return reactCreateElementBindings.has(node.expression.text);
    }
    return (
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === 'createElement' &&
      ts.isIdentifier(node.expression.expression) &&
      reactNamespaceBindings.has(node.expression.expression.text)
    );
  }

  function addReExportedExpression(
    node: ts.Node,
    bindings: ReadonlyMap<string, string> = runtimeImportedBindings,
    resolvingLocalBindings: ReadonlySet<string> = new Set()
  ): void {
    if (ts.isExpression(node)) {
      const importedSpecifier = getImportedSpecifier(node, bindings);
      if (importedSpecifier) runtimeReExportedSpecifiers.add(importedSpecifier);
    }
    if (
      ts.isIdentifier(node) &&
      !bindings.has(node.text) &&
      !resolvingLocalBindings.has(node.text)
    ) {
      const initializer = runtimeLocalBindingInitializers.get(node.text);
      if (initializer) {
        addReExportedExpression(
          initializer,
          bindings,
          new Set([...resolvingLocalBindings, node.text])
        );
      }
      return;
    }
    if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
      const calledSpecifier = getImportedSpecifier(node.expression, bindings);
      const isJsxRuntimeCall =
        ts.isCallExpression(node) &&
        (calledSpecifier === 'react/jsx-runtime' || calledSpecifier === 'react/jsx-dev-runtime');
      const isRenderCall = ts.isCallExpression(node) && isReactCreateElementCall(node);
      if (!isJsxRuntimeCall && !isRenderCall) {
        if (calledSpecifier) runtimeReExportedSpecifiers.add(calledSpecifier);
        for (const argument of node.arguments ?? []) {
          addReExportedExpression(argument, bindings, resolvingLocalBindings);
        }
      }
      return;
    }
    ts.forEachChild(node, (child) =>
      addReExportedExpression(child, bindings, resolvingLocalBindings)
    );
  }

  function addExportedDeclarationAuthorities(
    node: ts.FunctionDeclaration | ts.ClassDeclaration
  ): void {
    const declarationBindings = new Map(runtimeImportedBindings);
    let discoveredAlias = true;
    while (discoveredAlias) {
      discoveredAlias = false;
      function discoverDeclarationAlias(child: ts.Node): void {
        if (ts.isVariableDeclaration(child) && child.initializer) {
          const importedSpecifier = getImportedSpecifier(child.initializer, declarationBindings);
          const bindingCountBefore = declarationBindings.size;
          if (importedSpecifier) {
            addAliasedBindingNames(child.name, importedSpecifier, declarationBindings);
          }
          if (declarationBindings.size > bindingCountBefore) discoveredAlias = true;
        }
        ts.forEachChild(child, discoverDeclarationAlias);
      }
      ts.forEachChild(node, discoverDeclarationAlias);
    }

    function visitExportedDeclaration(child: ts.Node): void {
      if (ts.isReturnStatement(child) && child.expression) {
        addReExportedExpression(child.expression, declarationBindings);
        return;
      }
      if (ts.isPropertyDeclaration(child) && child.initializer) {
        addReExportedExpression(child.initializer, declarationBindings);
        return;
      }
      if (ts.isHeritageClause(child)) {
        for (const heritageType of child.types) {
          addReExportedExpression(heritageType.expression, declarationBindings);
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

  function readStaticString(
    expression: ts.Expression,
    resolvingBindings: ReadonlySet<string> = new Set()
  ): string | undefined {
    if (ts.isStringLiteralLike(expression)) return expression.text;
    if (ts.isParenthesizedExpression(expression)) {
      return readStaticString(expression.expression, resolvingBindings);
    }
    if (ts.isIdentifier(expression) && !resolvingBindings.has(expression.text)) {
      const initializer = runtimeLocalBindingInitializers.get(expression.text);
      if (initializer) {
        return readStaticString(initializer, new Set([...resolvingBindings, expression.text]));
      }
    }
    return undefined;
  }

  function readStaticPropertyName(name: ts.PropertyName): string | undefined {
    if (ts.isIdentifier(name) || ts.isStringLiteralLike(name) || ts.isNumericLiteral(name)) {
      return name.text;
    }
    if (ts.isComputedPropertyName(name)) return readStaticString(name.expression);
    return undefined;
  }

  function readStaticViteGlobBaseFromExpression(
    expression: ts.Expression,
    resolvingBindings: ReadonlySet<string> = new Set()
  ): string | undefined {
    if (ts.isParenthesizedExpression(expression)) {
      return readStaticViteGlobBaseFromExpression(expression.expression, resolvingBindings);
    }
    if (ts.isIdentifier(expression) && !resolvingBindings.has(expression.text)) {
      const initializer = runtimeLocalBindingInitializers.get(expression.text);
      if (initializer) {
        return readStaticViteGlobBaseFromExpression(
          initializer,
          new Set([...resolvingBindings, expression.text])
        );
      }
      return undefined;
    }
    if (!ts.isObjectLiteralExpression(expression)) return undefined;

    let base: string | undefined;
    for (const property of expression.properties) {
      if (ts.isSpreadAssignment(property)) {
        base = readStaticViteGlobBaseFromExpression(property.expression, resolvingBindings) ?? base;
        continue;
      }
      if (ts.isPropertyAssignment(property) && readStaticPropertyName(property.name) === 'base') {
        base = readStaticString(property.initializer, resolvingBindings) ?? base;
        continue;
      }
      if (ts.isShorthandPropertyAssignment(property) && property.name.text === 'base') {
        base = readStaticString(property.name, resolvingBindings) ?? base;
      }
    }
    return base;
  }

  function readStaticViteGlobBase(node: ts.CallExpression): string | undefined {
    const options = node.arguments[1];
    return options ? readStaticViteGlobBaseFromExpression(options) : undefined;
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
        const initializer = runtimeLocalBindingInitializers.get(localBinding.text);
        if (initializer) addReExportedExpression(initializer);
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
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (declaration.initializer) {
          addLocalBindingInitializers(declaration.name, declaration.initializer);
        }
      }
    }
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

function containsPotentialStaticMonacoAuthority(
  specifiers: ReadonlySet<string>,
  modulePath: string
): boolean {
  if (
    containsPackageSpecifier(specifiers, '@monaco-editor/react') ||
    containsPackageSpecifier(specifiers, 'monaco-editor') ||
    containsCanvasAuthoringContextSpecifier(specifiers, modulePath)
  ) {
    return true;
  }
  return MONACO_INTERNAL_AUTHORITIES.some((authority) =>
    containsInternalAuthoritySpecifier(specifiers, authority)
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
  const sourceRootModulePath = modulePath.startsWith('app/') ? modulePath : `app/${modulePath}`;
  const hasEscapedStaticAuthority =
    /\\(?:u(?:\{[\dA-Fa-f]+\}|[\dA-Fa-f]{4})|x[\dA-Fa-f]{2})/.test(source) &&
    containsPotentialStaticMonacoAuthority(
      collectPrefilterModuleSpecifiers(source),
      sourceRootModulePath
    );
  if (
    !MONACO_AUTHORITY_SOURCE_SIGNALS.some((signal) => source.includes(signal)) &&
    !/\bimport\s*\(/.test(source) &&
    !/['"`][^'"`]*\/canvas(?:\/|['"`])/.test(source) &&
    !hasEscapedStaticAuthority
  ) {
    return violations;
  }

  const { specifiers: runtimeModuleSpecifiers } = getRuntimeModuleSpecifiers(
    sourceRootModulePath,
    source
  );

  if (surface === 'templates-preview') {
    violations.push(...collectMonacoViewerImportViolations(source));
  }

  if (
    (surface === 'templates-route' || surface === 'templates-preview') &&
    containsCanvasAuthoringContextSpecifier(runtimeModuleSpecifiers, sourceRootModulePath)
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
  const hasEscapedStaticAuthority =
    /\\(?:u(?:\{[\dA-Fa-f]+\}|[\dA-Fa-f]{4})|x[\dA-Fa-f]{2})/.test(source) &&
    containsPotentialStaticMonacoAuthority(collectPrefilterModuleSpecifiers(source), modulePath);
  if (
    !MONACO_AUTHORITY_SOURCE_SIGNALS.some((signal) => source.includes(signal)) &&
    !/\bimport\s*\(/.test(source) &&
    !/['"`][^'"`]*\/canvas(?:\/|['"`])/.test(source) &&
    !hasEscapedStaticAuthority
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
    for (const executableFile of [
      'MonacoCodeSurface.js',
      'MonacoCodeSurface.jsx',
      'MonacoCodeSurface.mjs',
      'MonacoCodeSurface.mts',
      'MonacoCodeSurface.cjs',
      'MonacoCodeSurface.cts',
    ]) {
      expect(isProductionSourceFileName(executableFile), executableFile).toBe(true);
    }
    expect(isProductionSourceFileName('MonacoCodeSurface.d.ts')).toBe(false);
    expect(readRepoDoc('apps/web/vite.config.ts')).toContain(
      "'@': fileURLToPath(new URL('./src', import.meta.url))"
    );
    expect(collectRuntimeExportedNames('export default function () {}')).toEqual(['default']);
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

    for (const fixture of ACCEPTED_REPOSITORY_MONACO_OWNER_FIXTURES) {
      expect(collectRepositoryMonacoOwnerViolations(fixture), fixture.label).toEqual([]);
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
    expect(collectRuntimeExportedNames(monacoViewer)).toEqual(['MonacoCodeViewer']);
    expect(collectMonacoViewerReadOnlyViolations(monacoViewer)).toEqual([]);
    expect(
      collectMonacoViewerReadOnlyViolations(
        [
          'function useMonacoCodeSurface() { return null; }',
          'export function MonacoCodeViewer({ editable }: { editable: boolean }) {',
          '  const Surface = useMonacoCodeSurface();',
          '  return editable ? <Surface readOnly={false} /> : <Surface readOnly={true} />;',
          '}',
        ].join('\n')
      )
    ).toContain('MonacoCodeViewer rendered a writable or dynamic surface');
    expect(
      collectMonacoViewerReadOnlyViolations(
        [
          'function useMonacoCodeSurface() { return null; }',
          'export function MonacoCodeViewer() {',
          '  const Surface = useMonacoCodeSurface();',
          '  const Surfaces = { Writable: Surface };',
          '  return <><Surface readOnly /><Surfaces.Writable readOnly={false} /></>;',
          '}',
        ].join('\n')
      )
    ).toContain('MonacoCodeViewer rendered a writable or dynamic surface');
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
