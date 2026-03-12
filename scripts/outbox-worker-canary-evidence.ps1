[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateNotNullOrEmpty()]
  [string]$EnvironmentName,

  [Parameter(Mandatory = $true)]
  [ValidateNotNullOrEmpty()]
  [string]$WorkerAdminUrl,

  [Parameter(Mandatory = $true)]
  [ValidateNotNullOrEmpty()]
  [string]$Namespace,

  [Parameter(Mandatory = $true)]
  [ValidateNotNullOrEmpty()]
  [string]$Deployment,

  [Parameter(Mandatory = $true)]
  [ValidateRange(1, 2147483647)]
  [int]$ShardCount,

  [string]$PsqlDsn,
  [string]$TriggerCommand,
  [string]$Schema = 'dvt',
  [string]$EvidenceDir = 'docs/evidence',
  [int]$ReadyTimeoutSeconds = 120,
  [int]$DeliveryTimeoutSeconds = 120,
  [int]$PollIntervalSeconds = 5,
  [string]$OwnerProofNote,
  [switch]$RollbackExercised,
  [string]$RollbackSummary
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($PsqlDsn) -eq [string]::IsNullOrWhiteSpace($TriggerCommand)) {
  throw 'Provide exactly one of -PsqlDsn or -TriggerCommand.'
}

function Join-UriPath {
  param(
    [Parameter(Mandatory = $true)]
    [string]$BaseUrl,

    [Parameter(Mandatory = $true)]
    [string]$RelativePath
  )

  $normalizedBase = if ($BaseUrl.EndsWith('/')) { $BaseUrl } else { "$BaseUrl/" }
  return [System.Uri]::new([System.Uri]$normalizedBase, $RelativePath).AbsoluteUri
}

function Invoke-HttpText {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Uri
  )

  try {
    $response = Invoke-WebRequest -Uri $Uri -Method Get -UseBasicParsing -TimeoutSec 15
    return [pscustomobject]@{
      StatusCode = [int]$response.StatusCode
      Content    = [string]$response.Content
    }
  } catch {
    $webResponse = $_.Exception.Response
    if ($null -eq $webResponse) {
      throw
    }

    $stream = $webResponse.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    try {
      return [pscustomobject]@{
        StatusCode = [int]$webResponse.StatusCode
        Content    = $reader.ReadToEnd()
      }
    } finally {
      $reader.Dispose()
      $webResponse.Dispose()
    }
  }
}

function Invoke-HttpJson {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Uri
  )

  $response = Invoke-HttpText -Uri $Uri
  $body = if ([string]::IsNullOrWhiteSpace($response.Content)) {
    $null
  } else {
    $response.Content | ConvertFrom-Json
  }

  return [pscustomobject]@{
    StatusCode = $response.StatusCode
    Body       = $body
    RawContent = $response.Content
  }
}

function Get-MetricValue {
  param(
    [Parameter(Mandatory = $true)]
    [string]$MetricsText,

    [Parameter(Mandatory = $true)]
    [string]$MetricName
  )

  $escapedName = [regex]::Escape($MetricName)
  $pattern = "(?m)^$escapedName(?:\{[^}]*\})?\s+([-+]?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][-+]?\d+)?)\s*$"
  $match = [regex]::Match($MetricsText, $pattern)
  if (-not $match.Success) {
    throw "Metric '$MetricName' not found in /metrics payload."
  }

  return [double]::Parse($match.Groups[1].Value, [System.Globalization.CultureInfo]::InvariantCulture)
}

function Get-MetricExcerpt {
  param(
    [Parameter(Mandatory = $true)]
    [string]$MetricsText
  )

  $lines = $MetricsText -split "`r?`n"
  $patterns = @(
    '^dvt_outbox_runtime_owner\b',
    '^dvt_outbox_runtime_ready\b',
    '^dvt_outbox_runtime_errors_total\b',
    '^dvt_outbox_delivered_records_total\b',
    '^dvt_outbox_runtime_state\{state="[^"]+"\}\s+1(?:\.0+)?$'
  )

  return @(
    foreach ($line in $lines) {
      foreach ($pattern in $patterns) {
        if ($line -match $pattern) {
          $line
          break
        }
      }
    }
  ) -join "`n"
}

