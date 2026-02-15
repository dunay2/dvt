$ErrorActionPreference = 'Stop'

$repo = 'dunay2/dvt'

function Ensure-Label {
  param([string]$Name,[string]$Color='5319E7',[string]$Description='')
  $names = (gh label list --repo $repo --limit 300 --json name | ConvertFrom-Json).name
  if ($names -notcontains $Name) {
    gh label create $Name --repo $repo --color $Color --description $Description | Out-Null
    Write-Output "CREATED LABEL: $Name"
  }
}

function Ensure-Milestone {
  param([string]$Title)
  $all = gh api "repos/$repo/milestones?state=all&per_page=100" | ConvertFrom-Json
  $m = $all | Where-Object { $_.title -eq $Title } | Select-Object -First 1
  if (-not $m) {
    $m = gh api -X POST "repos/$repo/milestones" -f title="$Title" | ConvertFrom-Json
    Write-Output "CREATED MILESTONE: $($m.title)"
  }
}

Ensure-Label -Name 'task' -Color 'FBCA04' -Description 'Backlog V2: implementation task'
Ensure-Label -Name 'legacy-track' -Color 'C5DEF5' -Description 'Legacy issue normalized into Backlog V2'

Ensure-Milestone -Title 'EPICA-11 AI Gateway Service'

# Ensure Epic issue for EPICA-11
$existing = gh issue list --repo $repo --state all --limit 1000 --json number,title,url | ConvertFrom-Json
$epic11 = $existing | Where-Object { $_.title -eq 'EPICA-11 AI Gateway Service' } | Select-Object -First 1
if (-not $epic11) {
  $epic11Url = gh issue create --repo $repo --title 'EPICA-11 AI Gateway Service' --body 'Tracking issue for AI Gateway backlog normalization. Legacy issues #98-#106 mapped as user stories/tasks.' --milestone 'EPICA-11 AI Gateway Service' --label 'epic,engine'
  Write-Output "CREATED EPIC ISSUE: $epic11Url"
}

# Normalize AI Gateway issues as user stories under EPICA-11
$aiMap = @(
  @{ n=98; t='US-11.1 AI Gateway contract baseline (OpenAPI + TS types + adapter interface)' },
  @{ n=99; t='US-11.2 AI Gateway OpenAPI specification and examples' },
  @{ n=100; t='US-11.3 AI Gateway Zod schemas and TypeScript types' },
  @{ n=101; t='US-11.4 AI Gateway provider adapter interface and Ollama example' },
  @{ n=102; t='US-11.5 AI Gateway server endpoints and wiring' },
  @{ n=103; t='US-11.6 AI Gateway unit and contract tests' },
  @{ n=104; t='US-11.7 AI Gateway CI validation for OpenAPI and tests' },
  @{ n=105; t='US-11.8 AI Gateway documentation and compose snippet' },
  @{ n=106; t='US-11.9 AI Gateway readiness semantics and error mapping' }
)

foreach ($x in $aiMap) {
  gh issue edit $x.n --repo $repo --title $x.t --milestone 'EPICA-11 AI Gateway Service' --add-label 'story,engine,legacy-track' | Out-Null
  gh issue comment $x.n --repo $repo --body 'Backlog V2 normalization: converted to user story format, assigned to milestone EPICA-11 AI Gateway Service, and kept as active implementation scope.' | Out-Null
  Write-Output "UPDATED AI STORY: #$($x.n)"
}

# Legacy open issues -> normalize as tasks + align milestones (English tracking)
$legacy = @(
  @{ n=4;  m='EPICA-10 Testing & Quality Gates'; note='Determinism linting is tracked as quality gate task.' },
  @{ n=6;  m='EPICA-1 Foundation & Core Contracts'; note='Postgres state store remains a core foundation task.' },
  @{ n=7;  m='EPICA-10 Testing & Quality Gates'; note='ESLint/Husky remains quality tooling task.' },
  @{ n=12; m='EPICA-5 Observabilidad E2E'; note='SLO and severity matrix aligned with observability epic.' },
  @{ n=14; m='EPICA-1 Foundation & Core Contracts'; note='WorkflowEngine/SnapshotProjector tracked as core contracts task.' },
  @{ n=15; m='EPICA-3 Runner & Execution'; note='Interpreter workflow tracked under runner/execution epic.' },
  @{ n=18; m='EPICA-5 Observabilidad E2E'; note='Load and chaos validation aligned with observability and reliability.' },
  @{ n=66; m='EPICA-1 Foundation & Core Contracts'; note='Prisma/Postgres sub-scope retained as foundation task.' },
  @{ n=67; m='EPICA-8 Seguridad & Multi-Tenant'; note='Runtime boundary validation aligned with security hardening.' },
  @{ n=68; m='EPICA-3 Runner & Execution'; note='Temporal adapter tracked under runner/execution epic.' },
  @{ n=69; m='EPICA-3 Runner & Execution'; note='Conductor adapter tracked under runner/execution epic.' },
  @{ n=70; m='EPICA-10 Testing & Quality Gates'; note='Golden fixtures tracked under testing gates.' },
  @{ n=71; m='EPICA-3 Runner & Execution'; note='Conductor draining/termination tracked under runner/execution.' },
  @{ n=72; m='EPICA-1 Foundation & Core Contracts'; note='Capability version binding aligned with core contracts.' },
  @{ n=73; m='EPICA-10 Testing & Quality Gates'; note='Determinism test breadth tracked under testing gates.' },
  @{ n=89; m='EPICA-10 Testing & Quality Gates'; note='Release/versioning docs normalization tracked under quality governance.' }
)

# English title normalization for non-English legacy issues
gh issue edit 66 --repo $repo --title 'feat(state-store): Implement Prisma for PostgreSQL State Store (unblock #6)' | Out-Null
gh issue edit 89 --repo $repo --title 'docs: normalize version management and migrate to release-please' | Out-Null

foreach ($l in $legacy) {
  gh issue edit $l.n --repo $repo --milestone $l.m --add-label 'task,legacy-track' | Out-Null
  gh issue comment $l.n --repo $repo --body ("Backlog V2 normalization: this legacy issue is retained as an implementation task under milestone '" + $l.m + "'. " + $l.note) | Out-Null
  Write-Output "NORMALIZED LEGACY ISSUE: #$($l.n) -> $($l.m)"
}

Write-Output 'DONE: Backlog V2 normalization applied (milestones, stories, tasks, comments).'

