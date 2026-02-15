$ErrorActionPreference = 'Stop'

$repo = 'dunay2/dvt'

function Ensure-Label {
  param(
    [string]$Name,
    [string]$Color = '1D76DB',
    [string]$Description = ''
  )

  $exists = $false
  try {
    gh label view $Name --repo $repo | Out-Null
    $exists = $true
  } catch {
    $exists = $false
  }

  if (-not $exists) {
    gh label create $Name --repo $repo --color $Color --description $Description | Out-Null
    Write-Output "CREATED LABEL: $Name"
  } else {
    Write-Output "EXISTS LABEL: $Name"
  }
}

function Ensure-Milestone {
  param([string]$Title)

  $all = gh api "repos/$repo/milestones?state=all&per_page=100" | ConvertFrom-Json
  $hit = $all | Where-Object { $_.title -eq $Title } | Select-Object -First 1
  if (-not $hit) {
    $m = gh api -X POST "repos/$repo/milestones" -f title="$Title" | ConvertFrom-Json
    Write-Output "CREATED MILESTONE: $($m.title) | $($m.html_url)"
    return $m
  }
  Write-Output "EXISTS MILESTONE: $($hit.title) | $($hit.html_url)"
  return $hit
}

function Ensure-Issue {
  param(
    [string]$Title,
    [string]$Body,
    [string]$Milestone,
    [string[]]$Labels
  )

  $allIssues = gh issue list --repo $repo --state all --limit 1000 --json title,url | ConvertFrom-Json
  $hit = $allIssues | Where-Object { $_.title -eq $Title } | Select-Object -First 1
  if ($hit) {
    Write-Output "EXISTS ISSUE: $Title | $($hit.url)"
    return $hit.url
  }

  $args = @('issue', 'create', '--repo', $repo, '--title', $Title, '--body', $Body, '--milestone', $Milestone)
  foreach ($l in $Labels) {
    $args += @('--label', $l)
  }

  $url = gh @args
  Write-Output "CREATED ISSUE: $Title | $url"
  return $url
}

# 1) Labels
$labels = @('epic','story','contracts','engine','runner','plugin','ui','security','testing')
foreach ($l in $labels) {
  Ensure-Label -Name $l -Description "Backlog V2: $l"
}

# 2) Milestones
$milestones = @(
  'EPICA-1 Foundation & Core Contracts',
  'EPICA-2 Execution Planning',
  'EPICA-3 Runner & Execution',
  'EPICA-4 Cost & Guardrails',
  'EPICA-5 Observabilidad E2E',
  'EPICA-6 Plugin Runtime',
  'EPICA-7 UI Shell & Graph Workspace',
  'EPICA-8 Seguridad & Multi-Tenant',
  'EPICA-9 Roundtrip Controlado',
  'EPICA-10 Testing & Quality Gates'
)

foreach ($m in $milestones) {
  Ensure-Milestone -Title $m | Out-Null
}

# 3) Epic tracking issues
$epics = @(
  @{ title='EPICA-1 Foundation & Core Contracts'; ms='EPICA-1 Foundation & Core Contracts'; labels=@('epic','contracts','engine'); body='Tracking issue for EPICA-1. Stories: US-1.1, US-1.2, US-1.3' },
  @{ title='EPICA-2 Execution Planning'; ms='EPICA-2 Execution Planning'; labels=@('epic','engine'); body='Tracking issue for EPICA-2. Stories: US-2.1, US-2.2, US-2.3' },
  @{ title='EPICA-3 Runner & Execution'; ms='EPICA-3 Runner & Execution'; labels=@('epic','runner','engine'); body='Tracking issue for EPICA-3. Stories: US-3.1, US-3.2, US-3.3' },
  @{ title='EPICA-4 Cost & Guardrails'; ms='EPICA-4 Cost & Guardrails'; labels=@('epic','plugin','engine'); body='Tracking issue for EPICA-4. Stories: US-4.1, US-4.2' },
  @{ title='EPICA-5 Observabilidad E2E'; ms='EPICA-5 Observabilidad E2E'; labels=@('epic','engine'); body='Tracking issue for EPICA-5. Stories: US-5.1, US-5.2' },
  @{ title='EPICA-6 Plugin Runtime'; ms='EPICA-6 Plugin Runtime'; labels=@('epic','plugin'); body='Tracking issue for EPICA-6. Stories: US-6.1, US-6.2' },
  @{ title='EPICA-7 UI Shell & Graph Workspace'; ms='EPICA-7 UI Shell & Graph Workspace'; labels=@('epic','ui'); body='Tracking issue for EPICA-7. Stories: US-7.1, US-7.2' },
  @{ title='EPICA-8 Seguridad & Multi-Tenant'; ms='EPICA-8 Seguridad & Multi-Tenant'; labels=@('epic','security'); body='Tracking issue for EPICA-8. Stories: US-8.1, US-8.2, US-8.3' },
  @{ title='EPICA-9 Roundtrip Controlado'; ms='EPICA-9 Roundtrip Controlado'; labels=@('epic','engine'); body='Tracking issue for EPICA-9. Stories: US-9.1, US-9.2, US-9.3' },
  @{ title='EPICA-10 Testing & Quality Gates'; ms='EPICA-10 Testing & Quality Gates'; labels=@('epic','testing'); body='Tracking issue for EPICA-10. Stories: US-10.1, US-10.2, US-10.3' }
)

