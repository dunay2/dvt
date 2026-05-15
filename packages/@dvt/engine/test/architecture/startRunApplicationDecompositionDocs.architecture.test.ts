import { existsSync, readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  expectComponentDocContract,
  extractComponentDocContract,
  repoPath,
} from './engineArchitectureTestSupport.js';

const COMPONENT_GUIDE_PATH =
  'docs/architecture/components/engine/architecture/start-run-application-decomposition-component.md';
const COMPONENT_DIAGRAMS_PATH =
  'docs/architecture/components/engine/architecture/start-run-application-decomposition-diagrams.md';
const USER_STORIES_PATH =
  'docs/architecture/components/engine/architecture/start-run-application-decomposition-user-stories.md';
const EVIDENCE_PATH = 'docs/evidence/ed-20260512-we-hx-3-start-run-decomposition.md';
const RISK_PATH = 'docs/risk-register/quality/R-20260512-WE-HX-3-START-RUN-DECOMPOSITION.yaml';
const CLOSEOUT_PATH =
  'docs/planning/closeouts/20260512-we-hx-3-start-run-application-decomposition-closeout.md';
const PLAN_PATH =
  'docs/planning/proposals/mandatory/runtime-and-contracts/workflow-engine-hexagonal-derivation-plan-20260403.md';

describe('WE-HX-3 start-run documentation pack', () => {
  it('declares a structured component document contract instead of relying on headings', () => {
    const guide = readFileSync(repoPath(COMPONENT_GUIDE_PATH), 'utf8');
    const contract = extractComponentDocContract(guide);

    expectComponentDocContract(contract, {
      componentId: 'WE-HX-3-START-RUN-DECOMPOSITION',
      diagramPack: COMPONENT_DIAGRAMS_PATH,
      commandRails: ['IWorkflowEngine.startRun'],
      publicApi: [
        'StartRunApplicationService',
        'StartRunAdmissionService',
        'StartRunIntentService',
        'StartRunExecutionService',
        'StartRunFailurePolicy',
      ],
      requiredSemantics: ['public-api', 'invariants', 'transitions', 'consumers', 'diagrams'],
    });
  });

  it('keeps the WE-HX-3 documentation pack complete and manifest-declared', () => {
    for (const path of [
      COMPONENT_GUIDE_PATH,
      COMPONENT_DIAGRAMS_PATH,
      USER_STORIES_PATH,
      EVIDENCE_PATH,
      RISK_PATH,
      CLOSEOUT_PATH,
    ]) {
      expect(existsSync(repoPath(path)), `${path} should exist`).toBe(true);
    }

    const guide = readFileSync(repoPath(COMPONENT_GUIDE_PATH), 'utf8');
    const contract = extractComponentDocContract(guide);
    expect(existsSync(repoPath(contract.diagramPack ?? ''))).toBe(true);

    const plan = readFileSync(repoPath(PLAN_PATH), 'utf8');
    for (const path of [
      COMPONENT_GUIDE_PATH,
      COMPONENT_DIAGRAMS_PATH,
      USER_STORIES_PATH,
      EVIDENCE_PATH,
      RISK_PATH,
      CLOSEOUT_PATH,
    ]) {
      expect(plan, `${path} should be declared in WE-HX-3 mechanization`).toContain(path);
    }
  });
});