function Get-MetricSnapshot {
  param(
    [Parameter(Mandatory = $true)]
    [string]$MetricsUrl
  )

  $response = Invoke-HttpText -Uri $MetricsUrl
  if ($response.StatusCode -ne 200) {
    throw "/metrics returned HTTP $($response.StatusCode)."
  }

  return [pscustomobject]@{
    RawText     = $response.Content
    Delivered   = Get-MetricValue -MetricsText $response.Content -MetricName 'dvt_outbox_delivered_records_total'
    Errors      = Get-MetricValue -MetricsText $response.Content -MetricName 'dvt_outbox_runtime_errors_total'
    Owner       = Get-MetricValue -MetricsText $response.Content -MetricName 'dvt_outbox_runtime_owner'
    Ready       = Get-MetricValue -MetricsText $response.Content -MetricName 'dvt_outbox_runtime_ready'
    ExcerptText = Get-MetricExcerpt -MetricsText $response.Content
  }
}

function Wait-ReadyProbe {
  param(
    [Parameter(Mandatory = $true)]
    [string]$ReadyzUrl,

    [Parameter(Mandatory = $true)]
    [int]$TimeoutSeconds,

    [Parameter(Mandatory = $true)]
    [int]$PollIntervalSeconds
  )

  $deadline = (Get-Date).ToUniversalTime().AddSeconds($TimeoutSeconds)
  $lastProbe = $null

  while ((Get-Date).ToUniversalTime() -lt $deadline) {
    $probe = Invoke-HttpJson -Uri $ReadyzUrl
    $lastProbe = $probe
    if (
      $probe.StatusCode -eq 200 -and
      $null -ne $probe.Body -and
      $probe.Body.ready -eq $true -and
      $probe.Body.owner -eq $true
    ) {
      return $probe
    }
    Start-Sleep -Seconds $PollIntervalSeconds
  }

  $bodyJson = if ($null -eq $lastProbe -or $null -eq $lastProbe.Body) {
    '<no body>'
  } else {
    $lastProbe.Body | ConvertTo-Json -Depth 8 -Compress
  }
  throw "Worker never became ready+owner at /readyz within ${TimeoutSeconds}s. Last status=$($lastProbe.StatusCode) body=$bodyJson"
}

function Wait-DeliveryEvidence {
  param(
    [Parameter(Mandatory = $true)]
    [string]$MetricsUrl,

    [Parameter(Mandatory = $true)]
    [double]$BaselineDelivered,

    [Parameter(Mandatory = $true)]
    [double]$BaselineErrors,

    [Parameter(Mandatory = $true)]
    [int]$TimeoutSeconds,

    [Parameter(Mandatory = $true)]
    [int]$PollIntervalSeconds
  )

  $deadline = (Get-Date).ToUniversalTime().AddSeconds($TimeoutSeconds)
  $lastSnapshot = $null

  while ((Get-Date).ToUniversalTime() -lt $deadline) {
    $snapshot = Get-MetricSnapshot -MetricsUrl $MetricsUrl
    $lastSnapshot = $snapshot

    if ($snapshot.Errors -gt $BaselineErrors) {
      throw "dvt_outbox_runtime_errors_total increased from $BaselineErrors to $($snapshot.Errors)."
    }

    if ($snapshot.Delivered -gt $BaselineDelivered) {
      return $snapshot
    }

    Start-Sleep -Seconds $PollIntervalSeconds
  }

  throw "dvt_outbox_delivered_records_total did not increase within ${TimeoutSeconds}s. Last observed value=$($lastSnapshot.Delivered)."
}

