#!/usr/bin/env node
/**
 * Minimal docs validator (config-driven).
 *
 * Enforces:
 *  - If arc.json says evidenceDoc required, there must be at least one ED file under policy.artifacts.evidence_dir.
 *  - ED front-matter must include required keys from policy.validation.evidence_doc.required_front_matter_keys.
 *  - If riskUpdate required, there must be a changed file under policy.artifacts.risk_dir.
 *
 * Inputs:
 *  - ARC_JSON (env) path to arc.json (default: arc.json)
 *  - ARC_POLICY (env) path to .arc-policy.yaml (default: .arc-policy.yaml)
 *  - git base/head refs (GIT_BASE, GIT_HEAD)
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import yaml from 'js-yaml';

const arcJsonPath = process.env.ARC_JSON || 'arc.json';
const policyPath = process.env.ARC_POLICY || '.arc-policy.yaml';
const base = process.env.GIT_BASE || 'origin/main';
const head = process.env.GIT_HEAD || 'HEAD';

function fail(msg) {
  console.error(`DOCS-VALIDATION-FAIL: ${msg}`);
  process.exit(2);
}

function readJson(fp) {
  if (!fs.existsSync(fp)) fail(`Missing ${fp}`);
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}

function readPolicy(fp) {
  if (!fs.existsSync(fp)) fail(`Missing policy file: ${fp}`);
  return yaml.load(fs.readFileSync(fp, 'utf8'));
}

function listChangedFiles() {
  const out = execSync(`git diff --name-only ${base}...${head}`, { encoding: 'utf8' });
  return out
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

function listMdFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const all = [];
  for (const name of fs.readdirSync(dir)) {
    const fp = path.join(dir, name);
    const st = fs.statSync(fp);
    if (st.isFile() && fp.endsWith('.md')) all.push(fp);
  }
  return all;
}

function parseFrontMatter(mdText) {
  if (!mdText.startsWith('---')) return null;
  const end = mdText.indexOf('\n---', 3);
  if (end === -1) return null;
  const fmText = mdText.slice(3, end).trim();
  return yaml.load(fmText);
}

const arc = readJson(arcJsonPath);
const policy = readPolicy(policyPath);

if (!arc.isArc) process.exit(0);

const evidenceDir = policy.artifacts?.evidence_dir || 'docs/evidence';
const riskDir = policy.artifacts?.risk_dir || 'docs/risk-register';

const changed = listChangedFiles();

if (arc.requirements?.evidenceDoc) {
  const edFiles = listMdFiles(evidenceDir);
  if (edFiles.length === 0) fail(`Evidence Doc required but none found in ${evidenceDir}`);

  const requiredKeys = policy.validation?.evidence_doc?.required_front_matter_keys || [];
  const requireEvidenceTestsFor =
    policy.validation?.evidence_doc?.require_evidence_tests_for_levels || [];

  for (const fp of edFiles) {
    const txt = fs.readFileSync(fp, 'utf8');
    const fm = parseFrontMatter(txt);
    if (!fm) fail(`ED must include YAML front-matter: ${fp}`);

    for (const k of requiredKeys) {
      if (!(k in fm)) fail(`ED ${fp} missing front-matter key: ${k}`);
    }

    // evidence.tests required for ARC-2/3 by default policy
    if (requireEvidenceTestsFor.includes(String(arc.effectiveArcLevel).toUpperCase())) {
      if (!Array.isArray(fm.evidence?.tests)) {
        fail(
          `ED ${fp} must include evidence.tests as an array (policy requires for ${arc.effectiveArcLevel})`
        );
      }
    }
  }
}

if (arc.requirements?.riskUpdate) {
  // Per-risk files default: expect a change under docs/risk-register/<domain>/R-*.md

  const riskTouched = changed.some((f) => f.startsWith(riskDir + '/'));
  if (!riskTouched) fail(`Risk update required but no changes under ${riskDir}/`);
}

process.exit(0);
