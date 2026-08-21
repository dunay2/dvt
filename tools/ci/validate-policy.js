#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
// No dirname needed in this script

function usage() {
  console.error('Usage: validate-policy.js <policy.json>');
  process.exit(2);
}

if (process.argv.length < 3) usage();

const policyPath = path.resolve(process.cwd(), process.argv[2]);
if (!fs.existsSync(policyPath)) {
  console.error('Policy file not found:', policyPath);
  process.exit(2);
}

let policy;
try {
  policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
} catch (err) {
  console.error('Failed to parse JSON:', err.message);
  process.exit(2);
}

const requiredKeys = [
  ...(path.basename(policyPath) === 'workflow-scope.json'
    ? [
        'any_code',
        'docs_changed',
        'docs_structure_changed',
        'generated_status_relevant',
        'generated_capability_relevant',
        'changed_file_validation_relevant',
        'security_analysis_relevant',
        'workspace_global',
        'workspace_api',
        'workspace_lineage_worker',
        'workspace_outbox_worker',
        'workspace_projector_worker',
        'workspace_temporal_worker',
        'workspace_web',
        'workspace_artifacts',
        'workspace_crypto',
        'workspace_contracts',
        'workspace_delivery',
        'workspace_dsl',
        'workspace_engine',
        'workspace_observability',
        'workspace_observability_otel',
        'workspace_plan_interpreter',
        'workspace_plan_verifier',
        'workspace_planner',
        'workspace_run_domain',
        'workspace_state_store',
        'workspace_traceability_service',
        'workspace_adapter_postgres',
        'workspace_adapter_temporal',
        'workspace_cli',
      ]
    : ['adapter_postgres', 'adapter_postgres_relevant']),
];
let ok = true;
for (const k of requiredKeys) {
  if (!Object.hasOwn(policy, k)) {
    console.error('Missing required key in policy:', k);
    ok = false;
    continue;
  }
  if (!Array.isArray(policy[k]) || policy[k].some((p) => typeof p !== 'string')) {
    console.error('Invalid value for key (must be array of strings):', k);
    ok = false;
  }
}

if (!ok) process.exit(2);
console.log('Policy validation passed');
