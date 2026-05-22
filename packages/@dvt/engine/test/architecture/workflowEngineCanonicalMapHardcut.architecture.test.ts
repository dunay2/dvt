import { describe, expect, it } from 'vitest';

import {
  engineArchitectureDocPath,
  expectFileExists,
  readEngineArchitectureDoc,
  readEngineSource,
  readRepoSource,
  repoPath,
} from './engineArchitectureTestSupport.js';

const WorkflowEngineCanonicalMapHardcutGuard = {
  canonicalDocs: [
    'workflow-engine-subsystem-context.md',
    'workflow-engine-target-architecture.v1.md',
    'workflow-engine-facade-use-cases-component.md',
    'workflow-engine-runtime-path-decomposition-component.md',
    'workflow-engine-runtime-path-decomposition-user-stories.md',
    'workflow-engine-semantic-closure-component.md',
    'workflow-engine-semantic-closure-user-stories.md',
  ],
  forbiddenPostureTokens: [
    'compatibility-first',
    'public compatibility facade',
    'compatibility facade',
    'compatibility adapter',
    'compatibility assembler',
    'compatibility run-control',
    'older combined',
    'old callers',
    'existing factory call sites can migrate',
    'public `IWorkflowEngine` contract is unchanged',
    'keeping compatibility facade',
  ],
} as const;

describe('WorkflowEngine canonical map hardcut architecture', () => {
  it('removes retrocompatibility posture from active WorkflowEngine canonical docs', () => {
    for (const fileName of WorkflowEngineCanonicalMapHardcutGuard.canonicalDocs) {
      expectFileExists(engineArchitectureDocPath(fileName));
      const markdown = readEngineArchitectureDoc(fileName);

      for (const forbidden of WorkflowEngineCanonicalMapHardcutGuard.forbiddenPostureTokens) {
        expect(markdown, `${fileName} must not keep ${forbidden}`).not.toContain(forbidden);
      }
    }

    const proposal = readRepoSource(
      'docs/planning/proposals/mandatory/runtime-and-contracts/workflow-engine-hexagonal-derivation-plan-20260403.md'
    );
    for (const forbidden of [
      'compatibility-first',
      'public compatibility facade',
      'Compatibility facade narrowing',
      'thin compatibility adapter',
      'keeping compatibility facade',
    ]) {
      expect(proposal, `proposal must not keep ${forbidden}`).not.toContain(forbidden);
    }

    expect(proposal).toContain('WE-HX-0-HARDCUT-CANONICAL-MAP');
    expect(proposal).toContain('hardcut subsystem context');
    expect(proposal).toContain('without keeping retrocompatibility posture');
  });

  it('keeps run-control source ownership semantic without compatibility wording', () => {
    const coreService = readEngineSource('core/WorkflowEngineCoreService.ts');
    const commandService = readEngineSource('services/runControl/RunCommandService.ts');
    const signalService = readEngineSource('services/runControl/RunSignalService.ts');

    expect(coreService.slice(0, 700)).toContain('combined run-control delegator');
    expect(commandService.slice(0, 700)).toContain('runtime cancel command service');
    expect(signalService.slice(0, 700)).toContain('runtime signal command service');

    for (const source of [coreService, commandService, signalService]) {
      const header = source.slice(0, 700);
      expect(header).not.toContain('compatibility');
      expect(header).not.toContain('legacy');
    }
  });

  it('points user-facing WorkflowEngine guidance at the current component path', () => {
    const guidePath = repoPath('docs/guides/workflow-engine-user-manual.v1.md');
    expectFileExists(guidePath);

    const guide = readRepoSource('docs/guides/workflow-engine-user-manual.v1.md');
    expect(guide).toContain(
      'docs/architecture/components/engine/architecture/workflow-engine-subsystem-context.md'
    );
    expect(guide).toContain(
      'docs/architecture/components/engine/architecture/workflow-engine-target-architecture.v1.md'
    );
    expect(guide).not.toContain('docs/architecture/engine/');
  });

  it('keeps the active engine roadmap aligned with the hardcut posture', () => {
    const roadmap = readRepoSource('docs/architecture/components/engine/roadmap/engine-phases.md');

    expect(roadmap).toContain('Canonical engine narrative replacement');
    expect(roadmap).toContain('Facade use-case narrowing');

    for (const forbidden of [
      'Compatibility-facade narrowing',
      'compatibility facade narrowing',
      'compatibility-first',
      'compatibility facade',
    ]) {
      expect(roadmap, `engine roadmap must not keep ${forbidden}`).not.toContain(forbidden);
    }
  });

  it('keeps Lane A WE-HX planning language aligned with the hardcut posture', () => {
    const lane = readRepoSource('docs/planning/state/agent-lane-a.yaml');
    const weHxBlock = lane.slice(
      lane.indexOf('  - task_id: WE-HX\n'),
      lane.indexOf('  - task_id: WE-HX-0\n')
    );
    const weHx2Block = lane.slice(
      lane.indexOf('  - task_id: WE-HX-2\n'),
      lane.indexOf('  - task_id: WE-HX-3\n')
    );
    const weHx3Block = lane.slice(
      lane.indexOf('  - task_id: WE-HX-3\n'),
      lane.indexOf('  - task_id: WE-HX-4\n')
    );
    const weHxPlanningText = [weHxBlock, weHx2Block, weHx3Block].join('\n');

    expect(weHxBlock).toContain(
      'derive the full WorkflowEngine subsystem to a hardcut hexagonal architecture'
    );
    expect(weHx2Block).toContain(
      'narrow WorkflowEngine to a facade over dedicated use-case services'
    );
    expect(weHx3Block).toContain(
      'Start-run application flow is decomposed into admission, intent, execution, and failure-policy'
    );

    for (const forbidden of [
      'compatibility-first',
      'compatibility facade',
      'Compatibility-facade',
    ]) {
      expect(weHxPlanningText, `Lane A WE-HX blocks must not keep ${forbidden}`).not.toContain(
        forbidden
      );
    }
  });
});
