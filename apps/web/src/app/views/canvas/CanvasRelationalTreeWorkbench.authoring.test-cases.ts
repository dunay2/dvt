import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

import CardMenuSource from './CanvasRelationalTreeCardMenu.tsx?raw';
import JoinFormulaSource from './canvasJoinPredicateFormula.ts?raw';
import JoinFormulaEditorSource from './CanvasJoinPredicateFormulaController.tsx?raw';
import DerivedOutputSource from './CanvasDerivedOutputSection.tsx?raw';
import CalculatedOutputsSource from './CanvasCalculatedRelationOutputs.tsx?raw';
import TransformInspectorSource from './CanvasTransformInspector.tsx?raw';
import RemovalSessionSource from './useCanvasRelationalTreeRemoval.ts?raw';
import SessionActionsSource from './CanvasRelationalTreeSessionActions.tsx?raw';
import AuthoringSource from './CanvasRelationalTreeAuthoring.tsx?raw';
import OperationDraftInspectorSource from './CanvasRelationalOperationDraftInspector.tsx?raw';
import DraftViewportSource from './CanvasRelationalTreeDraftViewport.tsx?raw';
import InlineEditorSource from './CanvasRelationalTreeInlineEditor.tsx?raw';
import CompositionEditorSource from './CanvasRelationalTreeCompositionEditor.tsx?raw';
import OperationShelfSource from './CanvasRelationalTreeOperationShelf.tsx?raw';
import WorkbenchSource from './CanvasRelationalTreeWorkbench.tsx?raw';
import ApplyCommandSource from './canvasRelationalTreeApplyCommand.ts?raw';
import WorkbenchModelSource from './useCanvasRelationalTreeWorkbenchModel.ts?raw';
import CatalogueMemoSource from './useCanvasRelationalTreeCatalogue.ts?raw';
import AuthoringSessionSource from './useCanvasRelationalTreeAuthoringSession.ts?raw';
import GraphAuthoringSource from './useCanvasRelationalGraphAuthoring.ts?raw';
import DraftHydrationSource from './useCanvasRelationalAuthoringDraftHydration.ts?raw';
import AuthoringModelSource from './canvasRelationalTreeAuthoringModel.ts?raw';
import AuthoringCandidatesSource from './canvasRelationalTreeAuthoringCandidates.ts?raw';
import AuthoringProjectionSource from './canvasRelationalTreeAuthoringProjection.ts?raw';
import ExistingDraftSource from './canvasRelationalTreeExistingDraft.ts?raw';
import ExistingSeedSource from './useCanvasRelationalTreeExistingSeed.ts?raw';
import OperandSlotsSource from './useCanvasRelationalOperandSlots.ts?raw';
import ProjectionAuthoringSource from './canvasRelationalTreeProjectionAuthoring.ts?raw';
import PendingSource from './relational-source-occurrence/pendingSourceOccurrence.ts?raw';
import ApplyDraftSource from './canvasRelationalTreeApplyDraft.ts?raw';
import CatalogueProjectionSource from './canvasRelationalTreeCatalogue.ts?raw';
import StagedOperationSource from './canvasStagedOperation.ts?raw';
import StagedOperationProjectionSource from './canvasStagedOperationProjection.ts?raw';
import CompositionTruthSource from './canvasRelationalCompositionTruth.ts?raw';
import TransformAuthoringSource from './canvasDvtTransformAuthoring.ts?raw';
import AnalysisMemoSource from './canvasRelationalAnalysisMemo.ts?raw';
import AnalysisDependenciesSource from './canvasRelationalAnalysisDependencies.ts?raw';
import JoinOperandSource from './canvasDvtSubstraitJoinOperand.ts?raw';
import JoinOperandEditorSource from './SemanticWorkbenchJoinOperandEditor.tsx?raw';
import JoinFormSource from './join-condition/JoinConditionForm.tsx?raw';
import JoinOperandDraftSource from './join-condition/operandDraft.ts?raw';

const readSource = (name: string): string =>
  readArchitectureSiblingSource(import.meta.dirname, name);

