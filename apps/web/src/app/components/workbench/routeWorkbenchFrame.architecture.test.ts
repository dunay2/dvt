/** Owned concern: guard RouteWorkbenchFrame semantic API, docs, and Fowler traceability. */
import { readFileSync } from 'node:fs';
import path from 'node:path';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const APP_ROOT = path.resolve(import.meta.dirname, '../..');
const REPO_ROOT = path.resolve(APP_ROOT, '../../../..');

function readAppSource(relativePathFromApp: string): string {
  return readFileSync(path.join(APP_ROOT, relativePathFromApp), 'utf8');
}

function readRepoDoc(relativePathFromRepo: string): string {
  return readFileSync(path.join(REPO_ROOT, relativePathFromRepo), 'utf8');
}

function readFrameSlotKeys(text: string): string[][] {
  const source = ts.createSourceFile(
    'consumer.tsx',
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );
  const frames: string[][] = [];
  const pending: ts.Node[] = [source];
  while (pending.length > 0) {
    const node = pending.pop()!;
    if (
      (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
      ts.isIdentifier(node.tagName) &&
      node.tagName.text === 'RouteWorkbenchFrame'
    ) {
      const attribute = node.attributes.properties
        .filter(ts.isJsxAttribute)
        .find((property) => ts.isIdentifier(property.name) && property.name.text === 'slots');
      const initializer = attribute?.initializer;
      const expression =
        initializer != null && ts.isJsxExpression(initializer) ? initializer.expression : undefined;
      const properties =
        expression != null && ts.isObjectLiteralExpression(expression) ? expression.properties : [];
      frames.push(
        properties.flatMap((property) => {
          if (!ts.isPropertyAssignment(property) && !ts.isShorthandPropertyAssignment(property)) {
            return [];
          }
          return ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)
            ? [property.name.text]
            : [];
        })
      );
    }
    ts.forEachChild(node, (child) => {
      pending.push(child);
    });
  }
  return frames;
}

describe('RouteWorkbenchFrame architecture', () => {
  it('documents and enforces the semantic workbench slot contract', () => {
    const source = readAppSource('components/workbench/RouteWorkbenchFrame.tsx');
    const codeView = readAppSource('views/CodeView.tsx');
    const componentGuide = readRepoDoc('docs/architecture/components/web/appshell/app-shell.md');

    expect(source.trimStart().startsWith('/** Owned concern:')).toBe(true);
    expect(source).toContain('export type RouteWorkbenchFrameSlots');
    expect(source).not.toContain('readonly children');
    expect(source).not.toContain('LegacyChildren');
    expect(source).toContain('route-workbench-left-panel');
    expect(source).toContain('route-workbench-primary-surface');
    expect(source).toContain('route-workbench-right-panel');
    expect(source).toContain('route-workbench-bottom-drawer');

    for (const requiredSection of [
      '## Public API',
      '## Invariants',
      '## Transitions',
      '## Consumers',
      '## Component Diagram',
      '```mermaid',
      'RouteWorkbenchFrameSlots',
      'leftPanel',
      'primarySurface',
      'rightPanel',
      'bottomDrawer',
      'CodeView',
      'first adopter',
    ]) {
      expect(componentGuide).toContain(requiredSection);
    }

    const codeFrames = readFrameSlotKeys(codeView);
    expect(codeFrames).not.toHaveLength(0);
    for (const slots of codeFrames) {
      expect(slots).toEqual(expect.arrayContaining(['leftPanel', 'primarySurface', 'rightPanel']));
    }

    for (const requiredStory of [
      'US-ROUTE-WORKBENCH-FRAME-001',
      'US-ROUTE-WORKBENCH-FRAME-002',
      'US-ROUTE-WORKBENCH-FRAME-003',
      'US-ROUTE-WORKBENCH-FRAME-004',
      '## Scenario Matrix',
      '## Acceptance Coverage',
      'route-workbench-slots.cy.ts',
    ]) {
      expect(componentGuide).toContain(requiredStory);
    }

    expect(componentGuide).toContain('## Command And Query Rail Posture');
    expect(componentGuide).toContain('does not own route commands');
  });

  it('keeps direct route workbench consumers on semantic slots', () => {
    const slotConsumerPaths = [
      'views/AdminView.tsx',
      'views/ArtifactsView.tsx',
      'views/CodeView.tsx',
      'views/CostView.tsx',
      'views/DiffView.tsx',
      'views/LineageView.tsx',
      'views/PluginsView.tsx',
      'views/diff/DiffStateViews.tsx',
      'views/lineage/LineageStateViews.tsx',
    ];

    for (const relativePath of slotConsumerPaths) {
      const source = readAppSource(relativePath);

      const frames = readFrameSlotKeys(source);
      expect(frames, relativePath).not.toHaveLength(0);
      for (const slots of frames) {
        expect(slots, relativePath).toContain('primarySurface');
      }
    }
  });
});