function Get-DeploymentSnapshot {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Namespace,

    [Parameter(Mandatory = $true)]
    [string]$Deployment
  )

  $kubectl = Get-Command kubectl -ErrorAction SilentlyContinue
  if ($null -eq $kubectl) {
    return [pscustomobject]@{
      Available = $false
      Note      = 'kubectl not found in PATH'
    }
  }

  $deploymentJson = & $kubectl.Source get deployment $Deployment -n $Namespace -o json 2>$null
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($deploymentJson)) {
    return [pscustomobject]@{
      Available = $false
      Note      = "kubectl could not read deployment $Namespace/$Deployment"
    }
  }

  $deploymentObject = $deploymentJson | ConvertFrom-Json
  $selectorLabels = @()
  foreach ($property in $deploymentObject.spec.selector.matchLabels.PSObject.Properties) {
    $selectorLabels += "$($property.Name)=$($property.Value)"
  }
  $selector = $selectorLabels -join ','

  $pods = @()
  if (-not [string]::IsNullOrWhiteSpace($selector)) {
    $podsJson = & $kubectl.Source get pods -n $Namespace -l $selector -o json 2>$null
    if ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace($podsJson)) {
      $podsObject = $podsJson | ConvertFrom-Json
      $pods = @(
        foreach ($item in $podsObject.items) {
          [pscustomobject]@{
            Name  = [string]$item.metadata.name
            Phase = [string]$item.status.phase
          }
        }
      )
    }
  }

  $ownershipModeValues = @()
  foreach ($container in $deploymentObject.spec.template.spec.containers) {
    foreach ($envVar in @($container.env)) {
      if ($envVar.name -ne 'DVT_OUTBOX_OWNERSHIP_MODE') {
        continue
      }
      if ($null -ne $envVar.value) {
        $ownershipModeValues += [string]$envVar.value
      } else {
        $ownershipModeValues += '<valueFrom>'
      }
    }
  }

  return [pscustomobject]@{
    Available         = $true
    Namespace         = [string]$deploymentObject.metadata.namespace
    Deployment        = [string]$deploymentObject.metadata.name
    Replicas          = [int](if ($null -ne $deploymentObject.spec.replicas) { $deploymentObject.spec.replicas } else { 0 })
    ReadyReplicas     = [int](if ($null -ne $deploymentObject.status.readyReplicas) { $deploymentObject.status.readyReplicas } else { 0 })
    AvailableReplicas = [int](if ($null -ne $deploymentObject.status.availableReplicas) { $deploymentObject.status.availableReplicas } else { 0 })
    Selector          = $selector
    Pods              = $pods
    OwnershipModes    = $ownershipModeValues
  }
}

function New-SqlTriggerPayload {
  param(
    [Parameter(Mandatory = $true)]
    [string]$EnvironmentName
  )

  $timestamp = (Get-Date).ToUniversalTime()
  $timestampIso = $timestamp.ToString('yyyy-MM-ddTHH:mm:ss.fffZ')
  $timestampToken = $timestamp.ToString('yyyyMMddHHmmss')
  $runId = "g5-canary-$($EnvironmentName.ToLowerInvariant())-$timestampToken"
  $eventId = "evt-$runId-1"
  $idempotencyKey = "key-$runId-1"

  $payload = [ordered]@{
    eventId          = $eventId
    eventType        = 'RunQueued'
    runId            = $runId
    tenantId         = 'tenant-canary'
    projectId        = 'project-canary'
    environmentId    = $EnvironmentName
    planId           = 'plan-canary'
    planVersion      = '1.0.0'
    logicalAttemptId = 1
    engineAttemptId  = 1
    emittedAt        = $timestampIso
    persistedAt      = $timestampIso
    idempotencyKey   = $idempotencyKey
    runSeq           = 1
  }

  return [pscustomobject]@{
    RunId          = $runId
    EventId        = $eventId
    RecordId       = "$runId:1"
    IdempotencyKey = $idempotencyKey
    CreatedAt      = $timestampIso
    PayloadJson    = $payload | ConvertTo-Json -Depth 8 -Compress
  }
}