const authoringLimits = [
  [WorkbenchModelSource, 180],
  [CatalogueMemoSource, 110],
  [AuthoringSessionSource, 180],
  [GraphAuthoringSource, 120],
  [DraftHydrationSource, 80],
  [ApplyCommandSource, 100],
  [AuthoringModelSource, 200],
  [AuthoringCandidatesSource, 150],
  [AuthoringProjectionSource, 90],
  [ExistingDraftSource, 80],
  [ExistingSeedSource, 80],
  [AuthoringSource, 140],
  [OperationDraftInspectorSource, 110],
  [DraftViewportSource, 170],
  [OperationShelfSource, 140],
  [InlineEditorSource, 80],
  [CompositionEditorSource, 80],
  [OperandSlotsSource, 90],
  [ProjectionAuthoringSource, 60],
  [SessionActionsSource, 80],
] as const;

describe('Canvas relational Workbench authoring boundaries', () => {
  it('keeps pending Source presentation off Model Input mutation and direct schema edits', () => {
    expect(
      readSource('relational-source-occurrence/PendingSourceOccurrenceProperties.tsx')
    ).not.toMatch(/onMapInput|onRemoveInput|canvasInputSlotId/);
    expect(readSource('canvasSourceOutputDefaults.ts')).not.toMatch(/emitKind\s*=|baseSchema\s*=/);
  });
  it('keeps retained JOIN recovery in the existing draft command and shared configurator', () => {
    const commands = readSource('canvasStagedOperationActions.ts');
    expect(commands).toContain('updateConfiguration:');
    expect(commands).toContain('args.configure?.(');
    expect(commands).not.toMatch(/reconfigure\s*:/);
    expect(commands).not.toMatch(/\b(?:remove|complete|disconnectProducer)\s*:/);
    expect(GraphAuthoringSource).not.toMatch(/(?:staged|occurrences)\.remove\(/);
    const view = readSource('canvasRelationalTreeAuthoringView.ts');
    expect(view).toContain('remove: session.removal.remove');
    expect(view).not.toMatch(/removePending|removeStagedOperation/);
    expect(
      readSource('useCanvasStagedOperationConfiguration.ts').match(
        /resolveCanvasStagedProducerDocument\(/g
      )
    ).toHaveLength(1);
    expect(OperationDraftInspectorSource).toContain(
      "actions.updateStagedOperation(staged.id, 'reconfigure')"
    );
    expect(DraftHydrationSource).toContain('useEffect(restore, [restore])');
    expect(AuthoringSessionSource).toContain('cancel: restore');
    for (const source of [
      readSource('CanvasStagedOperationInspector.tsx'),
      AuthoringSource,
      OperationDraftInspectorSource,
    ]) {
      expect(source).not.toMatch(
        /createCanonicalComposition|configureCanvasStagedComposition|restoreCanvasOperationConfiguration/
      );
    }
  });
  it('shares execution context and eligibility through one analysis boundary', () => {
    const boundary = readSource('CanvasStagedAnalysisProvider.tsx');
    expect(boundary).toContain('useCanvasRelationAnalysisSession(');
    expect(boundary).toContain('resolveCanvasCompositionConnection(');
    expect(boundary).toContain('binding.readFieldEligibility(document)');
    expect(readSource('CanvasStagedOperationInspector.tsx')).toContain(
      '<CanvasStagedAnalysisProvider'
    );
    expect(readSource('canvasStagedCompositionConfiguration.ts')).toContain(
      'resolveCanvasCompositionConnection('
    );
    for (const inspector of [
      'CanvasStagedCompositionInspector.tsx',
      'CanvasStagedTransformInspector.tsx',
      'CanvasStagedUnaryOperationInspector.tsx',
    ]) {
      const source = readSource(inspector);
      expect(source).not.toContain('useCanvasRelationAnalysisSession');
      expect(source).not.toContain('CanvasRelationAnalysisContext.Provider');
    }
  });
  it('shares calculated SELECT authoring through the existing atomic projection command', () => {
    for (const source of [CompositionEditorSource, TransformInspectorSource]) {
      expect(source.match(/<CanvasCalculatedRelationOutputs\b/g)).toHaveLength(1);
      expect(source).not.toMatch(/compileDerivedOutputFormula|applySelectedRelationDerivedOutput/);
    }
    expect(DerivedOutputSource).toContain('applySelectedRelationDerivedOutput');
    expect(InlineEditorSource).toContain('<CanvasRelationalTreeCompositionEditor');
    expect(InlineEditorSource).not.toContain('<CanvasCalculatedRelationOutputs');
    expect(CalculatedOutputsSource.match(/<CanvasDerivedOutputSection\b/g)).toHaveLength(1);
    expect(CalculatedOutputsSource).not.toMatch(
      /compileDerivedOutputFormula|applySelectedRelationDerivedOutput/
    );
    expect(DerivedOutputSource).toContain('authoringOwnerRelationId');
    expect(DerivedOutputSource).not.toMatch(/insertSelectedRelationTransform|session\.apply\(/);
  });
  it('has no second scalar editor on passive Model cards', () => {
    expect(
      Object.keys(
        import.meta.glob([
          './canvasColumnFunctionMenuProjection.ts',
          './canvasColumnFunctionAuthoring.ts',
          './DerivedOutputForm.tsx',
          './DerivedOutputOperands.tsx',
          '../../plugins/graph/GraphNodeExpressionComposer.tsx',
        ])
      )
    ).toEqual([]);
  });
  it('reuses the shared formula compiler without reviving JOIN scalar-chain creation', () => {
    expect(JoinFormulaSource).toContain('compileDerivedOutputFormula');
    expect(JoinFormulaSource).toContain('describeDerivedOutputFormula');
    expect(JoinFormulaEditorSource).toContain('DerivedOutputFormulaEditor');
    expect(JoinFormulaEditorSource).toContain('replaceSelectedJoinConditions');
    expect(JoinFormulaEditorSource).not.toMatch(
      /\.scalarFunction\(|ensureScalarFunction|session\.apply\(/
    );
    expect(Object.keys(import.meta.glob('./join-condition/JoinOperandFunctionChain.tsx'))).toEqual(
      []
    );
    for (const source of [JoinOperandEditorSource, JoinFormSource, JoinOperandDraftSource]) {
      expect(source).not.toMatch(
        /functionIds|JoinOperandFunctionChain|resolveDvtSubstraitJoinUnaryFunctions/
      );
    }
    expect(JoinOperandSource).not.toMatch(
      /ensureScalarFunction|\.scalarFunction\(|from ['"]react['"]/
    );
    expect(JoinOperandSource).toContain('SubstraitAnalysisError');
  });
  it('keeps memo freshness separate from React, semantic validation and mutations', () => {
    expect(AnalysisMemoSource).toContain('canvasRelationalAnalysisDependencies(args)');
    expect(AnalysisMemoSource).toContain('analyzeCanvasRelations(args)');
    expect(AnalysisDependenciesSource).toContain('readDvtTransformAuthoringAuthority');
    expect(AnalysisDependenciesSource).toContain('readCanvasInputBindings');
    for (const source of [AnalysisMemoSource, AnalysisDependenciesSource]) {
      expect(source).not.toMatch(
        /from ['"]react['"]|fetch\(|onApplyNodeDraft|applyDvt|encodeDvt|deriveSubstrait|resolveProducerGraph|zustand/
      );
    }
  });
  it('retires guided draft factories without compatibility exports', () => {
    const retired = import.meta.glob([
      './canvasRelationalTreeOperationDraft.ts',
      './canvasRelationalTreeUnionAuthoring.ts',
    ]);
    expect(Object.keys(retired)).toEqual([]);
    expect(AuthoringModelSource).not.toMatch(
      /createCanvasRelationalTreeInitialJoinDraft|resolveCanvasRelationalTreeAuthoringChoices/
    );
    expect(AuthoringModelSource).toContain('createCanvasRelationalTreeNodeDraft');
  });
  it('keeps staged mutations independent of card queries and reuses the composition catalog', () => {
    expect(StagedOperationSource).not.toMatch(
      /indexSubstraitRelations|decodeCanvasStagedOperation|buildCanvasRelationalTreeRelation|from ['"]react['"]/
    );
    expect(StagedOperationProjectionSource).not.toMatch(
      /connectCanvasStagedOperation|disconnectCanvasStagedOperation|encodeDvtSubstrait|from ['"]react['"]/
    );
    for (const reader of [CompositionTruthSource, TransformAuthoringSource, ExistingDraftSource]) {
      expect(reader).toContain('isCanvasCompositionOperation');
      expect(reader).not.toMatch(
        /isCanvasJoinOperation|isCanvasSetOperation|operation === 'cross_join'/
      );
    }
  });
  it('keeps persistence policy and presentation projection out of the React session and source identity', () => {
    expect(AuthoringSessionSource).toContain('prepareCanvasRelationalTreeApply');
    expect(AuthoringSessionSource).not.toContain('createCanvasRelationalAuthoringDraft');
    expect(AuthoringSessionSource).not.toContain('canonicalizeCanvasInspectorNodeDraft');
    expect(AuthoringSessionSource).not.toContain('areCanvasInspectorNodeDraftsEqual');
    expect(WorkbenchModelSource).not.toContain('configuredProducerIds');
    expect(PendingSource).not.toMatch(/canvasRelationalTree|buildCanvasRelationalTreeRelation/);
    for (const pure of [
      ApplyDraftSource,
      ApplyCommandSource,
      CatalogueProjectionSource,
      PendingSource,
    ]) {
      expect(pure).not.toMatch(/from ['"]react['"]|\buse(?:State|Effect|Callback|Memo)\s*\(/);
    }
    expect(CatalogueProjectionSource).not.toMatch(
      /encodeDvt|onApplyNodeDraft|restorePendingSourceOccurrence/
    );
    expect(ApplyDraftSource).not.toMatch(/JSX|\.tsx|onApplyNodeDraft/);
  });
  it('keeps draft preparation, session actions and editing in bounded components', () => {
    for (const [source, limit] of authoringLimits) {
      expect(source.split('\n').length).toBeLessThan(limit);
    }
  });
  it('keeps semantic writes in the existing authoring session', () => {
    expect(AuthoringSessionSource).toContain('createCanvasRelationalTreeApplyCommand');
    expect(AuthoringSessionSource).toContain('useCanvasRelationalTreeExistingSeed');
    expect(AuthoringSessionSource).toContain('useCanvasRelationalTreeRemoval');
    expect(RemovalSessionSource).toContain('prepareCanvasCardRemoval');
    expect(RemovalSessionSource).not.toContain('useRelationRemoval');
    expect(RemovalSessionSource).not.toContain('onApplyNodeDraft');
    expect(CardMenuSource).not.toContain('onApplyNodeDraft');
    expect(AuthoringProjectionSource).toContain('projectCanvasRelationalTree');
    expect(AuthoringProjectionSource).not.toContain('onApplyNodeDraft');
    expect(ApplyCommandSource).toContain('const result = authoring.onApplyNodeDraft(');
    expect(ApplyCommandSource).toContain("result.outcome === 'rejected'");
    expect(ApplyCommandSource).not.toContain('applyInspectorNodeDraft');
    expect(WorkbenchSource).not.toContain('CanvasRelationalTreeAuthoringPanel');
    expect(WorkbenchSource).toContain('CanvasRelationalTreeSessionActions');
    expect(WorkbenchSource).not.toContain('CanvasRelationalTreeAuthoringPrompt');
    expect(WorkbenchSource).not.toContain('CanvasRelationalTreeDraftView');
    expect(AuthoringSource).not.toContain('CanvasRelationalTreeOperationPanel');
    expect(AuthoringSource).toContain('CanvasRelationalTreeOperationShelf');
    expect(AuthoringSource).toContain('CanvasRelationalTreeDraftViewport');
    expect(WorkbenchSource).not.toContain('minmax(15rem,20rem)');
    expect(AuthoringSource).toContain('selectedRelationId');
    expect(InlineEditorSource).toContain('selectedRelationId');
  });
});
