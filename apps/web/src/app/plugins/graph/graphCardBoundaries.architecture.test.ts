/** Prevent the presentation/command coupling removed by the conservative card refactor. */
import { describe, expect, it } from 'vitest';
import { readArchitectureSiblingSource } from '../../views/architecture.test.support';
import { graphNodeCardLayoutClasses } from './graphCardVisualTokens';
import {
  graphNodeHealthPopoverClasses,
  graphNodeMetricRowClasses,
  graphNodeOperationalRailClasses,
} from './graphMetricVisualTokens';

const source = (file: string): string => readArchitectureSiblingSource(import.meta.dirname, file);

describe('card and Inspector responsibility boundaries', () => {
  it('shares metric status tones and retires unused card actions', () => {
    expect(graphNodeMetricRowClasses.valueTone).toBe(graphNodeOperationalRailClasses.valueTone);
    for (const tone of ['info', 'success', 'warning', 'danger', 'running'] as const) {
      expect(graphNodeHealthPopoverClasses.valueTone[tone]).toBe(
        graphNodeMetricRowClasses.valueTone[tone]
      );
    }
    expect(graphNodeCardLayoutClasses).not.toHaveProperty('actionsButton');
    expect(graphNodeCardLayoutClasses).not.toHaveProperty('actionsIcon');
  });

  it('keeps the relationship template independent of state, parsing and local styles', () => {
    const panel = source('../../components/inspector/SourceInputsOutputsPanel.tsx');
    expect(panel).not.toMatch(
      /useState|useMemo|useRef|useApplicationLanguageStore|readRelationship|useCanvasInspectorListOrder|useInspectorListReorder/
    );
    expect(panel).not.toMatch(/className="|const COPY/);
    expect(panel).toContain('useSourceRelationships');
    expect(panel).toContain('inspectorVisualTokens');
  });

  it('shares property facts and cell rendering across explicit presentation variants', () => {
    const section = source('../../components/inspector/NodePropertySectionView.tsx');
    const table = source('../../components/inspector/NodePropertyTable.tsx');
    const detail = source('../../components/inspector/SourceRelationshipDetail.tsx');
    expect(section).toContain('NodePropertyFacts');
    expect(detail).toContain('NodePropertyFacts');
    expect(section).toContain('NodePropertyTable');
    for (const content of [section, table, detail]) {
      expect(content).not.toMatch(/className="|\b(?:slate|gray|neutral|zinc)-\d{2,3}\b/);
      expect(content).not.toMatch(/useStore|useState|useEffect|runDraftSessionCommand/);
    }
    expect(table.match(/renderTableCell\?\.\(/g)).toHaveLength(1);
  });

  it('keeps property projection independent of card metrics and effects', () => {
    for (const file of [
      'nodePropertiesReadModel',
      'nodePropertyGeneralRows',
      'nodePropertyColumnRows',
      'nodePropertyConstraintRows',
      'nodePropertyTopologyRows',
      'nodePropertySections',
    ]) {
      const content = source(`../../components/inspector/${file}.ts`);
      expect(content).not.toMatch(/plugins\/graph|sonner|useStore|runDraftSessionCommand/);
      expect(content.trimEnd().split('\n').length, file).toBeLessThan(200);
    }
  });

  it('uses the existing column section DTO instead of duplicating its contracts', () => {
    const contract = source('graphNodeCardViewContracts.ts');
    expect(contract).toContain('columnSection: GraphNodeColumnSectionProps | null');
    expect(contract).not.toMatch(/onColumnFunctionApply|onAutomapColumns|typeLabel/);
    expect(source('GraphNodeCardView.tsx')).not.toMatch(
      /readDvtNodeConfig|toast|metadata|runDraftSessionCommand/
    );
  });

  it('has one native admission policy and a pure control projection', () => {
    const projection = source('../../views/canvas/canvasMaterializationControl.ts');
    const command = source('../../views/canvas/useCanvasInspectorCommands.ts');
    expect(projection).toContain('canConfigureNativeMaterialization');
    expect(command).toContain('canConfigureNativeMaterialization');
    expect(command).toContain('applyCanvasInspectorNodeDraftToSession');
    expect(projection).not.toMatch(/toast|sonner|localStorage|runDraftSessionCommand/);
  });
});