function Invoke-PsqlTrigger {
  param(
    [Parameter(Mandatory = $true)]
    [string]$PsqlDsn,

    [Parameter(Mandatory = $true)]
    [string]$Schema,

    [Parameter(Mandatory = $true)]
    [string]$EnvironmentName,

    [Parameter(Mandatory = $true)]
    [int]$ShardCount
  )

  $psql = Get-Command psql -ErrorAction SilentlyContinue
  if ($null -eq $psql) {
    throw 'psql not found in PATH.'
  }

  $payload = New-SqlTriggerPayload -EnvironmentName $EnvironmentName
  $sql = @"
WITH inserted AS (
  INSERT INTO :"schema".outbox (
    id,
    run_id,
    shard_id,
    run_seq,
    created_at,
    idempotency_key,
    payload,
    attempts,
    last_error,
    delivered_at,
    next_attempt_at,
    claimed_at
  )
  VALUES (
    :'record_id',
    :'run_id',
    ((mod((('x' || left(md5(:'run_id'), 16))::bit(64)::bigint), :'shard_count'::bigint) + :'shard_count'::bigint) % :'shard_count'::bigint)::int,
    1,
    :'created_at'::timestamptz,
    :'idempotency_key',
    :'payload'::jsonb,
    0,
    NULL,
    NULL,
    NULL,
    NULL
  )
  ON CONFLICT (id) DO NOTHING
  RETURNING id, run_id, shard_id
)
SELECT row_to_json(inserted) FROM inserted;
"@

  $output = & $psql.Source `
    $PsqlDsn `
    -t `
    -A `
    -v ON_ERROR_STOP=1 `
    -v "schema=$Schema" `
    -v "record_id=$($payload.RecordId)" `
    -v "run_id=$($payload.RunId)" `
    -v "created_at=$($payload.CreatedAt)" `
    -v "idempotency_key=$($payload.IdempotencyKey)" `
    -v "payload=$($payload.PayloadJson)" `
    -v "shard_count=$ShardCount" `
    -c $sql 2>&1

  if ($LASTEXITCODE -ne 0) {
    throw "psql trigger failed: $($output -join [Environment]::NewLine)"
  }

  return [pscustomobject]@{
    Mode       = 'psql'
    RunId      = $payload.RunId
    EventId    = $payload.EventId
    OutputText = ($output -join [Environment]::NewLine).Trim()
  }
}

function Invoke-CommandTrigger {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Command
  )

  $output = Invoke-Expression $Command 2>&1 | Out-String
  return [pscustomobject]@{
    Mode       = 'command'
    RunId      = $null
    EventId    = $null
    OutputText = $output.Trim()
  }
}

function ConvertTo-CompactJson {
  param(
    [Parameter(Mandatory = $false)]
    $InputObject
  )

  if ($null -eq $InputObject) {
    return 'null'
  }
  return $InputObject | ConvertTo-Json -Depth 10 -Compress
}

function New-MarkdownList {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Items
  )

  if ($Items.Count -eq 0) {
    return '- none'
  }

  return ($Items | ForEach-Object { "- $_" }) -join "`n"
}

function Write-EvidenceDocument {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,

    [Parameter(Mandatory = $true)]
    [hashtable]$Context
  )

  $dateStamp = $Context.StartedAt.ToString('yyyy-MM-dd')
  $titleDate = $Context.StartedAt.ToString('yyyyMMdd')
  $deploymentInfo = $Context.DeploymentInfo

  $deploymentLines = @(
    "Environment: ``$($Context.EnvironmentName)``"
    "Observation window: ``$($Context.StartedAt.ToString('u').TrimEnd('Z'))Z`` -> ``$($Context.EndedAt.ToString('u').TrimEnd('Z'))Z``"
    "Worker admin URL: ``$($Context.WorkerAdminUrl)``"
    "Namespace / deployment: ``$($Context.Namespace)/$($Context.Deployment)``"
    "Shard count: ``$($Context.ShardCount)``"
    "Trigger mode: ``$($Context.TriggerMode)``"
  )

  if ($deploymentInfo.Available) {
    $podSummary = if ($deploymentInfo.Pods.Count -eq 0) {
      'pods not resolved from deployment selector'
    } else {
      ($deploymentInfo.Pods | ForEach-Object { "$($_.Name) [$($_.Phase)]" }) -join ', '
    }
    $ownershipModes = if ($deploymentInfo.OwnershipModes.Count -eq 0) {
      'not present as a literal env var in deployment spec'
    } else {
      $deploymentInfo.OwnershipModes -join ', '
    }

    $deploymentLines += @(
      "Deployment replicas: spec=$($deploymentInfo.Replicas), ready=$($deploymentInfo.ReadyReplicas), available=$($deploymentInfo.AvailableReplicas)"
      "Deployment ownership env values: $ownershipModes"
      "Resolved pods: $podSummary"
    )
  } else {
    $deploymentLines += "Deployment snapshot unavailable: $($deploymentInfo.Note)"
  }

  $ownerEvidence = if ([string]::IsNullOrWhiteSpace($Context.OwnerProofNote)) {
    'No manual owner-proof note was supplied. This document records the worker deployment snapshot and readyz owner flag only; a human still needs to confirm that no second outbox publisher path was active during the window.'
  } else {
    $Context.OwnerProofNote
  }

  $rollbackText = if ($Context.RollbackExercised) {
    if ([string]::IsNullOrWhiteSpace($Context.RollbackSummary)) {
      'Rollback was exercised, but no rollback summary was provided.'
    } else {
      $Context.RollbackSummary
    }
  } else {
    'Rollback was not exercised during this canary window.'
  }

  $resultBlock = if ($Context.Success) {
@"
## Closure Relevance

This observation satisfies the external canary evidence lane for `#413` at the
standalone worker boundary:

- `/readyz` reached `200` with `owner=true`
- `dvt_outbox_delivered_records_total` increased after the trigger
- `dvt_outbox_runtime_errors_total` stayed flat during the observation window
"@
  } else {
@"
## Failure Summary

The automation did not complete successfully.

- Failure: ``$($Context.ErrorMessage)``
- The evidence below is still useful for debugging and postmortem follow-up.
"@
  }

  $document = @"
