$ErrorActionPreference = 'Stop'

$repo = 'dunay2/dvt'

function Get-LabelNames {
  $raw = gh label list --repo $repo --limit 500 --json name
  if (-not $raw) { return @() }
  return ($raw | ConvertFrom-Json | ForEach-Object { $_.name })
}

function Ensure-Label {
  param(
    [string]$Name,
    [string]$Color = '1D76DB',
    [string]$Description = ''
  )

  $names = Get-LabelNames
  if ($names -contains $Name) {
    Write-Output "EXISTS LABEL: $Name"
    return
  }

  gh label create $Name --repo $repo --color $Color --description $Description | Out-Null
  Write-Output "CREATED LABEL: $Name"
}

function Ensure-Milestone {
  param([string]$Title)

  $all = gh api "repos/$repo/milestones?state=all&per_page=100" | ConvertFrom-Json
  $hit = $all | Where-Object { $_.title -eq $Title } | Select-Object -First 1

  if ($null -eq $hit) {
    $m = gh api -X POST "repos/$repo/milestones" -f title="$Title" | ConvertFrom-Json
    Write-Output "CREATED MILESTONE: $($m.title) | $($m.html_url)"
    return $m
  }

  Write-Output "EXISTS MILESTONE: $($hit.title) | $($hit.html_url)"
  return $hit
}

$issueCache = gh issue list --repo $repo --state all --limit 1000 --json title,url | ConvertFrom-Json

