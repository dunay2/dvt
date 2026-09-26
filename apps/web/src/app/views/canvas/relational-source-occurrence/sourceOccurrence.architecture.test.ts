/** Owned concern: keep occurrence binding independent from presentation, persistence and execution. */
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import identity from './joinOccurrenceIdentity.ts?raw';
import physical from '../canvasPhysicalCompositionInput.ts?raw';
import model from '../canvasModelCompositionInput.ts?raw';
import identitiesTest from './joinOccurrenceIdentity.test.ts?raw';
import reopenTest from './occurrenceReopen.test.ts?raw';
import fixture from './occurrence.test.fixtures.ts?raw';
import removal from '../canvasPrepareRelationRemoval.ts?raw';
import policy from './sourceOccurrencePolicy.ts?raw';
import properties from './SourceOccurrenceProperties.tsx?raw';
import action from './SourceOccurrenceAction.tsx?raw';
import appendForm from './SourceOccurrenceAppendForm.tsx?raw';
import actions from './sourceOccurrenceActions.ts?raw';
import aliasTests from './SourceOccurrenceAlias.test.tsx?raw';
import appendTests from './SourceOccurrenceWorkbench.test.tsx?raw';
import policyTests from './sourceOccurrencePolicy.test.ts?raw';
import draftState from '../useCanvasRelationalTreeDraftState.ts?raw';
import aliasTemplate from './SourceOccurrenceProperties.templates.tsx?raw';
import fieldsTemplate from '../CanvasRelationFields.templates.tsx?raw';
import authoringTemplate from '../CanvasRelationalTreeAuthoring.templates.tsx?raw';

describe('source occurrence component boundaries', () => {
  it.each([aliasTemplate, fieldsTemplate, authoringTemplate])(
    'keeps presentation templates passive',
    (text) => {
      const module = ts.createSourceFile(
        'template.tsx',
        text,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX
      );
      for (const statement of module.statements) {
        if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier))
          continue;
        expect(statement.moduleSpecifier.text).not.toMatch(
          /@dvt\/|[Cc]ommand|[Ss]ession|[Aa]nalysis|\/stores\/|[Pp]olicy/u
        );
        if (statement.moduleSpecifier.text === 'react')
          expect(statement.importClause?.isTypeOnly).toBe(true);
      }
    }
  );
  it.each([
    ['identity policy', identity],
    ['physical input catalogue', physical],
    ['model input catalogue', model],
    ['identity scenarios', identitiesTest],
    ['reopen scenarios', reopenTest],
    ['fixture', fixture],
    ['relation removal', removal],
    ['occurrence policy', policy],
    ['alias properties', properties],
    ['source action', action],
    ['append form', appendForm],
    ['append intent', actions],
    ['alias scenarios', aliasTests],
    ['append scenarios', appendTests],
    ['policy scenarios', policyTests],
    ['draft state', draftState],
  ])('%s remains a concern-owned module within 200 lines', (_, text) => {
    expect(text.trimEnd().split('\n').length).toBeLessThanOrEqual(200);
  });

  it.each([
    ['identity policy', identity],
    ['physical input catalogue', physical],
    ['model input catalogue', model],
    ['occurrence policy', policy],
    ['append intent', actions],
  ])('%s has no presentation, persistence or execution dependency', (name, text) => {
    const module = ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true);
    for (const statement of module.statements) {
      if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier))
        continue;
      expect(statement.moduleSpecifier.text).not.toMatch(
        /react|node:|\/(ports|services|stores)\/|Execution|Preview|\.tsx$/u
      );
    }
  });
});