---
title: ED-$titleDate - G5 canary evidence ($($Context.EnvironmentName))
status: Draft
date: $dateStamp
owners: Delivery / SRE
arc_level: ARC-2
breaking: false
code_refs:
  - scripts/outbox-worker-canary-evidence.ps1
  - docs/runbooks/outbox-worker-g5.md
  - apps/outbox-worker/src/ops/OperationalServer.ts
evidence:
  code:
    - scripts/outbox-worker-canary-evidence.ps1
---

# Evidence Doc: G5 canary evidence for $($Context.EnvironmentName)

## Scope

This document captures one external canary observation window for the standalone
outbox worker and records the probes, metrics, trigger path, and rollback note
needed by `#413`.

## Canary Window

$($deploymentLines | ForEach-Object { "- $_" } | Out-String)
## Readiness Observation

- Readyz URL: ``$($Context.ReadyzUrl)``
- Final readyz status: ``$($Context.ReadyProbe.StatusCode)``
- Ready flag: ``$($Context.ReadyProbe.Body.ready)``
- Owner flag: ``$($Context.ReadyProbe.Body.owner)``
- Runtime state: ``$($Context.ReadyProbe.Body.state)``

```json
$($Context.ReadyProbe.RawContent)
```

## Metrics Delta

- ``dvt_outbox_delivered_records_total``: ``$($Context.BaselineMetrics.Delivered)`` -> ``$($Context.FinalMetrics.Delivered)``
- ``dvt_outbox_runtime_errors_total``: ``$($Context.BaselineMetrics.Errors)`` -> ``$($Context.FinalMetrics.Errors)``
- ``dvt_outbox_runtime_owner`` baseline/final: ``$($Context.BaselineMetrics.Owner)`` -> ``$($Context.FinalMetrics.Owner)``
- ``dvt_outbox_runtime_ready`` baseline/final: ``$($Context.BaselineMetrics.Ready)`` -> ``$($Context.FinalMetrics.Ready)``

Baseline metrics excerpt:

```text
$($Context.BaselineMetrics.ExcerptText)
```

Final metrics excerpt:

```text
$($Context.FinalMetrics.ExcerptText)
```

## Trigger Result

- Trigger summary: ``$($Context.TriggerMode)``
- Run ID: ``$($Context.TriggerResult.RunId)``
- Event ID: ``$($Context.TriggerResult.EventId)``

```text
$($Context.TriggerResult.OutputText)
```

## Owner Exclusivity Note

$ownerEvidence

## Rollback Note

$rollbackText

$resultBlock
"@

  $parent = Split-Path -Parent $Path
  if (-not (Test-Path -LiteralPath $parent)) {
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
  }

  [System.IO.File]::WriteAllText($Path, $document.Trim() + [Environment]::NewLine, [System.Text.UTF8Encoding]::new($false))
}