function Ensure-Issue {
  param(
    [string]$Title,
    [string]$Body,
    [string]$Milestone,
    [string[]]$Labels
  )

  $script:issueCache = gh issue list --repo $repo --state all --limit 1000 --json title,url | ConvertFrom-Json
  $hit = $script:issueCache | Where-Object { $_.title -eq $Title } | Select-Object -First 1
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

# 1) labels
$labels = @('epic', 'story', 'frontend', 'ui', 'ux', 'security', 'observability', 'testing')
foreach ($l in $labels) {
  Ensure-Label -Name $l -Description "Frontend backlog: $l"
}

# 2) milestones
$milestones = @(
  'EPICA-F1 UI Shell & Navigation Foundation',
  'EPICA-F2 Graph Workspace',
  'EPICA-F3 Execution Plan UX',
  'EPICA-F4 Run Monitoring',
  'EPICA-F5 Diff & Lineage UX',
  'EPICA-F6 Cost & Guardrails UX',
  'EPICA-F7 Plugins UI',
  'EPICA-F8 Security & Admin UX',
  'EPICA-F9 Observability, A11y & Performance'
)

foreach ($m in $milestones) {
  Ensure-Milestone -Title $m | Out-Null
}

# 3) epic tracking issues
$epics = @(
  @{ title='EPICA-F1 UI Shell & Navigation Foundation'; ms='EPICA-F1 UI Shell & Navigation Foundation'; labels=@('epic','frontend','ui','ux'); body='Tracking issue for EPICA-F1. Stories: US-F1.1, US-F1.2' },
  @{ title='EPICA-F2 Graph Workspace'; ms='EPICA-F2 Graph Workspace'; labels=@('epic','frontend','ui'); body='Tracking issue for EPICA-F2. Stories: US-F2.1, US-F2.2, US-F2.3' },
  @{ title='EPICA-F3 Execution Plan UX'; ms='EPICA-F3 Execution Plan UX'; labels=@('epic','frontend','ui','ux'); body='Tracking issue for EPICA-F3. Stories: US-F3.1, US-F3.2' },
  @{ title='EPICA-F4 Run Monitoring'; ms='EPICA-F4 Run Monitoring'; labels=@('epic','frontend','observability'); body='Tracking issue for EPICA-F4. Stories: US-F4.1, US-F4.2' },
  @{ title='EPICA-F5 Diff & Lineage UX'; ms='EPICA-F5 Diff & Lineage UX'; labels=@('epic','frontend','ui'); body='Tracking issue for EPICA-F5. Stories: US-F5.1, US-F5.2' },
  @{ title='EPICA-F6 Cost & Guardrails UX'; ms='EPICA-F6 Cost & Guardrails UX'; labels=@('epic','frontend','ux'); body='Tracking issue for EPICA-F6. Stories: US-F6.1, US-F6.2' },
  @{ title='EPICA-F7 Plugins UI'; ms='EPICA-F7 Plugins UI'; labels=@('epic','frontend','ui'); body='Tracking issue for EPICA-F7. Stories: US-F7.1, US-F7.2' },
  @{ title='EPICA-F8 Security & Admin UX'; ms='EPICA-F8 Security & Admin UX'; labels=@('epic','frontend','security'); body='Tracking issue for EPICA-F8. Stories: US-F8.1, US-F8.2' },
  @{ title='EPICA-F9 Observability, A11y & Performance'; ms='EPICA-F9 Observability, A11y & Performance'; labels=@('epic','frontend','observability','testing'); body='Tracking issue for EPICA-F9. Stories: US-F9.1, US-F9.2, US-F9.3' }
)

foreach ($e in $epics) {
  $body = "$($e.body)`n`nSource: docs/planning/BACKLOG_FRONTEND_DVT_PLUS_GITHUB_EXECUTION.md"
  Ensure-Issue -Title $e.title -Body $body -Milestone $e.ms -Labels $e.labels | Out-Null
}

# 4) stories
$stories = @(
  @{ t='US-F1.1 Define main shell and sidebar navigation'; ms='EPICA-F1 UI Shell & Navigation Foundation'; labels=@('story','frontend','ui','ux') },
  @{ t='US-F1.2 Implement global panels and modal system'; ms='EPICA-F1 UI Shell & Navigation Foundation'; labels=@('story','frontend','ui','ux') },
  @{ t='US-F2.1 Render DAG with base interactions'; ms='EPICA-F2 Graph Workspace'; labels=@('story','frontend','ui') },
  @{ t='US-F2.2 Add ELK/dagre auto-layout with pinned nodes'; ms='EPICA-F2 Graph Workspace'; labels=@('story','frontend','ui') },
  @{ t='US-F2.3 Add graph search and filtering'; ms='EPICA-F2 Graph Workspace'; labels=@('story','frontend','ui','ux') },
  @{ t='US-F3.1 Build read-only plan preview (RUN/SKIP/PARTIAL)'; ms='EPICA-F3 Execution Plan UX'; labels=@('story','frontend','ui') },
  @{ t='US-F3.2 Add explainability per plan decision'; ms='EPICA-F3 Execution Plan UX'; labels=@('story','frontend','ux') },
  @{ t='US-F4.1 Build run timeline with step-level statuses'; ms='EPICA-F4 Run Monitoring'; labels=@('story','frontend','observability') },
  @{ t='US-F4.2 Add resilient logs/progress reconnection UX'; ms='EPICA-F4 Run Monitoring'; labels=@('story','frontend','observability','ux') },
  @{ t='US-F5.1 Build diff view for relevant changes'; ms='EPICA-F5 Diff & Lineage UX'; labels=@('story','frontend','ui') },
  @{ t='US-F5.2 Build upstream/downstream lineage view'; ms='EPICA-F5 Diff & Lineage UX'; labels=@('story','frontend','ui') },
  @{ t='US-F6.1 Surface cost snapshot in frontend'; ms='EPICA-F6 Cost & Guardrails UX'; labels=@('story','frontend','ux') },
  @{ t='US-F6.2 Surface guardrail signals and recommendations'; ms='EPICA-F6 Cost & Guardrails UX'; labels=@('story','frontend','ux') },
  @{ t='US-F7.1 Build plugins catalog with compatibility state'; ms='EPICA-F7 Plugins UI'; labels=@('story','frontend','ui') },
  @{ t='US-F7.2 Isolate plugin failures with safe UI fallbacks'; ms='EPICA-F7 Plugins UI'; labels=@('story','frontend','ui','security') },
  @{ t='US-F8.1 Apply RBAC visual rules (hide/disable/read-only)'; ms='EPICA-F8 Security & Admin UX'; labels=@('story','frontend','security') },
  @{ t='US-F8.2 Build restricted and auditable admin surfaces'; ms='EPICA-F8 Security & Admin UX'; labels=@('story','frontend','security') },
  @{ t='US-F9.1 Add frontend telemetry for key user events'; ms='EPICA-F9 Observability, A11y & Performance'; labels=@('story','frontend','observability') },
  @{ t='US-F9.2 Ensure keyboard and screen-reader accessibility'; ms='EPICA-F9 Observability, A11y & Performance'; labels=@('story','frontend','testing','ux') },
  @{ t='US-F9.3 Enforce performance budget for large graphs'; ms='EPICA-F9 Observability, A11y & Performance'; labels=@('story','frontend','testing') }
)

foreach ($s in $stories) {
  $body = "Frontend DVT+ user story.`n`nSource: docs/planning/BACKLOG_FRONTEND_DVT_PLUS_EPICS_AND_STORIES.md`nExecution: docs/planning/BACKLOG_FRONTEND_DVT_PLUS_GITHUB_EXECUTION.md"
  Ensure-Issue -Title $s.t -Body $body -Milestone $s.ms -Labels $s.labels | Out-Null
}

Write-Output 'DONE: Frontend DVT+ milestones, epic issues and story issues ensured.'
