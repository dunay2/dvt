/** Owned concern: guard passive relational session-action presentation and stylesheet ownership. */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import SessionActionsSource from './CanvasRelationalTreeSessionActions.tsx?raw';
import EditButtonsSource from './CanvasRelationalTreeEditButtons.tsx?raw';
import SessionActionsModelSource from './canvasRelationalTreeSessionActionsModel.ts?raw';
import { assertComponentStyleOwnership } from '../../../testing/componentStyleOwnership.test.support';

describe('Relational session-action presentation ownership', () => {
  it('keeps session state, localization and controller types outside passive views', () => {
    for (const source of [SessionActionsSource, EditButtonsSource]) {
      expect(source).not.toMatch(
        /from ['"][^'"]*(?:stores\/|useCanvas|canvasCopyFormatting|canvasSemanticEditorCopy)/u
      );
      expect(source).not.toMatch(
        /CanvasRelationalTreeWorkbenchHandle|ReturnType|\buse(?:State|Effect|Memo|Callback)\s*\(/u
      );
    }
  });

  it('shares one direct stylesheet owner without JSX appearance literals', () => {
    const stylesheet = join(__dirname, 'CanvasRelationalTreeSessionActions.module.css');
    expect(existsSync(stylesheet)).toBe(true);
    const stylesheetSource = readFileSync(stylesheet, 'utf8');
    for (const componentSource of [SessionActionsSource, EditButtonsSource]) {
      assertComponentStyleOwnership({
        componentSource,
        stylesheetSource,
        stylesheetImport: './CanvasRelationalTreeSessionActions.module.css',
      });
    }
  });

  it('keeps navigation dependent on its narrow transaction contract', () => {
    const source = readFileSync(join(__dirname, 'useCanvasRelationEditNavigation.ts'), 'utf8');
    expect(source).not.toContain('CanvasRelationalTreeWorkbenchHandle');
    expect(source).toContain('session: CanvasRelationEditNavigationSession');
  });

  it('keeps the decision machine independent of React, session and infrastructure', () => {
    const filename = join(__dirname, 'canvasRelationEditNavigationMachine.ts');
    const source = ts.createSourceFile(
      filename,
      readFileSync(filename, 'utf8'),
      ts.ScriptTarget.Latest,
      true
    );
    const dependencies = source.statements.filter(
      (statement) =>
        ts.isImportDeclaration(statement) ||
        ts.isImportEqualsDeclaration(statement) ||
        (ts.isExportDeclaration(statement) && statement.moduleSpecifier != null)
    );
    expect(dependencies).toEqual([]);
  });

  it('keeps the presentation model free of runtime, command and dependency policy ownership', () => {
    expect(SessionActionsModelSource).not.toMatch(
      /from ['"][^'"]*(?:react|stores\/|ports\/|useCanvas|Policy)/u
    );
    expect(SessionActionsModelSource).not.toMatch(
      /CanvasRelationalTreeWorkbenchHandle|ReturnType|onApplyNodeDraft|createCanvasRelationalTreeApplyCommand/u
    );
    expect(SessionActionsModelSource).toContain('formatCanvasModelOutputDependencyRejection');
  });

  it('limits the action controller to locale, projection and current callback binding', () => {
    const source = readFileSync(
      join(__dirname, 'useCanvasRelationalTreeSessionActions.ts'),
      'utf8'
    );
    expect(source).toContain('useApplicationLanguageStore');
    expect(source).toContain('buildCanvasRelationalTreeSessionActionsModel');
    expect(source).not.toMatch(
      /ReturnType|\buse(?:State|Effect|Memo|Callback)\s*\(|\.apply\s*\(|\.cancel\s*\(|from ['"][^'"]*(?:ports\/|Policy)/u
    );
  });
});