function Get-EvidenceFileName {
  param(
    [Parameter(Mandatory = $true)]
    [datetime]$Date,

    [Parameter(Mandatory = $true)]
    [string]$EnvironmentName
  )

  $slug = ($EnvironmentName.ToLowerInvariant() -replace '[^a-z0-9]+', '-').Trim('-')
  if ([string]::IsNullOrWhiteSpace($slug)) {
    $slug = 'unknown-env'
  }

  return "ED-$($Date.ToString('yyyyMMdd'))-g5-canary-$slug.md"
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$readyzUrl = Join-UriPath -BaseUrl $WorkerAdminUrl -RelativePath 'readyz'
$metricsUrl = Join-UriPath -BaseUrl $WorkerAdminUrl -RelativePath 'metrics'
$startedAt = (Get-Date).ToUniversalTime()
$evidenceDirectoryPath = Join-Path $repoRoot $EvidenceDir
$evidenceFilePath = Join-Path $evidenceDirectoryPath (Get-EvidenceFileName -Date $startedAt -EnvironmentName $EnvironmentName)

$context = @{
  EnvironmentName = $EnvironmentName
  WorkerAdminUrl  = $WorkerAdminUrl
  Namespace       = $Namespace
  Deployment      = $Deployment
  ShardCount      = $ShardCount
  ReadyzUrl       = $readyzUrl
  DeploymentInfo  = Get-DeploymentSnapshot -Namespace $Namespace -Deployment $Deployment
  StartedAt       = $startedAt
  EndedAt         = $startedAt
  Success         = $false
  ErrorMessage    = $null
  OwnerProofNote  = $OwnerProofNote
  RollbackExercised = $RollbackExercised.IsPresent
  RollbackSummary = $RollbackSummary
}

try {
  Write-Host "Waiting for readyz at $readyzUrl ..."
  $readyProbe = Wait-ReadyProbe -ReadyzUrl $readyzUrl -TimeoutSeconds $ReadyTimeoutSeconds -PollIntervalSeconds $PollIntervalSeconds
  $context.ReadyProbe = $readyProbe

  Write-Host 'Capturing baseline metrics ...'
  $baselineMetrics = Get-MetricSnapshot -MetricsUrl $metricsUrl
  $context.BaselineMetrics = $baselineMetrics

  if (-not [string]::IsNullOrWhiteSpace($PsqlDsn)) {
    Write-Host 'Triggering canary event via psql outbox insert ...'
    $triggerResult = Invoke-PsqlTrigger -PsqlDsn $PsqlDsn -Schema $Schema -EnvironmentName $EnvironmentName -ShardCount $ShardCount
  } else {
    Write-Host 'Triggering canary event via trigger command ...'
    $triggerResult = Invoke-CommandTrigger -Command $TriggerCommand
  }

  $context.TriggerMode = $triggerResult.Mode
  $context.TriggerResult = $triggerResult

  Write-Host 'Waiting for delivery metrics to increase ...'
  $finalMetrics = Wait-DeliveryEvidence `
    -MetricsUrl $metricsUrl `
    -BaselineDelivered $baselineMetrics.Delivered `
    -BaselineErrors $baselineMetrics.Errors `
    -TimeoutSeconds $DeliveryTimeoutSeconds `
    -PollIntervalSeconds $PollIntervalSeconds
  $context.FinalMetrics = $finalMetrics

  $context.Success = $true
} catch {
  $context.ErrorMessage = $_.Exception.Message

  if (-not $context.ContainsKey('ReadyProbe')) {
    $context.ReadyProbe = Invoke-HttpJson -Uri $readyzUrl
  }

  if (-not $context.ContainsKey('BaselineMetrics')) {
    try {
      $context.BaselineMetrics = Get-MetricSnapshot -MetricsUrl $metricsUrl
    } catch {
      $context.BaselineMetrics = [pscustomobject]@{
        Delivered   = [double]::NaN
        Errors      = [double]::NaN
        Owner       = [double]::NaN
        Ready       = [double]::NaN
        ExcerptText = '<metrics unavailable>'
      }
    }
  }

  if (-not $context.ContainsKey('TriggerMode')) {
    $context.TriggerMode = if (-not [string]::IsNullOrWhiteSpace($PsqlDsn)) { 'psql' } else { 'command' }
  }

  if (-not $context.ContainsKey('TriggerResult')) {
    $context.TriggerResult = [pscustomobject]@{
      RunId      = $null
      EventId    = $null
      OutputText = '<trigger not completed>'
    }
  }

  if (-not $context.ContainsKey('FinalMetrics')) {
    $context.FinalMetrics = $context.BaselineMetrics
  }
} finally {
  $context.EndedAt = (Get-Date).ToUniversalTime()
  Write-EvidenceDocument -Path $evidenceFilePath -Context $context
}

Write-Host "Evidence document written to $evidenceFilePath"

if (-not $context.Success) {
  throw $context.ErrorMessage
}