foreach ($e in $epics) {
  $body = "$($e.body)`n`nSource: docs/planning/BACKLOG_V2_GITHUB_EXECUTION.md"
  Ensure-Issue -Title $e.title -Body $body -Milestone $e.ms -Labels $e.labels | Out-Null
}

# 4) User stories
$stories = @(
  @{ t='US-1.1 Definir contratos base de dominio'; ms='EPICA-1 Foundation & Core Contracts'; labels=@('story','contracts','engine') },
  @{ t='US-1.2 Ingestión de artefactos dbt'; ms='EPICA-1 Foundation & Core Contracts'; labels=@('story','engine') },
  @{ t='US-1.3 Snapshot del grafo (CQRS)'; ms='EPICA-1 Foundation & Core Contracts'; labels=@('story','engine') },
  @{ t='US-2.1 ExecutionPlan V2 contract'; ms='EPICA-2 Execution Planning'; labels=@('story','contracts','engine') },
  @{ t='US-2.2 Selection Translator'; ms='EPICA-2 Execution Planning'; labels=@('story','engine') },
  @{ t='US-2.3 Policy Engine plugin-based'; ms='EPICA-2 Execution Planning'; labels=@('story','plugin','engine') },
  @{ t='US-3.1 Runner dbt Core aislado'; ms='EPICA-3 Runner & Execution'; labels=@('story','runner') },
  @{ t='US-3.2 QUERY_TAG + correlación Snowflake'; ms='EPICA-3 Runner & Execution'; labels=@('story','runner','engine') },
  @{ t='US-3.3 Integración dbt Cloud API v2'; ms='EPICA-3 Runner & Execution'; labels=@('story','runner') },
  @{ t='US-4.1 Cost Provider interface'; ms='EPICA-4 Cost & Guardrails'; labels=@('story','plugin','engine') },
  @{ t='US-4.2 Cost Guardrails plugin'; ms='EPICA-4 Cost & Guardrails'; labels=@('story','plugin') },
  @{ t='US-5.1 OpenTelemetry tracing'; ms='EPICA-5 Observabilidad E2E'; labels=@('story','engine') },
  @{ t='US-5.2 Logs streaming + redaction'; ms='EPICA-5 Observabilidad E2E'; labels=@('story','security') },
  @{ t='US-6.1 Plugin manifest + apiVersion'; ms='EPICA-6 Plugin Runtime'; labels=@('story','plugin') },
  @{ t='US-6.2 Backend plugin execution'; ms='EPICA-6 Plugin Runtime'; labels=@('story','plugin','engine') },
  @{ t='US-7.1 Graph read-only workspace'; ms='EPICA-7 UI Shell & Graph Workspace'; labels=@('story','ui') },
  @{ t='US-7.2 Execution Plan UI'; ms='EPICA-7 UI Shell & Graph Workspace'; labels=@('story','ui') },
  @{ t='US-8.1 Tenant/org/project/env model'; ms='EPICA-8 Seguridad & Multi-Tenant'; labels=@('story','security','engine') },
  @{ t='US-8.2 RBAC con Casbin'; ms='EPICA-8 Seguridad & Multi-Tenant'; labels=@('story','security') },
  @{ t='US-8.3 Secrets + audit inmutable'; ms='EPICA-8 Seguridad & Multi-Tenant'; labels=@('story','security') },
  @{ t='US-9.1 Drafts + optimistic locking'; ms='EPICA-9 Roundtrip Controlado'; labels=@('story','engine') },
  @{ t='US-9.2 Managed assets (Nivel 1)'; ms='EPICA-9 Roundtrip Controlado'; labels=@('story','engine') },
  @{ t='US-9.3 Ownership explícito (Nivel 2)'; ms='EPICA-9 Roundtrip Controlado'; labels=@('story','engine') },
  @{ t='US-10.1 Golden tests dbt'; ms='EPICA-10 Testing & Quality Gates'; labels=@('story','testing') },
  @{ t='US-10.2 Roundtrip tests'; ms='EPICA-10 Testing & Quality Gates'; labels=@('story','testing') },
  @{ t='US-10.3 Performance tests (50k nodos)'; ms='EPICA-10 Testing & Quality Gates'; labels=@('story','testing') }
)

foreach ($s in $stories) {
  $body = "Backlog V2 user story.`n`nSource: docs/planning/BACKLOG_V2_EPICS_AND_STORIES.md`nExecution: docs/planning/BACKLOG_V2_GITHUB_EXECUTION.md"
  Ensure-Issue -Title $s.t -Body $body -Milestone $s.ms -Labels $s.labels | Out-Null
}

Write-Output "DONE: Milestones, epic issues and story issues ensured."

