/** Owned concern: the shared explorer stays a presentation component, not a second authoring rail. */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { inspectEmbeddedComponentStyles } from '../../../../testing/embeddedComponentStyles.test.support';
import frame from './CanvasExplorer.tsx?raw';
import template from './CanvasExplorer.templates.tsx?raw';
import projectCatalogue from './CanvasExplorerCatalog.templates.tsx?raw';
import contracts from './CanvasExplorer.types.ts?raw';
import list from './CanvasExplorerList.tsx?raw';
import connections from './CanvasExplorerConnections.tsx?raw';
import graph from './CanvasGraphExplorer.tsx?raw';
import relational from './CanvasRelationalExplorer.tsx?raw';
import catalogue from '../CanvasRelationalTreeSourceCatalogue.tsx?raw';
import catalogueTemplate from '../CanvasRelationalTreeSourceCatalogue.templates.tsx?raw';
import viewport from '../CanvasViewport.tsx?raw';
import resizable from '../../../components/ui/resizable.tsx?raw';

const explorerStyles = readFileSync(
  new URL('./CanvasExplorer.module.css', import.meta.url),
  'utf8'
);

describe('Canvas explorer ownership', () => {
  it('shares the shell control typography instead of enlarging catalogue text', () => {
    // GH-3765: the content body token made Explorer names larger than the surrounding application controls.
    const fonts = readFileSync(new URL('../../../../styles/fonts.css', import.meta.url), 'utf8');
    const shell = readFileSync(
      new URL('../../../components/shell/ShellChrome.module.css', import.meta.url),
      'utf8'
    );
    for (const role of ['ui', 'ui-caption', 'ui-micro']) {
      expect(fonts).toContain(`--text-${role}:`);
      expect(explorerStyles).toContain(`var(--text-${role})`);
    }
    expect(shell).toContain('var(--text-ui)');
    expect(shell).toContain('var(--text-ui-caption)');
    expect(explorerStyles).not.toMatch(/font-size:\s*(?:var\(--text-body\)|[\d.]+(?:px|rem))/);
    expect(shell).not.toMatch(/font-size:\s*[\d.]+(?:px|rem)/);
  });

  it('keeps every shared catalogue CSS class linked for both real presentation consumers', () => {
    // Native GH-3765 proof found the internal occurrence control stacked after its live shared selector was removed.
    const declared = new Set(
      Array.from(explorerStyles.matchAll(/\.([a-zA-Z_][\w-]*)/g), (match) => match[1])
    );
    for (const consumer of [template, projectCatalogue, catalogueTemplate, connections]) {
      expect(inspectEmbeddedComponentStyles(consumer)).toEqual([]);
      for (const match of consumer.matchAll(/styles\.([a-zA-Z_][\w]*)/g)) {
        expect(declared.has(match[1]!), `Live shared class ${match[1]} must be declared`).toBe(
          true
        );
      }
    }
  });

  it('keeps public Explorer contracts type-only rather than deriving them from JSX metadata', () => {
    // The contract remains importable without executing templates, stores or navigation display data.
    const source = ts.createSourceFile('contracts.ts', contracts, ts.ScriptTarget.Latest, true);
    expect(source.statements.length).toBeGreaterThan(0);
    for (const statement of source.statements) {
      if (ts.isImportDeclaration(statement)) {
        expect(statement.importClause?.isTypeOnly).toBe(true);
      } else {
        expect(ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement)).toBe(
          true
        );
      }
    }
  });

  it('keeps shared resize presentation in its CSS module', () => {
    // GH-3818: keep the resize primitive from accumulating visual policy inside React again.
    expect(resizable).toContain("'./resizable.module.css'");
    expect(resizable).not.toMatch(/style=\{|className="|cn\(\s*['"]/);
  });

  it('keeps topology writes and domain/provider decisions out of shared presentation', () => {
    // Opening or hiding Elements must not become a second path for editing the graph.
    for (const source of [frame, template, projectCatalogue, list]) {
      expect(source).not.toMatch(
        /fetch\(|\.occurrences|setNodes|addNode|applyDvt|postgres|dbt|zustand/
      );
      expect(source).not.toMatch(/style=\{|className="/);
    }
    expect(template).toContain('CanvasExplorer.module.css');
    expect(graph).not.toContain('useReactFlow');
    expect(viewport).toContain('<CanvasGraphExplorer');
    expect(viewport).toContain('focusCanvasViewportNode');
    expect(relational).toContain('CanvasRelationalTreeSourceCatalogue');
    expect(catalogue).not.toMatch(/PanelLeftClose|PanelLeftOpen|collapsed|onToggle/);
  });

  it('keeps disclosure and persistence in the shell layout owner', () => {
    // GH-3818: a second local flag or storage key would recreate the reload/navigation split.
    for (const source of [frame, template]) {
      expect(source).not.toMatch(/localStorage|sessionStorage|autoSaveId|createJSONStorage/);
    }
    expect(frame).not.toMatch(/useState|setExpanded|canvasExplorerVisible/);
    expect(frame).toContain('state.canvasExplorer');
    expect(frame).toContain('state.dispatchCanvasExplorer');
    expect(template).not.toMatch(/useUiLayoutStore|useEffect|useLayoutEffect/);
  });

  it('keeps shared connection acquisition and graph writes outside catalogue presentation', () => {
    // GH-3765: the sidebar must consume the shared scoped query, never create a competing cache/provider rail.
    for (const source of [list, projectCatalogue, connections]) {
      expect(source).not.toMatch(
        /fetch\(|useQuery\(|useMutation\(|listWarehouseConnections\(|credentialRef|setNodes|addNode/
      );
      expect(source).not.toMatch(/localStorage|sessionStorage|createJSONStorage/);
    }
    expect(relational).toContain('CanvasRelationalTreeSourceCatalogue');
    expect(relational).not.toContain('CanvasExplorerList');
  });

  it('keeps compact project metadata and format decisions behind the admitted read model', () => {
    // The reference is presentation: inline SQL text, file heuristics and enlarged local typography cannot become new domain policy.
    // Source/SQL facets and independent disclosure are exercised by the real list presentation tests.
    expect(projectCatalogue).not.toMatch(/\.endsWith\(|\.originalFilePath|item\.path/);
    expect(explorerStyles).not.toMatch(/#[\da-f]{3,8}\b|font-size:\s*(?:18|20)px/i);
  });
});
