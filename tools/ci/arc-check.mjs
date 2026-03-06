#!/usr/bin/env node
/**
 * ARC policy evaluator (config-driven).
 *
 * Inputs:
 *  - .arc-policy.yaml (repo root or provided via ARC_POLICY env var)
 *  - git base/head refs (GIT_BASE, GIT_HEAD)
 *
 * Output (stdout): arc.json
 *  {
 *    "isArc": true|false,
 *    "declaredArcLevel": "ARC-0|ARC-1|ARC-2|ARC-3|NA",
 *    "effectiveArcLevel": "ARC-0|ARC-1|ARC-2|ARC-3",
 *    "reasons": { "triggerHits": [...], "changedFiles": [...] },
 *    "requirements": { "evidenceDoc": bool, "riskUpdate": bool, "rolloutNotes": bool, "compatMatrix": bool },
 *    "requiredChecks": [ ... ],
 *    "policyVersion": 1
 *  }
 *
 * Notes:
 *  - This script is intentionally minimal and avoids keyword heuristics.
 *  - Declared ARC level can be provided via env DECLARED_ARC_LEVEL (optional).
 */

import fs from 'node:fs';
import { execSync } from 'node:child_process';
import yaml from 'js-yaml';

const base = process.env.GIT_BASE || 'origin/main';
const head = process.env.GIT_HEAD || 'HEAD';
const policyPath = process.env.ARC_POLICY || '.arc-policy.yaml';
const declaredArcLevel = (process.env.DECLARED_ARC_LEVEL || 'NA').toUpperCase();

function readPolicy(fp) {
  if (!fs.existsSync(fp)) throw new Error(`Policy file not found: ${fp}`);
  const raw = fs.readFileSync(fp, 'utf8');
  return yaml.load(raw);
}

function listChangedFiles() {
  const out = execSync(`git diff --name-only ${base}...${head}`, { encoding: 'utf8' });
  return out
    .split('\n')
    .map((value) => value.trim())
    .filter(Boolean);
}

// Minimal glob matcher using picomatch-like behavior is ideal,
// but to avoid extra deps, support ** and * with a simple conversion.
// For production, consider adding `picomatch` (tiny, widely used).
function globToRegExp(glob) {
  // Escape regex special chars, then re-introduce glob semantics.
  const esc = glob.replaceAll(/[.+^${}()|[\]\\]/g, String.raw`\$&`);
  const doubleStarMarker = '__DOUBLESTAR__';
  const re = esc
    .replaceAll('**', doubleStarMarker)
    .replaceAll('*', '[^/]*')
    .replaceAll(doubleStarMarker, '.*');
  return new RegExp(`^${re}$`);
}

function levelRank(level) {
  switch (level) {
    case 'ARC-0':
      return 0;
    case 'ARC-1':
      return 1;
    case 'ARC-2':
      return 2;
    case 'ARC-3':
      return 3;
    default:
      return -1;
  }
}

function maxLevel(a, b) {
  return levelRank(a) >= levelRank(b) ? a : b;
}

const policy = readPolicy(policyPath);
const changedFiles = listChangedFiles();

let effective = 'ARC-0';
const triggerHits = [];

for (const trigger of policy.triggers || []) {
  const globs = trigger.globs || [];
  const regexes = globs.map(globToRegExp);

  const hits = changedFiles.filter((file) => regexes.some((regex) => regex.test(file)));
  if (hits.length > 0) {
    effective = maxLevel(effective, String(trigger.min_arc_level || 'ARC-0').toUpperCase());
    triggerHits.push({
      name: trigger.name,
      min_arc_level: String(trigger.min_arc_level || 'ARC-0').toUpperCase(),
      guides: trigger.guides || [],
      require: trigger.require || {},
      hits: hits.slice(0, 200),
    });
  }
}

const isArc = levelRank(effective) > 0;

// Aggregate guide hints (non-enforced)
const guideSet = new Set();
for (const hit of triggerHits) {
  const guides = hit.guides || [];
  if (Array.isArray(guides)) {
    for (const guide of guides) {
      guideSet.add(String(guide));
    }
  }
}
const recommendedGuides = Array.from(guideSet);

// Aggregate requirements from triggers that matched at the effective level or higher.
const requirements = {
  evidenceDoc: false,
  riskUpdate: false,
  rolloutNotes: false,
  compatMatrix: false,
};
for (const hit of triggerHits) {
  const requireConfig = hit.require || {};
  if (requireConfig.evidence_doc) requirements.evidenceDoc = true;
  if (requireConfig.risk_update) requirements.riskUpdate = true;
  if (requireConfig.rollout_notes) requirements.rolloutNotes = true;
  if (requireConfig.compat_matrix) requirements.compatMatrix = true;
}

// Baseline requirements by level (ED for ARC-2/3)
if (levelRank(effective) >= levelRank('ARC-2')) requirements.evidenceDoc = true;
if (effective === 'ARC-3') requirements.riskUpdate = true;

// Determine required checks
const checks = policy.checks?.[effective] ?? ['lint', 'test'];

const result = {
  isArc,
  declaredArcLevel,
  effectiveArcLevel: effective,
  reasons: { triggerHits, changedFiles: changedFiles.slice(0, 500) },
  requirements,
  requiredChecks: checks,
  policyVersion: policy.version ?? 1,
  recommendedGuides,
};

console.error(
  `[ARC] effective=${result.effectiveArcLevel} isArc=${result.isArc} checks=${result.requiredChecks.join(',')}`
);
if (result.recommendedGuides?.length) {
  console.error(`[ARC] Recommended guides: ${result.recommendedGuides.join(', ')}`);
}
if (
  result.isArc &&
  result.effectiveArcLevel !== result.declaredArcLevel &&
  result.declaredArcLevel !== 'NA'
) {
  console.error(
    `[ARC] policy upgraded declared level (${result.declaredArcLevel}) -> effective (${result.effectiveArcLevel}).`
  );
}
if (result.isArc && result.requirements.evidenceDoc) {
  console.error(
    `[ARC] Evidence Doc required under ${policy.artifacts?.evidence_dir || 'docs/evidence'}`
  );
}
if (result.isArc && result.requirements.riskUpdate) {
  console.error(
    `[ARC] Risk update required under ${policy.artifacts?.risk_dir || 'docs/risk-register'}`
  );
}
process.stdout.write(JSON.stringify(result, null, 2));
