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
const TRANSITIVE_MONACO_VIEWER_AUTHORITIES = [
  'NodePropertySectionView',
  'NodePropertiesTabs',
  'ArtifactMonacoPreviewPanel',
  'ArtifactPreviewTabs',
  'ArtifactsView',
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
  ...TRANSITIVE_MONACO_VIEWER_AUTHORITIES,
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
        : authority === 'NodePropertySectionView'
          ? 'src/app/components/inspector/NodePropertySectionView.tsx'
          : authority === 'NodePropertiesTabs'
            ? 'src/app/components/inspector/NodePropertiesTabs.tsx'
            : authority === 'ArtifactMonacoPreviewPanel'
              ? 'src/app/views/artifacts/ArtifactMonacoPreviewPanel.tsx'
              : authority === 'ArtifactPreviewTabs'
                ? 'src/app/views/artifacts/ArtifactPreviewTabs.tsx'
                : authority === 'ArtifactsView'
                  ? 'src/app/views/ArtifactsView.tsx'
                  : authority === 'CodeWorkspaceFileSurface' ||
                      authority === 'WorkspaceFileCodeEditor'
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
  NodePropertySectionView: new Set(['app/components/inspector/NodePropertiesTabs.tsx']),
  NodePropertiesTabs: new Set(['app/views/canvas/CanvasNodeWorkbenchPanel.tsx']),
  ArtifactMonacoPreviewPanel: new Set(['app/views/artifacts/ArtifactPreviewTabs.tsx']),
  ArtifactPreviewTabs: new Set(['app/views/ArtifactsView.tsx']),
  ArtifactsView: new Set<string>(),
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
    label: 'Templates may import Monaco viewer source as non-executable Vite raw text',
    surface: 'templates-route',
    modulePath: 'views/templates/templateSourceAsset.ts',
    source: [
      "import viewerSource from '../../components/monaco/MonacoCodeViewer.tsx?raw';",
      'void viewerSource;',
    ].join('\n'),
  },
  {
    label: 'Templates may import a Monaco viewer URL without acquiring its authority',
    surface: 'templates-route',
    modulePath: 'views/templates/templateSourceAsset.ts',
    source: [
      "import viewerUrl from '../../components/monaco/MonacoCodeViewer.tsx?url';",
      'void viewerUrl;',
    ].join('\n'),
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
    label: 'Templates route cannot hide its viewer import behind a Vite query',
    surface: 'templates-route',
    modulePath: 'views/templates/TemplatesRouteWorkbench.tsx',
    source: [
      "import { MonacoCodeViewer } from '../../components/monaco/MonacoCodeViewer?v=1';",
      'void MonacoCodeViewer;',
    ].join('\n'),
    expectedViolation: 'MonacoCodeViewer',
  },
  {
    label: 'Templates route cannot hide its viewer import behind a URL fragment',
    surface: 'templates-route',
    modulePath: 'views/templates/TemplatesRouteWorkbench.tsx',
    source: [
      "import { MonacoCodeViewer } from '../../components/monaco/MonacoCodeViewer#preview';",
      'void MonacoCodeViewer;',
    ].join('\n'),
    expectedViolation: 'MonacoCodeViewer',
  },
  {
    label: 'Templates route cannot treat a valued raw query as non-executable',
    surface: 'templates-route',
    modulePath: 'views/templates/TemplatesRouteWorkbench.tsx',
    source: [
      "import { MonacoCodeViewer } from '../../components/monaco/MonacoCodeViewer?raw=false';",
      'void MonacoCodeViewer;',
    ].join('\n'),
    expectedViolation: 'MonacoCodeViewer',
  },
  {
    label: 'Templates route cannot treat a valued URL query as non-executable',
    surface: 'templates-route',
    modulePath: 'views/templates/TemplatesRouteWorkbench.tsx',
    source: [
      "import { MonacoCodeViewer } from '../../components/monaco/MonacoCodeViewer?url=false';",
      'void MonacoCodeViewer;',
    ].join('\n'),
    expectedViolation: 'MonacoCodeViewer',
  },
  {
    label: 'Templates route cannot mount Monaco through the inspector viewer wrapper',
    surface: 'templates-route',
    modulePath: 'views/templates/TemplatesRouteWorkbench.tsx',
    source: [
      "import { NodePropertySectionView } from '../../components/inspector/NodePropertySectionView';",
      'void NodePropertySectionView;',
    ].join('\n'),
    expectedViolation: 'NodePropertySectionView',
  },
  {
    label: 'Templates route cannot mount Monaco through the artifact viewer wrapper',
    surface: 'templates-route',
    modulePath: 'views/templates/TemplatesRouteWorkbench.tsx',
    source: [
      "import { ArtifactMonacoPreviewPanel } from '../artifacts/ArtifactMonacoPreviewPanel';",
      'void ArtifactMonacoPreviewPanel;',
    ].join('\n'),
    expectedViolation: 'ArtifactMonacoPreviewPanel',
  },
  {
    label: 'Templates route cannot mount Monaco through the artifact route wrapper chain',
    surface: 'templates-route',
    modulePath: 'views/templates/TemplatesRouteWorkbench.tsx',
    source: ["import ArtifactsView from '../ArtifactsView';", 'void ArtifactsView;'].join('\n'),
    expectedViolation: 'ArtifactsView',
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
    label: 'A capability cannot store a direct Monaco dynamic import specifier',
    modulePath: 'capabilities/runtime-capabilities/presentation/MonacoCapabilityPanel.tsx',
    source: [
      "const target = '../../../app/components/monaco/MonacoCodeSurface';",
      'void import(target);',
    ].join('\n'),
    expectedViolation: 'MonacoCodeSurface outside a governed owner',
  },
  {
    label: 'A capability cannot store a function-local Monaco dynamic import specifier',
    modulePath: 'capabilities/runtime-capabilities/presentation/MonacoCapabilityPanel.tsx',
    source: [
      'export function loadSurface() {',
      "  const target = '../../../app/components/monaco/MonacoCodeSurface';",
      '  return import(target);',
      '}',
    ].join('\n'),
    expectedViolation: 'MonacoCodeSurface outside a governed owner',
  },
  {
    label: 'A capability cannot default a dynamic import parameter to a Monaco surface',
    modulePath: 'capabilities/runtime-capabilities/presentation/MonacoCapabilityPanel.tsx',
    source: [
      "export function loadSurface(target = '../../../app/components/monaco/MonacoCodeSurface') {",
      '  return import(target);',
      '}',
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
    label: 'A governed viewer cannot pass its loader through JSX render props',
    modulePath: 'app/components/monaco/MonacoCodeViewer.tsx',
    source: [
      "import { useMonacoCodeSurface } from './useMonacoCodeSurface';",
      'function EditableProxy() { return null; }',
      'export function MonacoCodeViewer() {',
      '  const Surface = useMonacoCodeSurface();',
      '  return <><Surface readOnly /><EditableProxy useSurface={useMonacoCodeSurface} /></>;',
      '}',
    ].join('\n'),
    expectedViolation: 'useMonacoCodeSurface re-exported',
  },
  {
    label: 'A governed viewer cannot pass its loader through createElement props',
    modulePath: 'app/components/monaco/MonacoCodeViewer.tsx',
    source: [
      "import { createElement } from 'react';",
      "import { useMonacoCodeSurface } from './useMonacoCodeSurface';",
      'function EditableProxy() { return null; }',
      'export function MonacoCodeViewer() {',
      '  const Surface = useMonacoCodeSurface();',
      '  return createElement(',
      "    'div',",
      '    null,',
      '    createElement(Surface, { readOnly: true }),',
      '    createElement(EditableProxy, { useSurface: useMonacoCodeSurface }),',
      '  );',
      '}',
    ].join('\n'),
    expectedViolation: 'useMonacoCodeSurface re-exported',
  },
  {
    label: 'A governed viewer cannot pass its loader through an invoked render prop',
    modulePath: 'app/components/monaco/MonacoCodeViewer.tsx',
    source: [
      "import { useMonacoCodeSurface } from './useMonacoCodeSurface';",
      'export function MonacoCodeViewer({ render }) {',
      '  const Surface = useMonacoCodeSurface();',
      '  const content = render(useMonacoCodeSurface());',
      '  return <>{content}<Surface readOnly /></>;',
      '}',
    ].join('\n'),
    expectedViolation: 'useMonacoCodeSurface re-exported',
  },
  {
    label: 'A governed viewer cannot pass its loader through an aliased render prop',
    modulePath: 'app/components/monaco/MonacoCodeViewer.tsx',
    source: [
      "import { useMonacoCodeSurface } from './useMonacoCodeSurface';",
      'export function MonacoCodeViewer({ render }) {',
      '  const Surface = useMonacoCodeSurface();',
      '  const invoke = render;',
      '  const content = invoke(useMonacoCodeSurface());',
      '  return <>{content}<Surface readOnly /></>;',
      '}',
    ].join('\n'),
    expectedViolation: 'useMonacoCodeSurface re-exported',
  },
  {
    label: 'A governed viewer cannot pass its loader through a destructured render prop alias',
    modulePath: 'app/components/monaco/MonacoCodeViewer.tsx',
    source: [
      "import { useMonacoCodeSurface } from './useMonacoCodeSurface';",
      'export function MonacoCodeViewer({ render }) {',
      '  const Surface = useMonacoCodeSurface();',
      '  const { invoke } = { invoke: render };',
      '  const content = invoke(useMonacoCodeSurface());',
      '  return <>{content}<Surface readOnly /></>;',
      '}',
    ].join('\n'),
    expectedViolation: 'useMonacoCodeSurface re-exported',
  },
  {
    label:
      'A governed viewer cannot pass its loader through an array-destructured render prop alias',
    modulePath: 'app/components/monaco/MonacoCodeViewer.tsx',
    source: [
      "import { useMonacoCodeSurface } from './useMonacoCodeSurface';",
      'export function MonacoCodeViewer({ render }) {',
      '  const Surface = useMonacoCodeSurface();',
      '  const [invoke] = [render];',
      '  const content = invoke(useMonacoCodeSurface());',
      '  return <>{content}<Surface readOnly /></>;',
      '}',
    ].join('\n'),
    expectedViolation: 'useMonacoCodeSurface re-exported',
  },
  {
    label: 'A governed viewer cannot pass its loader through a composite render prop alias',
    modulePath: 'app/components/monaco/MonacoCodeViewer.tsx',
    source: [
      "import { useMonacoCodeSurface } from './useMonacoCodeSurface';",
      'export function MonacoCodeViewer({ render }) {',
      '  const Surface = useMonacoCodeSurface();',
      '  const callbacks = { invoke: render };',
      '  const content = callbacks.invoke(useMonacoCodeSurface());',
      '  return <>{content}<Surface readOnly /></>;',
      '}',
    ].join('\n'),
    expectedViolation: 'useMonacoCodeSurface re-exported',
  },
  {
    label: 'A governed viewer cannot pass its loader through a destructuring assignment alias',
    modulePath: 'app/components/monaco/MonacoCodeViewer.tsx',
    source: [
      "import { useMonacoCodeSurface } from './useMonacoCodeSurface';",
      'export function MonacoCodeViewer({ render }) {',
      '  const Surface = useMonacoCodeSurface();',
      '  let invoke;',
      '  ({ invoke } = { invoke: render });',
      '  const content = invoke(useMonacoCodeSurface());',
      '  return <>{content}<Surface readOnly /></>;',
      '}',
    ].join('\n'),
    expectedViolation: 'useMonacoCodeSurface re-exported',
  },
  {
    label: 'A governed viewer cannot destructure a stored composite render prop alias',
    modulePath: 'app/components/monaco/MonacoCodeViewer.tsx',
    source: [
      "import { useMonacoCodeSurface } from './useMonacoCodeSurface';",
      'export function MonacoCodeViewer({ render }) {',
      '  const Surface = useMonacoCodeSurface();',
      '  const callbacks = { invoke: render };',
      '  const { invoke } = callbacks;',
      '  const content = invoke(useMonacoCodeSurface());',
      '  return <>{content}<Surface readOnly /></>;',
      '}',
    ].join('\n'),
    expectedViolation: 'useMonacoCodeSurface re-exported',
  },
  {
    label: 'A later governed spread retains render prop authority over an earlier local member',
    modulePath: 'app/components/monaco/MonacoCodeViewer.tsx',
    source: [
      "import { useMonacoCodeSurface } from './useMonacoCodeSurface';",
      'export function MonacoCodeViewer({ render }) {',
      '  const Surface = useMonacoCodeSurface();',
      '  const base = { invoke: render };',
      '  const callbacks = { invoke: () => null, ...base };',
      '  const content = callbacks.invoke(useMonacoCodeSurface());',
      '  return <>{content}<Surface readOnly /></>;',
      '}',
    ].join('\n'),
    expectedViolation: 'useMonacoCodeSurface re-exported',
  },
  {
    label: 'A method override that delegates to render retains render prop authority',
    modulePath: 'app/components/monaco/MonacoCodeViewer.tsx',
    source: [
      "import { useMonacoCodeSurface } from './useMonacoCodeSurface';",
      'export function MonacoCodeViewer({ render }) {',
      '  const Surface = useMonacoCodeSurface();',
      '  const base = { invoke: render };',
      '  const callbacks = { ...base, invoke(value) { return render(value); } };',
      '  const content = callbacks.invoke(useMonacoCodeSurface());',
      '  return <>{content}<Surface readOnly /></>;',
      '}',
    ].join('\n'),
    expectedViolation: 'useMonacoCodeSurface re-exported',
  },
  {
    label: 'A method override cannot hide render delegation behind Function call helpers',
    modulePath: 'app/components/monaco/MonacoCodeViewer.tsx',
    source: [
      "import { useMonacoCodeSurface } from './useMonacoCodeSurface';",
      'export function MonacoCodeViewer({ render }) {',
      '  const Surface = useMonacoCodeSurface();',
      '  const callbacks = { invoke(value) { return render.call(null, value); } };',
      '  const content = callbacks.invoke(useMonacoCodeSurface());',
      '  return <>{content}<Surface readOnly /></>;',
      '}',
    ].join('\n'),
    expectedViolation: 'useMonacoCodeSurface re-exported',
  },
  {
    label: 'A method override cannot hide render delegation behind Reflect apply',
    modulePath: 'app/components/monaco/MonacoCodeViewer.tsx',
    source: [
      "import { useMonacoCodeSurface } from './useMonacoCodeSurface';",
      'export function MonacoCodeViewer({ render }) {',
      '  const Surface = useMonacoCodeSurface();',
      '  const callbacks = { invoke(value) { return Reflect.apply(render, null, [value]); } };',
      '  const content = callbacks.invoke(useMonacoCodeSurface());',
      '  return <>{content}<Surface readOnly /></>;',
      '}',
    ].join('\n'),
    expectedViolation: 'useMonacoCodeSurface re-exported',
  },
  {
    label: 'A method override cannot hide render delegation behind an aliased Reflect apply',
    modulePath: 'app/components/monaco/MonacoCodeViewer.tsx',
    source: [
      "import { useMonacoCodeSurface } from './useMonacoCodeSurface';",
      'export function MonacoCodeViewer({ render }) {',
      '  const Surface = useMonacoCodeSurface();',
      '  const callbacks = { invoke(value) {',
      '    const apply = Reflect.apply;',
      '    return apply(render, null, [value]);',
      '  } };',
      '  const content = callbacks.invoke(useMonacoCodeSurface());',
      '  return <>{content}<Surface readOnly /></>;',
      '}',
    ].join('\n'),
    expectedViolation: 'useMonacoCodeSurface re-exported',
  },
  {
    label: 'A method override cannot destructure an alias of Reflect apply',
    modulePath: 'app/components/monaco/MonacoCodeViewer.tsx',
    source: [
      "import { useMonacoCodeSurface } from './useMonacoCodeSurface';",
      'export function MonacoCodeViewer({ render }) {',
      '  const Surface = useMonacoCodeSurface();',
      '  const callbacks = { invoke(value) {',
      '    const { apply } = Reflect;',
      '    return apply(render, null, [value]);',
      '  } };',
      '  const content = callbacks.invoke(useMonacoCodeSurface());',
      '  return <>{content}<Surface readOnly /></>;',
      '}',
    ].join('\n'),
    expectedViolation: 'useMonacoCodeSurface re-exported',
  },
  {
    label: 'A method override cannot default a destructured alias of Reflect apply',
    modulePath: 'app/components/monaco/MonacoCodeViewer.tsx',
    source: [
      "import { useMonacoCodeSurface } from './useMonacoCodeSurface';",
      'export function MonacoCodeViewer({ render }) {',
      '  const Surface = useMonacoCodeSurface();',
      '  const callbacks = { invoke(value) {',
      '    const { apply = Reflect.apply } = {};',
      '    return apply(render, null, [value]);',
      '  } };',
      '  const content = callbacks.invoke(useMonacoCodeSurface());',
      '  return <>{content}<Surface readOnly /></>;',
      '}',
    ].join('\n'),
    expectedViolation: 'useMonacoCodeSurface re-exported',
  },
  {
    label: 'A governed viewer cannot pass its loader through an inline composite member alias',
    modulePath: 'app/components/monaco/MonacoCodeViewer.tsx',
    source: [
      "import { useMonacoCodeSurface } from './useMonacoCodeSurface';",
      'export function MonacoCodeViewer({ render }) {',
      '  const Surface = useMonacoCodeSurface();',
      '  const invoke = ({ invoke: render }).invoke;',
      '  const content = invoke(useMonacoCodeSurface());',
      '  return <>{content}<Surface readOnly /></>;',
      '}',
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
    label: 'A governed viewer cannot attach its loader through an exported namespace merge',
    modulePath: 'app/components/monaco/MonacoCodeViewer.tsx',
    source: [
      "import { useMonacoCodeSurface } from './useMonacoCodeSurface';",
      'export function MonacoCodeViewer() {',
      '  const Surface = useMonacoCodeSurface();',
      '  return <Surface readOnly />;',
      '}',
      'export namespace MonacoCodeViewer {',
      '  export const loadSurface = useMonacoCodeSurface;',
      '}',
    ].join('\n'),
    expectedViolation: 'useMonacoCodeSurface re-exported',
  },
  {
    label: 'A governed viewer cannot mutate its exported gateway through a local alias',
    modulePath: 'app/components/monaco/MonacoCodeViewer.tsx',
    source: [
      "import { useMonacoCodeSurface } from './useMonacoCodeSurface';",
      'export function MonacoCodeViewer() {',
      '  const Surface = useMonacoCodeSurface();',
      '  return <Surface readOnly />;',
      '}',
      'const PublicViewer = MonacoCodeViewer;',
      'PublicViewer.loadSurface = useMonacoCodeSurface;',
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
    label: 'Templates cannot import an executable wrapper from test support',
    modulePath: 'app/views/templates/TemplatesRouteWorkbench.tsx',
    source: [
      "import { EditablePreview } from '../../testing/EditablePreview';",
      'void EditablePreview;',
    ].join('\n'),
    expectedViolation: 'production import from test support',
  },
  {
    label: 'Templates cannot import an executable sibling with an excluded test-support suffix',
    modulePath: 'app/views/templates/TemplatesRouteWorkbench.tsx',
    source: [
      "import { EditablePreview } from './EditablePreview.test.support';",
      'void EditablePreview;',
    ].join('\n'),
    expectedViolation: 'production import from test support',
  },
  {
    label: 'Templates cannot dynamically assemble an excluded test-support import',
    modulePath: 'app/views/templates/TemplatesRouteWorkbench.tsx',
    source: "void import('./EditablePreview.' + 'test.support');",
    expectedViolation: 'production import from test support',
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
    label: 'A production module may import Monaco viewer source as non-executable Vite raw text',
    modulePath: 'app/components/MonacoViewerSourceAsset.ts',
    source: [
      "import viewerSource from './monaco/MonacoCodeViewer.tsx?raw';",
      'void viewerSource;',
    ].join('\n'),
  },
  {
    label: 'A production module may import a Monaco viewer URL without acquiring its authority',
    modulePath: 'app/components/MonacoViewerSourceAsset.ts',
    source: ["import viewerUrl from './monaco/MonacoCodeViewer.tsx?url';", 'void viewerUrl;'].join(
      '\n'
    ),
  },
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
  {
    label: 'A governed viewer does not treat an unrelated destructured callback as a render prop',
    modulePath: 'app/components/monaco/MonacoCodeViewer.tsx',
    source: [
      "import { useMonacoCodeSurface } from './useMonacoCodeSurface';",
      'export function MonacoCodeViewer({ render }) {',
      '  const Surface = useMonacoCodeSurface();',
      '  const { invoke } = { invoke: () => null, retained: render };',
      '  const content = invoke(useMonacoCodeSurface());',
      '  return <>{content}<Surface readOnly /></>;',
      '}',
    ].join('\n'),
  },
  {
    label: 'A governed viewer tracks the precise callback member in a composite alias',
    modulePath: 'app/components/monaco/MonacoCodeViewer.tsx',
    source: [
      "import { useMonacoCodeSurface } from './useMonacoCodeSurface';",
      'export function MonacoCodeViewer({ render }) {',
      '  const Surface = useMonacoCodeSurface();',
      '  const callbacks = { invoke: () => null, retained: render };',
      '  const content = callbacks.invoke(useMonacoCodeSurface());',
      '  return <>{content}<Surface readOnly /></>;',
      '}',
    ].join('\n'),
  },
  {
    label: 'A governed viewer preserves member precision while destructuring a stored composite',
    modulePath: 'app/components/monaco/MonacoCodeViewer.tsx',
    source: [
      "import { useMonacoCodeSurface } from './useMonacoCodeSurface';",
      'export function MonacoCodeViewer({ render }) {',
      '  const Surface = useMonacoCodeSurface();',
      '  const callbacks = { invoke: () => null, retained: render };',
      '  const { invoke } = callbacks;',
      '  const content = invoke(useMonacoCodeSurface());',
      '  return <>{content}<Surface readOnly /></>;',
      '}',
    ].join('\n'),
  },
  {
    label: 'A governed viewer respects a local member that overrides an earlier governed spread',
    modulePath: 'app/components/monaco/MonacoCodeViewer.tsx',
    source: [
      "import { useMonacoCodeSurface } from './useMonacoCodeSurface';",
      'export function MonacoCodeViewer({ render }) {',
      '  const Surface = useMonacoCodeSurface();',
      '  const base = { invoke: render };',
      '  const callbacks = { ...base, invoke: () => null };',
      '  const content = callbacks.invoke(useMonacoCodeSurface());',
      '  return <>{content}<Surface readOnly /></>;',
      '}',
    ].join('\n'),
  },
  {
    label: 'A governed viewer accepts a local method override that does not delegate to render',
    modulePath: 'app/components/monaco/MonacoCodeViewer.tsx',
    source: [
      "import { useMonacoCodeSurface } from './useMonacoCodeSurface';",
      'export function MonacoCodeViewer({ render }) {',
      '  const Surface = useMonacoCodeSurface();',
      '  const base = { invoke: render };',
      '  const callbacks = { ...base, invoke() { return null; } };',
      '  const content = callbacks.invoke(useMonacoCodeSurface());',
      '  return <>{content}<Surface readOnly /></>;',
      '}',
    ].join('\n'),
  },
  {
    label: 'The inspector tabs may consume their governed Monaco viewer wrapper',
    modulePath: 'app/components/inspector/NodePropertiesTabs.tsx',
    source: [
      "import { NodePropertySectionView } from './NodePropertySectionView';",
      'void NodePropertySectionView;',
    ].join('\n'),
  },
  {
    label: 'The artifact tabs may consume their governed Monaco viewer wrapper',
    modulePath: 'app/views/artifacts/ArtifactPreviewTabs.tsx',
    source: [
      "import { ArtifactMonacoPreviewPanel } from './ArtifactMonacoPreviewPanel';",
      'void ArtifactMonacoPreviewPanel;',
    ].join('\n'),
  },
  {
    label: 'The Canvas node workbench may consume the inspector wrapper chain',
    modulePath: 'app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
    source: [
      "import { NodePropertiesTabs } from '../../components/inspector/NodePropertiesTabs';",
      'void NodePropertiesTabs;',
    ].join('\n'),
  },
  {
    label: 'The Artifacts route may consume its governed preview tabs wrapper',
    modulePath: 'app/views/ArtifactsView.tsx',
    source: [
      "import { ArtifactPreviewTabs } from './artifacts/ArtifactPreviewTabs';",
      'void ArtifactPreviewTabs;',
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

const EXCLUDED_TEST_SOURCE_PATH_PATTERN = /\.(?:test(?:Fixtures|Harness|Support)?|spec)(?:\.|$)/i;

function isProductionSourceFileName(fileName: string): boolean {
  return (
    /\.(?:[cm]?[jt]sx?)$/.test(fileName) &&
    !/\.d\.[cm]?ts$/.test(fileName) &&
    !EXCLUDED_TEST_SOURCE_PATH_PATTERN.test(fileName)
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
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments[0] &&
      ts.isStringLiteralLike(node.arguments[0])
    ) {
      specifiers.add(node.arguments[0].text);
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
  const renderElementBindings = new Set(['createElement']);
  const cloneElementBindings = new Set(['cloneElement']);
  const jsxRuntimeFactories = new Set(['jsx', 'jsxs', 'jsxDEV']);

  function unwrapExpression(expression: ts.Expression): ts.Expression {
    let unwrapped = expression;
    while (
      ts.isParenthesizedExpression(unwrapped) ||
      ts.isAsExpression(unwrapped) ||
      ts.isTypeAssertionExpression(unwrapped) ||
      ts.isNonNullExpression(unwrapped) ||
      ts.isSatisfiesExpression(unwrapped)
    ) {
      unwrapped = unwrapped.expression;
    }
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

  function addBinding(bindings: Set<string>, binding: string): boolean {
    if (bindings.has(binding)) return false;
    bindings.add(binding);
    return true;
  }

  function copyBindingMembers(
    bindings: Set<string>,
    sourcePath: string,
    targetPath: string
  ): boolean {
    let discovered = false;
    for (const binding of [...bindings]) {
      if (!binding.startsWith(`${sourcePath}.`)) continue;
      discovered =
        addBinding(bindings, `${targetPath}${binding.slice(sourcePath.length)}`) || discovered;
    }
    return discovered;
  }

  function expressionProducesBinding(
    bindings: Set<string>,
    expression: ts.Expression,
    isDirectBinding: (candidate: ts.Node) => boolean
  ): boolean {
    const candidate = unwrapExpression(expression);
    if (isDirectBinding(candidate)) return true;
    const candidatePath = readExpressionPath(candidate);
    if (candidatePath && bindings.has(candidatePath)) return true;
    if (ts.isConditionalExpression(candidate)) {
      return (
        expressionProducesBinding(bindings, candidate.whenTrue, isDirectBinding) ||
        expressionProducesBinding(bindings, candidate.whenFalse, isDirectBinding)
      );
    }
    if (ts.isBinaryExpression(candidate)) {
      switch (candidate.operatorToken.kind) {
        case ts.SyntaxKind.AmpersandAmpersandToken:
        case ts.SyntaxKind.BarBarToken:
        case ts.SyntaxKind.QuestionQuestionToken:
        case ts.SyntaxKind.CommaToken:
        case ts.SyntaxKind.EqualsToken:
          return (
            expressionProducesBinding(bindings, candidate.left, isDirectBinding) ||
            expressionProducesBinding(bindings, candidate.right, isDirectBinding)
          );
        default:
          return false;
      }
    }
    if (ts.isAwaitExpression(candidate)) {
      return expressionProducesBinding(bindings, candidate.expression, isDirectBinding);
    }
    if (ts.isCallExpression(candidate) || ts.isNewExpression(candidate)) {
      return (candidate.arguments ?? []).some((argument) =>
        expressionContainsBinding(bindings, argument, isDirectBinding)
      );
    }
    return false;
  }

  function expressionContainsBinding(
    bindings: Set<string>,
    expression: ts.Expression,
    isDirectBinding: (candidate: ts.Node) => boolean
  ): boolean {
    const candidate = unwrapExpression(expression);
    if (expressionProducesBinding(bindings, candidate, isDirectBinding)) return true;
    if (ts.isArrayLiteralExpression(candidate)) {
      return candidate.elements.some(
        (element) =>
          !ts.isOmittedExpression(element) &&
          expressionContainsBinding(
            bindings,
            ts.isSpreadElement(element) ? element.expression : element,
            isDirectBinding
          )
      );
    }
    if (!ts.isObjectLiteralExpression(candidate)) return false;
    return candidate.properties.some((property) => {
      if (ts.isSpreadAssignment(property)) {
        return expressionContainsBinding(bindings, property.expression, isDirectBinding);
      }
      if (ts.isShorthandPropertyAssignment(property)) {
        return bindings.has(property.name.text);
      }
      return (
        ts.isPropertyAssignment(property) &&
        expressionContainsBinding(bindings, property.initializer, isDirectBinding)
      );
    });
  }

  function discoverCompositeBindings(
    bindings: Set<string>,
    targetPath: string,
    expression: ts.Expression,
    isDirectBinding: (candidate: ts.Node) => boolean = () => false
  ): boolean {
    let discovered = false;
    const initializer = unwrapExpression(expression);
    const initializerPath = readExpressionPath(initializer);
    if (expressionProducesBinding(bindings, initializer, isDirectBinding)) {
      discovered = addBinding(bindings, targetPath) || discovered;
    }
    if (initializerPath) {
      discovered =
        (bindings.has(initializerPath) && addBinding(bindings, targetPath)) || discovered;
      discovered = copyBindingMembers(bindings, initializerPath, targetPath) || discovered;
    }
    if (ts.isArrayLiteralExpression(initializer)) {
      for (const [index, element] of initializer.elements.entries()) {
        if (ts.isOmittedExpression(element)) continue;
        if (ts.isSpreadElement(element)) {
          discovered =
            discoverCompositeBindings(bindings, targetPath, element.expression, isDirectBinding) ||
            discovered;
          continue;
        }
        discovered =
          discoverCompositeBindings(bindings, `${targetPath}.${index}`, element, isDirectBinding) ||
          discovered;
      }
      return discovered;
    }
    if (!ts.isObjectLiteralExpression(initializer)) return discovered;

    for (const property of initializer.properties) {
      if (ts.isSpreadAssignment(property)) {
        discovered =
          discoverCompositeBindings(bindings, targetPath, property.expression, isDirectBinding) ||
          discovered;
        continue;
      }
      if (ts.isShorthandPropertyAssignment(property)) {
        discovered =
          discoverCompositeBindings(
            bindings,
            `${targetPath}.${property.name.text}`,
            property.name,
            isDirectBinding
          ) || discovered;
        continue;
      }
      if (ts.isMethodDeclaration(property)) {
        const propertyName = readStaticPropertyName(property.name);
        if (propertyName && isDirectBinding(property)) {
          discovered = addBinding(bindings, `${targetPath}.${propertyName}`) || discovered;
        }
        continue;
      }
      if (!ts.isPropertyAssignment(property)) continue;
      const propertyName = readStaticPropertyName(property.name);
      if (!propertyName) continue;
      discovered =
        discoverCompositeBindings(
          bindings,
          `${targetPath}.${propertyName}`,
          property.initializer,
          isDirectBinding
        ) || discovered;
    }
    return discovered;
  }

  function discoverBindingPatternBindings(
    bindings: Set<string>,
    pattern: ts.BindingPattern,
    initializer: ts.Expression,
    isDirectBinding: (candidate: ts.Node) => boolean = () => false
  ): boolean {
    const rootPath = `__destructured_${pattern.pos}`;
    let discovered = discoverCompositeBindings(bindings, rootPath, initializer, isDirectBinding);

    function bindInitializer(name: ts.BindingName, defaultValue: ts.Expression): void {
      discovered =
        (ts.isIdentifier(name)
          ? discoverCompositeBindings(bindings, name.text, defaultValue, isDirectBinding)
          : discoverBindingPatternBindings(bindings, name, defaultValue, isDirectBinding)) ||
        discovered;
    }

    function bindName(name: ts.BindingName, sourcePath: string): void {
      if (ts.isIdentifier(name)) {
        discovered = (bindings.has(sourcePath) && addBinding(bindings, name.text)) || discovered;
        discovered = copyBindingMembers(bindings, sourcePath, name.text) || discovered;
        return;
      }
      bindPattern(name, sourcePath);
    }

    function bindPattern(bindingPattern: ts.BindingPattern, sourcePath: string): void {
      if (ts.isObjectBindingPattern(bindingPattern)) {
        for (const element of bindingPattern.elements) {
          if (element.dotDotDotToken) {
            if (ts.isIdentifier(element.name)) {
              discovered =
                copyBindingMembers(bindings, sourcePath, element.name.text) || discovered;
            }
            continue;
          }
          if (element.initializer) bindInitializer(element.name, element.initializer);
          const propertyName = element.propertyName
            ? readStaticPropertyName(element.propertyName)
            : ts.isIdentifier(element.name)
              ? element.name.text
              : undefined;
          if (propertyName) bindName(element.name, `${sourcePath}.${propertyName}`);
        }
        return;
      }
      for (const [index, element] of bindingPattern.elements.entries()) {
        if (ts.isOmittedExpression(element)) continue;
        if (element.dotDotDotToken) {
          if (ts.isIdentifier(element.name)) {
            discovered = copyBindingMembers(bindings, sourcePath, element.name.text) || discovered;
          }
          continue;
        }
        if (element.initializer) bindInitializer(element.name, element.initializer);
        bindName(element.name, `${sourcePath}.${index}`);
      }
    }

    bindPattern(pattern, rootPath);
    return discovered;
  }

  function discoverAssignmentTargetBindings(
    bindings: Set<string>,
    target: ts.Expression,
    initializer: ts.Expression,
    isDirectBinding: (candidate: ts.Node) => boolean = () => false
  ): boolean {
    const unwrappedTarget = unwrapExpression(target);
    const targetPath = readExpressionPath(unwrappedTarget);
    if (targetPath) {
      return discoverCompositeBindings(bindings, targetPath, initializer, isDirectBinding);
    }

    const rootPath = `__assigned_${unwrappedTarget.pos}`;
    let discovered = discoverCompositeBindings(bindings, rootPath, initializer, isDirectBinding);

    function bindTarget(candidate: ts.Expression, sourcePath: string): void {
      const unwrappedCandidate = unwrapExpression(candidate);
      const candidatePath = readExpressionPath(unwrappedCandidate);
      if (candidatePath) {
        discovered =
          (bindings.has(sourcePath) && addBinding(bindings, candidatePath)) || discovered;
        discovered = copyBindingMembers(bindings, sourcePath, candidatePath) || discovered;
        return;
      }
      if (
        ts.isBinaryExpression(unwrappedCandidate) &&
        unwrappedCandidate.operatorToken.kind === ts.SyntaxKind.EqualsToken
      ) {
        bindTarget(unwrappedCandidate.left, sourcePath);
        return;
      }
      if (ts.isObjectLiteralExpression(unwrappedCandidate)) {
        for (const property of unwrappedCandidate.properties) {
          if (ts.isSpreadAssignment(property)) {
            const restPath = readExpressionPath(unwrapExpression(property.expression));
            if (restPath) {
              discovered = copyBindingMembers(bindings, sourcePath, restPath) || discovered;
            }
            continue;
          }
          if (ts.isShorthandPropertyAssignment(property)) {
            bindTarget(property.name, `${sourcePath}.${property.name.text}`);
            continue;
          }
          if (!ts.isPropertyAssignment(property)) continue;
          const propertyName = readStaticPropertyName(property.name);
          if (propertyName) bindTarget(property.initializer, `${sourcePath}.${propertyName}`);
        }
        return;
      }
      if (!ts.isArrayLiteralExpression(unwrappedCandidate)) return;
      for (const [index, element] of unwrappedCandidate.elements.entries()) {
        if (ts.isOmittedExpression(element)) continue;
        if (ts.isSpreadElement(element)) {
          const restPath = readExpressionPath(unwrapExpression(element.expression));
          if (restPath) {
            discovered = copyBindingMembers(bindings, sourcePath, restPath) || discovered;
          }
          continue;
        }
        bindTarget(element, `${sourcePath}.${index}`);
      }
    }

    bindTarget(unwrappedTarget, rootPath);
    return discovered;
  }

  for (const statement of sourceFile.statements) {
    if (
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteralLike(statement.moduleSpecifier) &&
      statement.moduleSpecifier.text === 'react' &&
      statement.importClause
    ) {
      if (statement.importClause.name) {
        renderElementBindings.add(`${statement.importClause.name.text}.createElement`);
        cloneElementBindings.add(`${statement.importClause.name.text}.cloneElement`);
      }
      const reactBindings = statement.importClause.namedBindings;
      if (reactBindings && ts.isNamespaceImport(reactBindings)) {
        renderElementBindings.add(`${reactBindings.name.text}.createElement`);
        cloneElementBindings.add(`${reactBindings.name.text}.cloneElement`);
      }
      if (reactBindings && ts.isNamedImports(reactBindings)) {
        for (const element of reactBindings.elements) {
          const importedName = (element.propertyName ?? element.name).text;
          if (importedName === 'createElement') {
            renderElementBindings.add(element.name.text);
          }
          if (importedName === 'cloneElement') {
            cloneElementBindings.add(element.name.text);
          }
        }
      }
    }
    if (
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteralLike(statement.moduleSpecifier) &&
      (statement.moduleSpecifier.text === 'react/jsx-runtime' ||
        statement.moduleSpecifier.text === 'react/jsx-dev-runtime') &&
      statement.importClause?.namedBindings
    ) {
      const runtimeBindings = statement.importClause.namedBindings;
      if (ts.isNamespaceImport(runtimeBindings)) {
        for (const factory of jsxRuntimeFactories) {
          renderElementBindings.add(`${runtimeBindings.name.text}.${factory}`);
        }
      } else {
        for (const element of runtimeBindings.elements) {
          if (jsxRuntimeFactories.has((element.propertyName ?? element.name).text)) {
            renderElementBindings.add(element.name.text);
          }
        }
      }
    }
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteralLike(statement.moduleSpecifier) ||
      !/\/?useMonacoCodeSurface(?:\.[cm]?[jt]s)?$/.test(statement.moduleSpecifier.text) ||
      !statement.importClause?.namedBindings
    ) {
      continue;
    }
    const namedBindings = statement.importClause.namedBindings;
    if (ts.isNamespaceImport(namedBindings)) {
      hookBindings.add(`${namedBindings.name.text}.useMonacoCodeSurface`);
      continue;
    }
    for (const element of namedBindings.elements) {
      if ((element.propertyName ?? element.name).text === 'useMonacoCodeSurface') {
        hookBindings.add(element.name.text);
      }
    }
  }

  function expressionProducesHookResult(expression: ts.Node): boolean {
    if (!ts.isExpression(expression)) return false;
    const candidate = unwrapExpression(expression);
    if (
      ts.isCallExpression(candidate) &&
      hookBindings.has(readExpressionPath(candidate.expression) ?? '')
    ) {
      return true;
    }
    if (ts.isConditionalExpression(candidate)) {
      return (
        expressionProducesHookResult(candidate.whenTrue) ||
        expressionProducesHookResult(candidate.whenFalse)
      );
    }
    if (ts.isBinaryExpression(candidate)) {
      switch (candidate.operatorToken.kind) {
        case ts.SyntaxKind.AmpersandAmpersandToken:
        case ts.SyntaxKind.BarBarToken:
        case ts.SyntaxKind.QuestionQuestionToken:
        case ts.SyntaxKind.CommaToken:
        case ts.SyntaxKind.EqualsToken:
          return (
            expressionProducesHookResult(candidate.left) ||
            expressionProducesHookResult(candidate.right)
          );
        default:
          return false;
      }
    }
    if (ts.isAwaitExpression(candidate)) {
      return expressionProducesHookResult(candidate.expression);
    }
    return false;
  }

  type RuntimeFunctionLike =
    | ts.FunctionDeclaration
    | ts.FunctionExpression
    | ts.ArrowFunction
    | ts.MethodDeclaration
    | ts.GetAccessorDeclaration
    | ts.SetAccessorDeclaration;

  function isRuntimeFunctionLike(node: ts.Node): node is RuntimeFunctionLike {
    return (
      ts.isFunctionDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      ts.isArrowFunction(node) ||
      ts.isMethodDeclaration(node) ||
      ts.isGetAccessorDeclaration(node) ||
      ts.isSetAccessorDeclaration(node)
    );
  }

  function callableReturnsHookResult(node: ts.Node): boolean {
    if (!isRuntimeFunctionLike(node) || !node.body) return false;
    const body = node.body;
    if (!ts.isBlock(body)) return expressionProducesHookResult(body);

    const localSurfaceBindings = new Set<string>();
    let discoveredLocalSurfaceBinding = true;
    while (discoveredLocalSurfaceBinding) {
      discoveredLocalSurfaceBinding = false;
      function discoverLocalSurfaceBindings(candidate: ts.Node): void {
        if (candidate !== body && isRuntimeFunctionLike(candidate)) return;
        if (ts.isVariableDeclaration(candidate) && candidate.initializer) {
          const initializer = unwrapExpression(candidate.initializer);
          if (ts.isIdentifier(candidate.name)) {
            discoveredLocalSurfaceBinding =
              discoverCompositeBindings(
                localSurfaceBindings,
                candidate.name.text,
                initializer,
                expressionProducesHookResult
              ) || discoveredLocalSurfaceBinding;
          } else {
            discoveredLocalSurfaceBinding =
              discoverBindingPatternBindings(
                localSurfaceBindings,
                candidate.name,
                initializer,
                expressionProducesHookResult
              ) || discoveredLocalSurfaceBinding;
          }
        }
        if (
          ts.isBinaryExpression(candidate) &&
          candidate.operatorToken.kind === ts.SyntaxKind.EqualsToken
        ) {
          discoveredLocalSurfaceBinding =
            discoverAssignmentTargetBindings(
              localSurfaceBindings,
              candidate.left,
              candidate.right,
              expressionProducesHookResult
            ) || discoveredLocalSurfaceBinding;
        }
        ts.forEachChild(candidate, discoverLocalSurfaceBindings);
      }
      discoverLocalSurfaceBindings(body);
    }

    let returnsHookResult = false;
    function visitReturn(candidate: ts.Node): void {
      if (returnsHookResult) return;
      if (candidate !== body && isRuntimeFunctionLike(candidate)) return;
      if (
        ts.isReturnStatement(candidate) &&
        candidate.expression &&
        expressionProducesBinding(
          localSurfaceBindings,
          candidate.expression,
          expressionProducesHookResult
        )
      ) {
        returnsHookResult = true;
        return;
      }
      ts.forEachChild(candidate, visitReturn);
    }
    visitReturn(body);
    return returnsHookResult;
  }

  function isHookResult(candidate: ts.Node): boolean {
    return expressionProducesHookResult(candidate);
  }

  let discoveredHookBinding = true;
  while (discoveredHookBinding) {
    discoveredHookBinding = false;
    function discoverHookBindings(node: ts.Node): void {
      if (ts.isFunctionDeclaration(node) && node.name && callableReturnsHookResult(node)) {
        discoveredHookBinding = addBinding(hookBindings, node.name.text) || discoveredHookBinding;
      }
      if ((ts.isVariableDeclaration(node) || ts.isParameter(node)) && node.initializer) {
        const initializer = unwrapExpression(node.initializer);
        if (ts.isIdentifier(node.name)) {
          discoveredHookBinding =
            discoverCompositeBindings(
              hookBindings,
              node.name.text,
              initializer,
              callableReturnsHookResult
            ) || discoveredHookBinding;
        } else {
          discoveredHookBinding =
            discoverBindingPatternBindings(
              hookBindings,
              node.name,
              initializer,
              callableReturnsHookResult
            ) || discoveredHookBinding;
        }
      }
      if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
        discoveredHookBinding =
          discoverAssignmentTargetBindings(
            hookBindings,
            node.left,
            node.right,
            callableReturnsHookResult
          ) || discoveredHookBinding;
      }
      ts.forEachChild(node, discoverHookBindings);
    }
    discoverHookBindings(sourceFile);
  }

  function discoverCallableBindings(
    bindings: Set<string>,
    isDirectBinding: (candidate: ts.Node) => boolean = () => false
  ): void {
    let discoveredBinding = true;
    while (discoveredBinding) {
      discoveredBinding = false;
      function visitBinding(node: ts.Node): void {
        if ((ts.isVariableDeclaration(node) || ts.isParameter(node)) && node.initializer) {
          const initializer = unwrapExpression(node.initializer);
          if (ts.isIdentifier(node.name)) {
            discoveredBinding =
              discoverCompositeBindings(bindings, node.name.text, initializer, isDirectBinding) ||
              discoveredBinding;
          } else {
            discoveredBinding =
              discoverBindingPatternBindings(bindings, node.name, initializer, isDirectBinding) ||
              discoveredBinding;
          }
        }
        if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
          discoveredBinding =
            discoverAssignmentTargetBindings(bindings, node.left, node.right, isDirectBinding) ||
            discoveredBinding;
        }
        ts.forEachChild(node, visitBinding);
      }
      visitBinding(sourceFile);
    }
  }

  discoverCallableBindings(renderElementBindings);
  discoverCallableBindings(cloneElementBindings);

  let discoveredSurfaceBinding = true;
  while (discoveredSurfaceBinding) {
    discoveredSurfaceBinding = false;
    function discoverSurfaceBindings(node: ts.Node): void {
      if ((ts.isVariableDeclaration(node) || ts.isParameter(node)) && node.initializer) {
        const initializer = unwrapExpression(node.initializer);
        if (ts.isIdentifier(node.name)) {
          discoveredSurfaceBinding =
            discoverCompositeBindings(surfaceBindings, node.name.text, initializer, isHookResult) ||
            discoveredSurfaceBinding;
        } else {
          discoveredSurfaceBinding =
            discoverBindingPatternBindings(surfaceBindings, node.name, initializer, isHookResult) ||
            discoveredSurfaceBinding;
        }
      }
      if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
        discoveredSurfaceBinding =
          discoverAssignmentTargetBindings(surfaceBindings, node.left, node.right, isHookResult) ||
          discoveredSurfaceBinding;
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

  function clonePropertiesPreserveReadOnly(expression: ts.Expression | undefined): boolean {
    if (!expression) return true;
    const properties = unwrapExpression(expression);
    if (!ts.isObjectLiteralExpression(properties)) return false;
    let preservesReadOnly = true;
    for (const property of properties.properties) {
      if (ts.isSpreadAssignment(property)) {
        preservesReadOnly = false;
        continue;
      }
      if (ts.isShorthandPropertyAssignment(property) && property.name.text === 'readOnly') {
        preservesReadOnly = false;
        continue;
      }
      if (ts.isPropertyAssignment(property)) {
        const propertyName = readStaticPropertyName(property.name);
        if (propertyName === 'readOnly') {
          preservesReadOnly = isStaticTrue(property.initializer);
        } else if (ts.isComputedPropertyName(property.name) && propertyName == null) {
          preservesReadOnly = false;
        }
      }
    }
    return preservesReadOnly;
  }

  function isSurfaceElementExpression(expression: ts.Node): boolean {
    if (!ts.isExpression(expression)) return false;
    const candidate = unwrapExpression(expression);
    if (ts.isJsxElement(candidate)) {
      return surfaceBindings.has(readExpressionPath(candidate.openingElement.tagName) ?? '');
    }
    if (ts.isJsxSelfClosingElement(candidate)) {
      return surfaceBindings.has(readExpressionPath(candidate.tagName) ?? '');
    }
    return (
      ts.isCallExpression(candidate) &&
      renderElementBindings.has(readExpressionPath(candidate.expression) ?? '') &&
      Boolean(
        candidate.arguments[0] &&
        surfaceBindings.has(readExpressionPath(candidate.arguments[0]) ?? '')
      )
    );
  }

  const surfaceElementBindings = new Set<string>();
  discoverCallableBindings(surfaceElementBindings, isSurfaceElementExpression);

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
      renderElementBindings.has(readExpressionPath(node.expression) ?? '') &&
      node.arguments[0] &&
      surfaceBindings.has(readExpressionPath(node.arguments[0]) ?? '')
    ) {
      renderedSurfaceCount += 1;
      if (!objectPropertiesAreReadOnly(node.arguments[1])) {
        violations.push('MonacoCodeViewer rendered a writable or dynamic surface');
      }
    }
    if (
      ts.isCallExpression(node) &&
      cloneElementBindings.has(readExpressionPath(node.expression) ?? '') &&
      node.arguments[0] &&
      expressionProducesBinding(
        surfaceElementBindings,
        node.arguments[0],
        isSurfaceElementExpression
      ) &&
      !clonePropertiesPreserveReadOnly(node.arguments[1])
    ) {
      violations.push('MonacoCodeViewer rendered a writable or dynamic surface');
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
  const runtimeLexicalBindingInitializers = new Map<ts.Node, Map<string, ts.Expression>>();
  const runtimeExportedBindings = new Set<string>();
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

  function addLocalBindingInitializers(
    name: ts.BindingName,
    initializer: ts.Expression,
    bindings: Map<string, ts.Expression> = runtimeLocalBindingInitializers
  ): void {
    if (ts.isIdentifier(name)) {
      bindings.set(name.text, initializer);
      return;
    }
    for (const element of name.elements) {
      if (!ts.isOmittedExpression(element)) {
        addLocalBindingInitializers(element.name, initializer, bindings);
      }
    }
  }

  function readLexicalScope(node: ts.Node): ts.Node {
    let scope = node.parent;
    while (scope && !ts.isSourceFile(scope) && !ts.isBlock(scope) && !ts.isFunctionLike(scope)) {
      scope = scope.parent;
    }
    return scope ?? sourceFile;
  }

  function collectLexicalBindingInitializers(node: ts.Node): void {
    if ((ts.isVariableDeclaration(node) || ts.isParameter(node)) && node.initializer) {
      const scope = readLexicalScope(node);
      let bindings = runtimeLexicalBindingInitializers.get(scope);
      if (!bindings) {
        bindings = new Map<string, ts.Expression>();
        runtimeLexicalBindingInitializers.set(scope, bindings);
      }
      addLocalBindingInitializers(node.name, node.initializer, bindings);
    }
    ts.forEachChild(node, collectLexicalBindingInitializers);
  }

  function readLexicalBindingInitializer(identifier: ts.Identifier): ts.Expression | undefined {
    let scope: ts.Node | undefined = identifier.parent;
    while (scope) {
      const initializer = runtimeLexicalBindingInitializers.get(scope)?.get(identifier.text);
      if (initializer) return initializer;
      scope = scope.parent;
    }
    return runtimeLocalBindingInitializers.get(identifier.text);
  }

  function addExportedBindings(statement: ts.Statement): void {
    if (ts.isExportDeclaration(statement) && statement.exportClause) {
      if (ts.isNamedExports(statement.exportClause) && !statement.moduleSpecifier) {
        for (const element of statement.exportClause.elements) {
          runtimeExportedBindings.add((element.propertyName ?? element.name).text);
        }
      }
      return;
    }
    const modifiers = ts.canHaveModifiers(statement) ? ts.getModifiers(statement) : undefined;
    if (!modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) return;
    if (
      (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) &&
      statement.name
    ) {
      runtimeExportedBindings.add(statement.name.text);
    }
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        for (const name of collectBindingNames(declaration.name)) runtimeExportedBindings.add(name);
      }
    }
  }

  function readMutationRoot(expression: ts.Expression): string | undefined {
    if (ts.isIdentifier(expression)) return expression.text;
    if (ts.isParenthesizedExpression(expression)) return readMutationRoot(expression.expression);
    if (ts.isPropertyAccessExpression(expression) || ts.isElementAccessExpression(expression)) {
      return readMutationRoot(expression.expression);
    }
    return undefined;
  }

  function expressionMayReferenceExportedObject(expression: ts.Expression): boolean {
    if (ts.isParenthesizedExpression(expression)) {
      return expressionMayReferenceExportedObject(expression.expression);
    }
    if (ts.isIdentifier(expression)) return runtimeExportedBindings.has(expression.text);
    if (ts.isConditionalExpression(expression)) {
      return (
        expressionMayReferenceExportedObject(expression.whenTrue) ||
        expressionMayReferenceExportedObject(expression.whenFalse)
      );
    }
    if (ts.isBinaryExpression(expression)) {
      switch (expression.operatorToken.kind) {
        case ts.SyntaxKind.AmpersandAmpersandToken:
        case ts.SyntaxKind.BarBarToken:
        case ts.SyntaxKind.QuestionQuestionToken:
        case ts.SyntaxKind.CommaToken:
        case ts.SyntaxKind.EqualsToken:
          return (
            expressionMayReferenceExportedObject(expression.left) ||
            expressionMayReferenceExportedObject(expression.right)
          );
        default:
          return false;
      }
    }
    if (ts.isAwaitExpression(expression)) {
      return expressionMayReferenceExportedObject(expression.expression);
    }
    if (ts.isCallExpression(expression) || ts.isNewExpression(expression)) {
      return (expression.arguments ?? []).some(expressionMayReferenceExportedObject);
    }
    return false;
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
    resolvingLocalBindings: ReadonlySet<string> = new Set(),
    localBindingInitializers: ReadonlyMap<string, ts.Expression> = runtimeLocalBindingInitializers
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
      const initializer = localBindingInitializers.get(node.text);
      if (initializer) {
        addReExportedExpression(
          initializer,
          bindings,
          new Set([...resolvingLocalBindings, node.text]),
          localBindingInitializers
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
      if (isJsxRuntimeCall || isRenderCall) {
        for (const argument of (node.arguments ?? []).slice(1)) {
          addReExportedExpression(
            argument,
            bindings,
            resolvingLocalBindings,
            localBindingInitializers
          );
        }
        return;
      }
      if (calledSpecifier) runtimeReExportedSpecifiers.add(calledSpecifier);
      for (const argument of node.arguments ?? []) {
        addReExportedExpression(
          argument,
          bindings,
          resolvingLocalBindings,
          localBindingInitializers
        );
      }
      return;
    }
    ts.forEachChild(node, (child) =>
      addReExportedExpression(child, bindings, resolvingLocalBindings, localBindingInitializers)
    );
  }

  function addExportedDeclarationAuthorities(
    node: ts.FunctionDeclaration | ts.ClassDeclaration
  ): void {
    const declarationBindings = new Map(runtimeImportedBindings);
    const guardsViewerRenderPropAuthority =
      modulePath === 'app/components/monaco/MonacoCodeViewer.tsx';
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

    function visitReturnedAuthority(child: ts.Node, callableRoot: ts.Node): void {
      if (child !== callableRoot && ts.isFunctionLike(child)) return;
      if (ts.isReturnStatement(child) && child.expression) {
        addReExportedExpression(child.expression, declarationBindings);
        return;
      }
      ts.forEachChild(child, (nestedChild) => visitReturnedAuthority(nestedChild, callableRoot));
    }

    function visitInvokedParameterAuthorities(
      parameters: readonly ts.ParameterDeclaration[],
      body: ts.Block
    ): void {
      const parameterBindings = new Set(
        parameters.flatMap((parameter) => collectBindingNames(parameter.name))
      );
      function unwrapParameterAliasExpression(expression: ts.Expression): ts.Expression {
        let candidate = expression;
        while (
          ts.isParenthesizedExpression(candidate) ||
          ts.isAsExpression(candidate) ||
          ts.isTypeAssertionExpression(candidate) ||
          ts.isNonNullExpression(candidate) ||
          ts.isSatisfiesExpression(candidate)
        ) {
          candidate = candidate.expression;
        }
        return candidate;
      }
      function readParameterAliasPath(expression: ts.Expression): string | undefined {
        expression = unwrapParameterAliasExpression(expression);
        if (ts.isIdentifier(expression)) return expression.text;
        if (ts.isPropertyAccessExpression(expression)) {
          const ownerPath = readParameterAliasPath(expression.expression);
          return ownerPath ? `${ownerPath}.${expression.name.text}` : undefined;
        }
        if (
          ts.isElementAccessExpression(expression) &&
          expression.argumentExpression &&
          (ts.isStringLiteralLike(expression.argumentExpression) ||
            ts.isNumericLiteral(expression.argumentExpression))
        ) {
          const ownerPath = readParameterAliasPath(expression.expression);
          return ownerPath ? `${ownerPath}.${expression.argumentExpression.text}` : undefined;
        }
        return undefined;
      }
      function readParameterAliasRoots(expression: ts.Expression): string[] {
        expression = unwrapParameterAliasExpression(expression);
        const bindingPath = readParameterAliasPath(expression);
        if (bindingPath) return [bindingPath];
        if (ts.isPropertyAccessExpression(expression)) {
          const owner = unwrapParameterAliasExpression(expression.expression);
          if (ts.isObjectLiteralExpression(owner)) {
            const property = [...owner.properties]
              .reverse()
              .find(
                (candidateProperty) =>
                  !ts.isSpreadAssignment(candidateProperty) &&
                  readStaticPropertyName(candidateProperty.name) === expression.name.text
              );
            if (property && ts.isPropertyAssignment(property)) {
              return readParameterAliasRoots(property.initializer);
            }
            if (property && ts.isShorthandPropertyAssignment(property)) {
              return readParameterAliasRoots(property.name);
            }
          }
        }
        if (ts.isElementAccessExpression(expression) && expression.argumentExpression) {
          const owner = unwrapParameterAliasExpression(expression.expression);
          if (
            ts.isArrayLiteralExpression(owner) &&
            ts.isNumericLiteral(expression.argumentExpression)
          ) {
            const element = owner.elements[Number(expression.argumentExpression.text)];
            if (element && !ts.isOmittedExpression(element)) {
              return readParameterAliasRoots(
                ts.isSpreadElement(element) ? element.expression : element
              );
            }
          }
        }
        if (ts.isConditionalExpression(expression)) {
          return [
            ...readParameterAliasRoots(expression.whenTrue),
            ...readParameterAliasRoots(expression.whenFalse),
          ];
        }
        if (ts.isBinaryExpression(expression)) {
          switch (expression.operatorToken.kind) {
            case ts.SyntaxKind.AmpersandAmpersandToken:
            case ts.SyntaxKind.BarBarToken:
            case ts.SyntaxKind.QuestionQuestionToken:
            case ts.SyntaxKind.CommaToken:
            case ts.SyntaxKind.EqualsToken:
              return [
                ...readParameterAliasRoots(expression.left),
                ...readParameterAliasRoots(expression.right),
              ];
            default:
              return [];
          }
        }
        if (ts.isAwaitExpression(expression)) {
          return readParameterAliasRoots(expression.expression);
        }
        return [];
      }
      const parameterAliasEdges: Array<Readonly<{ sources: string[]; targets: string[] }>> = [];
      const parameterMemberAliasEdges: Array<
        Readonly<{ sourcePrefix: string; targetPrefix: string; excludedMembers: string[] }>
      > = [];
      function addParameterAliasEdge(sources: string[], targets: string[]): void {
        const uniqueSources = [...new Set(sources)];
        const uniqueTargets = [...new Set(targets)];
        if (uniqueSources.length === 0 || uniqueTargets.length === 0) return;
        parameterAliasEdges.push({ sources: uniqueSources, targets: uniqueTargets });
      }
      function addParameterMemberAliasEdge(
        sourcePrefix: string,
        targetPrefix: string,
        excludedMembers: string[] = []
      ): void {
        parameterMemberAliasEdges.push({
          sourcePrefix,
          targetPrefix,
          excludedMembers: [...new Set(excludedMembers)],
        });
      }
      function collectCallableDelegateSources(callable: ts.FunctionLikeDeclaration): string[] {
        const sources = new Set<string>();
        const reflectApplyBindings = new Set(['Reflect.apply']);
        const reflectApplyAliasEdges: Array<Readonly<{ source: string; target: string }>> = [];
        function collectReflectApplyPathAliases(
          bindingName: ts.BindingName,
          sourcePath: string
        ): void {
          if (ts.isIdentifier(bindingName)) {
            reflectApplyAliasEdges.push({ source: sourcePath, target: bindingName.text });
            return;
          }
          if (ts.isObjectBindingPattern(bindingName)) {
            for (const element of bindingName.elements) {
              if (element.dotDotDotToken) continue;
              const propertyName = element.propertyName
                ? readStaticPropertyName(element.propertyName)
                : ts.isIdentifier(element.name)
                  ? element.name.text
                  : undefined;
              if (propertyName) {
                collectReflectApplyPathAliases(element.name, `${sourcePath}.${propertyName}`);
                if (
                  element.initializer &&
                  !(sourcePath === 'Reflect' && propertyName === 'apply')
                ) {
                  collectReflectApplyBindingAliases(element.name, element.initializer);
                }
              }
            }
            return;
          }
          for (const [index, element] of bindingName.elements.entries()) {
            if (!ts.isOmittedExpression(element)) {
              collectReflectApplyPathAliases(element.name, `${sourcePath}.${index}`);
              if (element.initializer) {
                collectReflectApplyBindingAliases(element.name, element.initializer);
              }
            }
          }
        }
        function collectReflectApplyBindingAliases(
          bindingName: ts.BindingName,
          initializer: ts.Expression
        ): void {
          const candidate = unwrapParameterAliasExpression(initializer);
          const sourcePath = readParameterAliasPath(candidate);
          if (sourcePath) {
            collectReflectApplyPathAliases(bindingName, sourcePath);
            return;
          }
          if (ts.isObjectBindingPattern(bindingName) && ts.isObjectLiteralExpression(candidate)) {
            for (const element of bindingName.elements) {
              if (element.dotDotDotToken) continue;
              const propertyName = element.propertyName
                ? readStaticPropertyName(element.propertyName)
                : ts.isIdentifier(element.name)
                  ? element.name.text
                  : undefined;
              if (!propertyName) continue;
              const property = [...candidate.properties]
                .reverse()
                .find(
                  (candidateProperty) =>
                    !ts.isSpreadAssignment(candidateProperty) &&
                    readStaticPropertyName(candidateProperty.name) === propertyName
                );
              if (property && ts.isPropertyAssignment(property)) {
                collectReflectApplyBindingAliases(element.name, property.initializer);
              } else if (property && ts.isShorthandPropertyAssignment(property)) {
                collectReflectApplyBindingAliases(element.name, property.name);
              } else if (!property && element.initializer) {
                collectReflectApplyBindingAliases(element.name, element.initializer);
              }
            }
            return;
          }
          if (!ts.isArrayBindingPattern(bindingName) || !ts.isArrayLiteralExpression(candidate)) {
            return;
          }
          for (const [index, element] of bindingName.elements.entries()) {
            if (ts.isOmittedExpression(element)) continue;
            const sourceElement = candidate.elements[index];
            if (sourceElement && !ts.isOmittedExpression(sourceElement)) {
              collectReflectApplyBindingAliases(
                element.name,
                ts.isSpreadElement(sourceElement) ? sourceElement.expression : sourceElement
              );
            } else if (element.initializer) {
              collectReflectApplyBindingAliases(element.name, element.initializer);
            }
          }
        }
        function collectReflectApplyAliases(child: ts.Node): void {
          if (ts.isVariableDeclaration(child) && child.initializer) {
            collectReflectApplyBindingAliases(child.name, child.initializer);
          }
          if (
            ts.isBinaryExpression(child) &&
            child.operatorToken.kind === ts.SyntaxKind.EqualsToken
          ) {
            const source = readParameterAliasPath(child.right);
            const target = readParameterAliasPath(child.left);
            if (source && target) reflectApplyAliasEdges.push({ source, target });
          }
          ts.forEachChild(child, collectReflectApplyAliases);
        }
        if (callable.body) collectReflectApplyAliases(callable.body);
        let discoveredReflectApplyAlias = true;
        while (discoveredReflectApplyAlias) {
          discoveredReflectApplyAlias = false;
          for (const edge of reflectApplyAliasEdges) {
            if (reflectApplyBindings.has(edge.source) && !reflectApplyBindings.has(edge.target)) {
              reflectApplyBindings.add(edge.target);
              discoveredReflectApplyAlias = true;
            }
          }
        }
        function visitDelegate(child: ts.Node): void {
          if (ts.isCallExpression(child)) {
            const invokedSources = readParameterAliasRoots(child.expression);
            for (const source of invokedSources) {
              sources.add(source);
              const helperMatch = /^(.*)\.(?:apply|bind|call)$/.exec(source);
              if (helperMatch?.[1]) sources.add(helperMatch[1]);
            }
            if (
              reflectApplyBindings.has(readParameterAliasPath(child.expression) ?? '') &&
              child.arguments[0]
            ) {
              for (const source of readParameterAliasRoots(child.arguments[0])) {
                sources.add(source);
              }
            }
          }
          if (ts.isReturnStatement(child) && child.expression) {
            for (const source of readParameterAliasRoots(child.expression)) sources.add(source);
          }
          ts.forEachChild(child, visitDelegate);
        }
        if (callable.body) visitDelegate(callable.body);
        return [...sources];
      }
      function collectExpressionAliasEdges(targetPath: string, initializer: ts.Expression): void {
        const candidate = unwrapParameterAliasExpression(initializer);
        const candidatePath = readParameterAliasPath(candidate);
        if (candidatePath) {
          addParameterAliasEdge([candidatePath], [targetPath]);
          addParameterMemberAliasEdge(candidatePath, targetPath);
          return;
        }
        if (ts.isObjectLiteralExpression(candidate)) {
          for (const [propertyIndex, property] of candidate.properties.entries()) {
            if (ts.isSpreadAssignment(property)) {
              addParameterAliasEdge(readParameterAliasRoots(property.expression), [targetPath]);
              const spreadPath = readParameterAliasPath(property.expression);
              if (spreadPath) {
                const overriddenMembers = candidate.properties
                  .slice(propertyIndex + 1)
                  .filter((laterProperty) => !ts.isSpreadAssignment(laterProperty))
                  .map((laterProperty) => readStaticPropertyName(laterProperty.name))
                  .filter((propertyName): propertyName is string => propertyName != null);
                addParameterMemberAliasEdge(spreadPath, targetPath, overriddenMembers);
              }
              continue;
            }
            const propertyName = readStaticPropertyName(property.name);
            if (!propertyName) continue;
            const isOverridden = candidate.properties
              .slice(propertyIndex + 1)
              .some(
                (laterProperty) =>
                  !ts.isSpreadAssignment(laterProperty) &&
                  readStaticPropertyName(laterProperty.name) === propertyName
              );
            if (isOverridden) continue;
            if (ts.isPropertyAssignment(property)) {
              collectExpressionAliasEdges(`${targetPath}.${propertyName}`, property.initializer);
            } else if (ts.isShorthandPropertyAssignment(property)) {
              collectExpressionAliasEdges(`${targetPath}.${propertyName}`, property.name);
            } else if (
              ts.isMethodDeclaration(property) ||
              ts.isGetAccessorDeclaration(property) ||
              ts.isSetAccessorDeclaration(property)
            ) {
              addParameterAliasEdge(collectCallableDelegateSources(property), [
                `${targetPath}.${propertyName}`,
              ]);
            }
          }
          return;
        }
        if (ts.isArrayLiteralExpression(candidate)) {
          for (const [index, element] of candidate.elements.entries()) {
            if (ts.isOmittedExpression(element)) continue;
            collectExpressionAliasEdges(
              `${targetPath}.${index}`,
              ts.isSpreadElement(element) ? element.expression : element
            );
          }
          return;
        }
        addParameterAliasEdge(readParameterAliasRoots(candidate), [targetPath]);
      }
      function collectBindingPathAliasEdges(bindingName: ts.BindingName, sourcePath: string): void {
        if (ts.isIdentifier(bindingName)) {
          addParameterAliasEdge([sourcePath], [bindingName.text]);
          return;
        }
        if (ts.isObjectBindingPattern(bindingName)) {
          const explicitlyBoundMembers = bindingName.elements
            .filter((element) => !element.dotDotDotToken)
            .map((element) =>
              element.propertyName
                ? readStaticPropertyName(element.propertyName)
                : ts.isIdentifier(element.name)
                  ? element.name.text
                  : undefined
            )
            .filter((propertyName): propertyName is string => propertyName != null);
          for (const element of bindingName.elements) {
            if (element.initializer) collectBindingAliasEdges(element.name, element.initializer);
            if (element.dotDotDotToken) {
              if (ts.isIdentifier(element.name)) {
                addParameterMemberAliasEdge(sourcePath, element.name.text, explicitlyBoundMembers);
              }
              continue;
            }
            const propertyName = element.propertyName
              ? readStaticPropertyName(element.propertyName)
              : ts.isIdentifier(element.name)
                ? element.name.text
                : undefined;
            if (propertyName) {
              collectBindingPathAliasEdges(element.name, `${sourcePath}.${propertyName}`);
            }
          }
          return;
        }
        for (const [index, element] of bindingName.elements.entries()) {
          if (ts.isOmittedExpression(element)) continue;
          if (element.initializer) collectBindingAliasEdges(element.name, element.initializer);
          collectBindingPathAliasEdges(element.name, `${sourcePath}.${index}`);
        }
      }
      function collectBindingAliasEdges(
        bindingName: ts.BindingName,
        initializer: ts.Expression
      ): void {
        const candidate = unwrapParameterAliasExpression(initializer);
        if (ts.isIdentifier(bindingName)) {
          collectExpressionAliasEdges(bindingName.text, candidate);
          return;
        }
        const initializerPath = readParameterAliasPath(candidate);
        if (initializerPath) {
          collectBindingPathAliasEdges(bindingName, initializerPath);
          return;
        }

        if (ts.isObjectBindingPattern(bindingName) && ts.isObjectLiteralExpression(candidate)) {
          for (const element of bindingName.elements) {
            if (element.initializer) collectBindingAliasEdges(element.name, element.initializer);
            if (element.dotDotDotToken) continue;
            const propertyName = element.propertyName
              ? readStaticPropertyName(element.propertyName)
              : ts.isIdentifier(element.name)
                ? element.name.text
                : undefined;
            if (!propertyName) continue;
            const property = [...candidate.properties]
              .reverse()
              .find(
                (candidateProperty) =>
                  !ts.isSpreadAssignment(candidateProperty) &&
                  readStaticPropertyName(candidateProperty.name) === propertyName
              );
            if (property && ts.isPropertyAssignment(property)) {
              collectBindingAliasEdges(element.name, property.initializer);
            } else if (property && ts.isShorthandPropertyAssignment(property)) {
              collectBindingAliasEdges(element.name, property.name);
            }
          }
          return;
        }

        if (ts.isArrayBindingPattern(bindingName) && ts.isArrayLiteralExpression(candidate)) {
          for (const [index, element] of bindingName.elements.entries()) {
            if (ts.isOmittedExpression(element)) continue;
            if (element.initializer) collectBindingAliasEdges(element.name, element.initializer);
            const sourceElement = candidate.elements[index];
            if (!sourceElement || ts.isOmittedExpression(sourceElement)) continue;
            collectBindingAliasEdges(
              element.name,
              ts.isSpreadElement(sourceElement) ? sourceElement.expression : sourceElement
            );
          }
          return;
        }

        addParameterAliasEdge(readParameterAliasRoots(candidate), collectBindingNames(bindingName));
      }
      function collectAssignmentAliasEdges(
        target: ts.Expression,
        initializer: ts.Expression
      ): void {
        const assignmentTarget = unwrapParameterAliasExpression(target);
        const initializerCandidate = unwrapParameterAliasExpression(initializer);
        const targetPath = readParameterAliasPath(assignmentTarget);
        if (targetPath) {
          collectExpressionAliasEdges(targetPath, initializerCandidate);
          return;
        }
        const initializerPath = readParameterAliasPath(initializerCandidate);
        if (initializerPath) {
          function collectAssignmentTargetPathEdges(
            candidateTarget: ts.Expression,
            sourcePath: string
          ): void {
            const targetCandidate = unwrapParameterAliasExpression(candidateTarget);
            const candidatePath = readParameterAliasPath(targetCandidate);
            if (candidatePath) {
              addParameterAliasEdge([sourcePath], [candidatePath]);
              return;
            }
            if (ts.isObjectLiteralExpression(targetCandidate)) {
              for (const property of targetCandidate.properties) {
                if (ts.isSpreadAssignment(property)) continue;
                const propertyName = readStaticPropertyName(property.name);
                if (!propertyName) continue;
                if (ts.isShorthandPropertyAssignment(property)) {
                  collectAssignmentTargetPathEdges(property.name, `${sourcePath}.${propertyName}`);
                } else if (ts.isPropertyAssignment(property)) {
                  collectAssignmentTargetPathEdges(
                    property.initializer,
                    `${sourcePath}.${propertyName}`
                  );
                }
              }
              return;
            }
            if (!ts.isArrayLiteralExpression(targetCandidate)) return;
            for (const [index, element] of targetCandidate.elements.entries()) {
              if (ts.isOmittedExpression(element)) continue;
              collectAssignmentTargetPathEdges(
                ts.isSpreadElement(element) ? element.expression : element,
                `${sourcePath}.${index}`
              );
            }
          }
          collectAssignmentTargetPathEdges(assignmentTarget, initializerPath);
          return;
        }
        if (
          ts.isObjectLiteralExpression(assignmentTarget) &&
          ts.isObjectLiteralExpression(initializerCandidate)
        ) {
          for (const targetProperty of assignmentTarget.properties) {
            if (ts.isSpreadAssignment(targetProperty)) continue;
            const propertyName = readStaticPropertyName(targetProperty.name);
            if (!propertyName) continue;
            const sourceProperty = [...initializerCandidate.properties]
              .reverse()
              .find(
                (candidateProperty) =>
                  !ts.isSpreadAssignment(candidateProperty) &&
                  readStaticPropertyName(candidateProperty.name) === propertyName
              );
            if (!sourceProperty) continue;
            const targetExpression = ts.isShorthandPropertyAssignment(targetProperty)
              ? targetProperty.name
              : ts.isPropertyAssignment(targetProperty)
                ? targetProperty.initializer
                : undefined;
            const sourceExpression = ts.isShorthandPropertyAssignment(sourceProperty)
              ? sourceProperty.name
              : ts.isPropertyAssignment(sourceProperty)
                ? sourceProperty.initializer
                : undefined;
            if (targetExpression && sourceExpression) {
              collectAssignmentAliasEdges(targetExpression, sourceExpression);
            }
          }
          return;
        }
        if (
          ts.isArrayLiteralExpression(assignmentTarget) &&
          ts.isArrayLiteralExpression(initializerCandidate)
        ) {
          for (const [index, targetElement] of assignmentTarget.elements.entries()) {
            const sourceElement = initializerCandidate.elements[index];
            if (
              ts.isOmittedExpression(targetElement) ||
              !sourceElement ||
              ts.isOmittedExpression(sourceElement)
            ) {
              continue;
            }
            collectAssignmentAliasEdges(
              ts.isSpreadElement(targetElement) ? targetElement.expression : targetElement,
              ts.isSpreadElement(sourceElement) ? sourceElement.expression : sourceElement
            );
          }
        }
      }
      function collectParameterAliasEdges(child: ts.Node): void {
        if (ts.isVariableDeclaration(child) && child.initializer) {
          collectBindingAliasEdges(child.name, child.initializer);
        }
        if (
          ts.isBinaryExpression(child) &&
          child.operatorToken.kind === ts.SyntaxKind.EqualsToken
        ) {
          collectAssignmentAliasEdges(child.left, child.right);
        }
        ts.forEachChild(child, collectParameterAliasEdges);
      }
      collectParameterAliasEdges(body);

      let discoveredParameterAlias = true;
      while (discoveredParameterAlias) {
        discoveredParameterAlias = false;
        for (const edge of parameterAliasEdges) {
          if (!edge.sources.some((source) => parameterBindings.has(source))) continue;
          for (const target of edge.targets) {
            if (!parameterBindings.has(target)) {
              parameterBindings.add(target);
              discoveredParameterAlias = true;
            }
          }
        }
        for (const edge of parameterMemberAliasEdges) {
          for (const binding of [...parameterBindings]) {
            if (!binding.startsWith(`${edge.sourcePrefix}.`)) continue;
            const memberSuffix = binding.slice(edge.sourcePrefix.length + 1);
            const rootMember = memberSuffix.split('.')[0];
            if (rootMember && edge.excludedMembers.includes(rootMember)) continue;
            const targetBinding = `${edge.targetPrefix}.${memberSuffix}`;
            if (!parameterBindings.has(targetBinding)) {
              parameterBindings.add(targetBinding);
              discoveredParameterAlias = true;
            }
          }
        }
      }
      function visitInvocation(child: ts.Node): void {
        const invokedPath = ts.isCallExpression(child)
          ? readParameterAliasPath(child.expression)
          : undefined;
        if (
          ts.isCallExpression(child) &&
          ((invokedPath && parameterBindings.has(invokedPath)) ||
            parameterBindings.has(readMutationRoot(child.expression) ?? ''))
        ) {
          for (const argument of child.arguments) {
            addReExportedExpression(argument, declarationBindings);
          }
        }
        ts.forEachChild(child, visitInvocation);
      }
      visitInvocation(body);
    }

    if (ts.isFunctionDeclaration(node)) {
      if (node.body) {
        visitReturnedAuthority(node.body, node.body);
        if (guardsViewerRenderPropAuthority) {
          visitInvokedParameterAuthorities(node.parameters, node.body);
        }
      }
      return;
    }

    for (const heritageClause of node.heritageClauses ?? []) {
      for (const heritageType of heritageClause.types) {
        addReExportedExpression(heritageType.expression, declarationBindings);
      }
    }
    for (const member of node.members) {
      if (ts.isPropertyDeclaration(member) && member.initializer) {
        addReExportedExpression(member.initializer, declarationBindings);
      }
      if (
        (ts.isMethodDeclaration(member) ||
          ts.isGetAccessorDeclaration(member) ||
          ts.isSetAccessorDeclaration(member) ||
          ts.isConstructorDeclaration(member)) &&
        member.body
      ) {
        visitReturnedAuthority(member.body, member.body);
        if (guardsViewerRenderPropAuthority) {
          visitInvokedParameterAuthorities(member.parameters, member.body);
        }
      }
    }
  }

  function readVariableImportPattern(
    node: ts.Expression,
    resolvingBindings: ReadonlySet<string> = new Set()
  ): {
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

    if (ts.isIdentifier(node) && !resolvingBindings.has(node.text)) {
      const initializer = readLexicalBindingInitializer(node);
      if (initializer) {
        return readVariableImportPattern(initializer, new Set([...resolvingBindings, node.text]));
      }
    }

    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
      const left = readVariableImportPattern(node.left, resolvingBindings);
      const right = readVariableImportPattern(node.right, resolvingBindings);
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

    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      runtimeExportedBindings.has(readMutationRoot(node.left) ?? '')
    ) {
      addReExportedExpression(node.right);
    }

    if (ts.isCallExpression(node) && node.arguments[0]) {
      const mutationMethod =
        ts.isPropertyAccessExpression(node.expression) &&
        ts.isIdentifier(node.expression.expression) &&
        node.expression.expression.text === 'Object'
          ? node.expression.name.text
          : undefined;
      if (
        (mutationMethod === 'assign' || mutationMethod === 'defineProperty') &&
        runtimeExportedBindings.has(readMutationRoot(node.arguments[0]) ?? '')
      ) {
        for (const argument of node.arguments.slice(1)) addReExportedExpression(argument);
      }
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
    addExportedBindings(statement);
    if (ts.isImportDeclaration(statement)) addImportedBindings(statement);
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (declaration.initializer) {
          addLocalBindingInitializers(declaration.name, declaration.initializer);
        }
      }
    }
  }
  collectLexicalBindingInitializers(sourceFile);

  let discoveredExportedObjectAlias = true;
  while (discoveredExportedObjectAlias) {
    discoveredExportedObjectAlias = false;
    function discoverExportedObjectAliases(node: ts.Node): void {
      if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        node.initializer &&
        expressionMayReferenceExportedObject(node.initializer) &&
        !runtimeExportedBindings.has(node.name.text)
      ) {
        runtimeExportedBindings.add(node.name.text);
        discoveredExportedObjectAlias = true;
      }
      if (
        ts.isBinaryExpression(node) &&
        node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        ts.isIdentifier(node.left) &&
        expressionMayReferenceExportedObject(node.right) &&
        !runtimeExportedBindings.has(node.left.text)
      ) {
        runtimeExportedBindings.add(node.left.text);
        discoveredExportedObjectAlias = true;
      }
      ts.forEachChild(node, discoverExportedObjectAliases);
    }
    discoverExportedObjectAliases(sourceFile);
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

function normalizeRuntimeModuleSpecifier(specifier: string): string | undefined {
  const normalizedSeparators = specifier.replaceAll('\\', '/');
  const fragmentIndex = normalizedSeparators.indexOf('#');
  const preFragmentSpecifier =
    fragmentIndex === -1 ? normalizedSeparators : normalizedSeparators.slice(0, fragmentIndex);
  const queryIndex = preFragmentSpecifier.indexOf('?');
  if (queryIndex === -1) return preFragmentSpecifier;

  const query = preFragmentSpecifier.slice(queryIndex + 1);
  if (/(?:^|&)(?:raw|url)(?:&|$)/.test(query)) return undefined;
  return preFragmentSpecifier.slice(0, queryIndex);
}

function containsPackageSpecifier(specifiers: ReadonlySet<string>, packageName: string): boolean {
  return [...specifiers].some((specifier) => {
    const normalizedSpecifier = normalizeRuntimeModuleSpecifier(specifier);
    return (
      normalizedSpecifier === packageName || normalizedSpecifier?.startsWith(`${packageName}/`)
    );
  });
}

function containsInternalAuthoritySpecifier(
  specifiers: ReadonlySet<string>,
  authority: (typeof MONACO_INTERNAL_AUTHORITIES)[number]
): boolean {
  return [...specifiers].some((specifier) => {
    const normalizedSpecifier = normalizeRuntimeModuleSpecifier(specifier);
    const moduleName = normalizedSpecifier?.split('/').at(-1);
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
  const normalizedSpecifier = normalizeRuntimeModuleSpecifier(specifier);
  if (!normalizedSpecifier) return '';
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

function containsTestSupportSpecifier(
  specifiers: ReadonlySet<string>,
  modulePath: string
): boolean {
  return [...specifiers].some((specifier) => {
    const resolvedSpecifier = resolveWebRuntimeModuleSpecifier(modulePath, specifier);
    return (
      /(^|\/)test(?:ing)?(?:\/|$)/.test(resolvedSpecifier) ||
      EXCLUDED_TEST_SOURCE_PATH_PATTERN.test(resolvedSpecifier)
    );
  });
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
      ...TRANSITIVE_MONACO_VIEWER_AUTHORITIES,
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
  let runtimeModuleAccess: RuntimeModuleAccess | undefined;
  const hasEscapedSpecifier = /\\(?:u(?:\{[\dA-Fa-f]+\}|[\dA-Fa-f]{4})|x[\dA-Fa-f]{2})/.test(
    source
  );
  const hasTestSupportSignal =
    /test(?:Fixtures|Harness|Support|ing)?[\\/.]/i.test(source) ||
    /\.spec(?:\.|['"`])/i.test(source);
  const prefilterModuleSpecifiers = hasEscapedSpecifier
    ? collectPrefilterModuleSpecifiers(source)
    : new Set<string>();
  if (hasTestSupportSignal) {
    runtimeModuleAccess = getRuntimeModuleSpecifiers(modulePath, source);
    if (containsTestSupportSpecifier(runtimeModuleAccess.specifiers, modulePath)) {
      violations.push('production import from test support');
    }
  }
  const hasEscapedStaticAuthority =
    hasEscapedSpecifier &&
    containsPotentialStaticMonacoAuthority(prefilterModuleSpecifiers, modulePath);
  if (
    !MONACO_AUTHORITY_SOURCE_SIGNALS.some((signal) => source.includes(signal)) &&
    !/\bimport\s*\(/.test(source) &&
    !/['"`][^'"`]*\/canvas(?:\/|['"`])/.test(source) &&
    !hasEscapedStaticAuthority
  ) {
    return violations;
  }

  const { specifiers: runtimeModuleSpecifiers, reExportedSpecifiers: runtimeReExportedSpecifiers } =
    runtimeModuleAccess ?? getRuntimeModuleSpecifiers(modulePath, source);
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
    expect(isProductionSourceFileName('MonacoCodeSurface.testHarness.tsx')).toBe(false);
    expect(isProductionSourceFileName('MonacoCodeSurface.testFixtures.ts')).toBe(false);
    expect(isProductionSourceFileName('MonacoCodeSurface.testSupport.ts')).toBe(false);
    expect(isProductionSourceFileName('MonacoCodeSurface.test.support.ts')).toBe(false);
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
          'function identity<T>(value: T): T { return value; }',
          'export function MonacoCodeViewer() {',
          '  const Surface = useMonacoCodeSurface();',
          '  const Wrapped = identity(Surface);',
          '  return <><Surface readOnly /><Wrapped readOnly={false} /></>;',
          '}',
        ].join('\n')
      )
    ).toContain('MonacoCodeViewer rendered a writable or dynamic surface');
    expect(
      collectMonacoViewerReadOnlyViolations(
        [
          'function useMonacoCodeSurface() { return null; }',
          'function useWrappedSurface() { return useMonacoCodeSurface(); }',
          'export function MonacoCodeViewer() {',
          '  const Safe = useMonacoCodeSurface();',
          '  const Writable = useWrappedSurface();',
          '  return <><Safe readOnly /><Writable readOnly={false} /></>;',
          '}',
        ].join('\n')
      )
    ).toContain('MonacoCodeViewer rendered a writable or dynamic surface');
    expect(
      collectMonacoViewerReadOnlyViolations(
        [
          'function useMonacoCodeSurface() { return null; }',
          'function useWrappedSurface() {',
          '  const Result = useMonacoCodeSurface();',
          '  return Result;',
          '}',
          'export function MonacoCodeViewer() {',
          '  const Safe = useMonacoCodeSurface();',
          '  const Writable = useWrappedSurface();',
          '  return <><Safe readOnly /><Writable readOnly={false} /></>;',
          '}',
        ].join('\n')
      )
    ).toContain('MonacoCodeViewer rendered a writable or dynamic surface');
    expect(
      collectMonacoViewerReadOnlyViolations(
        [
          'function useMonacoCodeSurface() { return null; }',
          'const hooks = {',
          '  useWrappedSurface() { return useMonacoCodeSurface(); },',
          '};',
          'export function MonacoCodeViewer() {',
          '  const Safe = useMonacoCodeSurface();',
          '  const Writable = hooks.useWrappedSurface();',
          '  return <><Safe readOnly /><Writable readOnly={false} /></>;',
          '}',
        ].join('\n')
      )
    ).toContain('MonacoCodeViewer rendered a writable or dynamic surface');
    expect(
      collectMonacoViewerReadOnlyViolations(
        [
          "import * as React from 'react';",
          'function useMonacoCodeSurface() { return null; }',
          'export function MonacoCodeViewer() {',
          '  const Surface = useMonacoCodeSurface();',
          '  const h = React.createElement;',
          '  return <><Surface readOnly />{h(Surface, { readOnly: false })}</>;',
          '}',
        ].join('\n')
      )
    ).toContain('MonacoCodeViewer rendered a writable or dynamic surface');
    expect(
      collectMonacoViewerReadOnlyViolations(
        [
          'function useMonacoCodeSurface() { return null; }',
          'export function MonacoCodeViewer() {',
          '  const Safe = useMonacoCodeSurface();',
          '  let Writable;',
          '  Writable = useMonacoCodeSurface();',
          '  return <><Safe readOnly /><Writable readOnly={false} /></>;',
          '}',
        ].join('\n')
      )
    ).toContain('MonacoCodeViewer rendered a writable or dynamic surface');
    expect(
      collectMonacoViewerReadOnlyViolations(
        [
          'function useMonacoCodeSurface() { return null; }',
          'export function MonacoCodeViewer() {',
          '  const Safe = useMonacoCodeSurface();',
          '  let Writable;',
          '  ({ Writable } = { Writable: useMonacoCodeSurface() });',
          '  return <><Safe readOnly /><Writable readOnly={false} /></>;',
          '}',
        ].join('\n')
      )
    ).toContain('MonacoCodeViewer rendered a writable or dynamic surface');
    expect(
      collectMonacoViewerReadOnlyViolations(
        [
          'function useMonacoCodeSurface() { return null; }',
          'export function MonacoCodeViewer() {',
          '  const Safe = useMonacoCodeSurface();',
          '  let Writable;',
          '  [Writable] = [useMonacoCodeSurface()];',
          '  return <><Safe readOnly /><Writable readOnly={false} /></>;',
          '}',
        ].join('\n')
      )
    ).toContain('MonacoCodeViewer rendered a writable or dynamic surface');
    expect(
      collectMonacoViewerReadOnlyViolations(
        [
          'function useMonacoCodeSurface() { return null; }',
          'export function MonacoCodeViewer() {',
          '  const Safe = useMonacoCodeSurface();',
          '  const { Writable } = { Writable: useMonacoCodeSurface() };',
          '  return <><Safe readOnly /><Writable readOnly={false} /></>;',
          '}',
        ].join('\n')
      )
    ).toContain('MonacoCodeViewer rendered a writable or dynamic surface');
    expect(
      collectMonacoViewerReadOnlyViolations(
        [
          'function useMonacoCodeSurface() { return null; }',
          'export function MonacoCodeViewer() {',
          '  const Safe = useMonacoCodeSurface();',
          '  const [Writable] = [useMonacoCodeSurface()];',
          '  return <><Safe readOnly /><Writable readOnly={false} /></>;',
          '}',
        ].join('\n')
      )
    ).toContain('MonacoCodeViewer rendered a writable or dynamic surface');
    expect(
      collectMonacoViewerReadOnlyViolations(
        [
          'function useMonacoCodeSurface() { return null; }',
          'export function MonacoCodeViewer() {',
          '  const Loaders = { useMonacoCodeSurface };',
          '  const Safe = useMonacoCodeSurface();',
          '  const Writable = Loaders.useMonacoCodeSurface();',
          '  return <><Safe readOnly /><Writable readOnly={false} /></>;',
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
    expect(
      collectMonacoViewerReadOnlyViolations(
        [
          'function useMonacoCodeSurface() { return null; }',
          'export function MonacoCodeViewer() {',
          '  const Surface = useMonacoCodeSurface();',
          '  const render = (Writable = Surface) => <Writable readOnly={false} />;',
          '  const renderDestructured = ({ Writable = Surface } = {}) => (',
          '    <Writable readOnly={false} />',
          '  );',
          '  return <><Surface readOnly />{render()}{renderDestructured()}</>;',
          '}',
        ].join('\n')
      )
    ).toContain('MonacoCodeViewer rendered a writable or dynamic surface');
    expect(
      collectMonacoViewerReadOnlyViolations(
        [
          "import { cloneElement as clone } from 'react';",
          'function useMonacoCodeSurface() { return null; }',
          'export function MonacoCodeViewer() {',
          '  const Surface = useMonacoCodeSurface();',
          '  const preview = <Surface readOnly />;',
          '  return clone(preview, { readOnly: false });',
          '}',
        ].join('\n')
      )
    ).toContain('MonacoCodeViewer rendered a writable or dynamic surface');
    expect(
      collectMonacoViewerReadOnlyViolations(
        [
          "import { cloneElement } from 'react';",
          'function useMonacoCodeSurface() { return null; }',
          'export function MonacoCodeViewer() {',
          '  const Surface = useMonacoCodeSurface();',
          "  return cloneElement(<Surface readOnly />, { 'aria-label': 'Preview' });",
          '}',
        ].join('\n')
      )
    ).toEqual([]);
    expect(
      collectMonacoViewerReadOnlyViolations(
        [
          "import { cloneElement } from 'react';",
          'function useMonacoCodeSurface() { return null; }',
          'export function MonacoCodeViewer({ readOnly }: { readOnly: boolean }) {',
          '  const Surface = useMonacoCodeSurface();',
          '  return cloneElement(<Surface readOnly />, { readOnly });',
          '}',
        ].join('\n')
      )
    ).toContain('MonacoCodeViewer rendered a writable or dynamic surface');
    expect(
      collectMonacoViewerReadOnlyViolations(
        [
          "import { jsx as render } from 'react/jsx-runtime';",
          'function useMonacoCodeSurface() { return null; }',
          'export function MonacoCodeViewer() {',
          '  const Surface = useMonacoCodeSurface();',
          '  return <><Surface readOnly />{render(Surface, { readOnly: false })}</>;',
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
  });

  it('scans every Templates production module for Monaco authority', () => {
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
  });

  it('scans every Canvas production module for Monaco authority', () => {
    expect(
      collectMonacoAuthorityViolations({
        surface: 'canvas-production',
        modulePath: 'views/Canvas.tsx',
        source: readAppSource('views/Canvas.tsx'),
      })
    ).toEqual([]);

    for (const canvasModule of collectProductionSourceFiles(path.join(APP_ROOT, 'views/canvas'))) {
      const source = readFileSync(canvasModule, 'utf8');
      const modulePath = path.relative(APP_ROOT, canvasModule).replaceAll('\\', '/');
      expect(
        collectMonacoAuthorityViolations({ surface: 'canvas-production', modulePath, source }),
        modulePath
      ).toEqual([]);
    }
  });

  it('enforces Monaco owners and test-support boundaries across Web production', () => {
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
