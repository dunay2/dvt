param(
  [string]$BaseBranch = 'main',
  [string[]]$TargetBranches = @(),
  [switch]$SkipFetch,
  [switch]$RunSliceChecks,
  [switch]$RunChecks,
  [string]$ChecksCommand = '',
  [switch]$RunLaneCPreflight,
  [switch]$PrintCiLogFirstTriage,
  [string]$PreflightEvidenceFile = '',
  [string]$PullRequest = '',
  [switch]$DeleteLocalSuperseded,
  [switch]$DeleteRemoteSuperseded,
  [switch]$Yes
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Invoke-Git {
  param([Parameter(Mandatory = $true)][string]$Args)
  $output = & cmd /c "git $Args" 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw "git $Args failed:`n$output"
  }
  return $output
}

function Test-BranchExistsLocal {
  param([Parameter(Mandatory = $true)][string]$Branch)
  & git show-ref --verify --quiet "refs/heads/$Branch"
  return ($LASTEXITCODE -eq 0)
}

function Test-BranchExistsRemote {
  param([Parameter(Mandatory = $true)][string]$Branch)
  & git show-ref --verify --quiet "refs/remotes/origin/$Branch"
  return ($LASTEXITCODE -eq 0)
}

function Get-BranchDelta {
  param(
    [Parameter(Mandatory = $true)][string]$Base,
    [Parameter(Mandatory = $true)][string]$Branch
  )

  $ahead = (& git rev-list --count "$Base..$Branch" 2>$null)
  $behind = (& git rev-list --count "$Branch..$Base" 2>$null)

  if ($LASTEXITCODE -ne 0) {
    throw "Unable to compute delta for branch '$Branch' against '$Base'."
  }

  [pscustomobject]@{
    Ahead  = [int]$ahead
    Behind = [int]$behind
  }
}

function Get-SupersededSignal {
  param(
    [Parameter(Mandatory = $true)][string]$Base,
    [Parameter(Mandatory = $true)][string]$Branch
  )

  $cherry = & git cherry $Base $Branch 2>$null
  if ($LASTEXITCODE -ne 0) {
    throw "Unable to compute cherry signal for '$Branch'."
  }

  $plusCount = @($cherry | Where-Object { $_ -match '^\+' }).Count
  $minusCount = @($cherry | Where-Object { $_ -match '^-' }).Count

  [pscustomobject]@{
    PlusCount = [int]$plusCount
    MinusCount = [int]$minusCount
    IsLikelySuperseded = ($plusCount -eq 0 -and $minusCount -gt 0)
  }
}

function Get-ChangedFilesVsBase {
  param(
    [Parameter(Mandatory = $true)][string]$Base,
    [Parameter(Mandatory = $true)][string]$Branch
  )

  $diff = & git diff --name-status "$Base...$Branch" 2>$null
  if ($LASTEXITCODE -ne 0) {
    throw "Unable to compute changed files for '$Branch'."
  }
  return $diff
}

function Get-BranchCandidates {
  param([Parameter(Mandatory = $true)][string]$Base)

  $raw = & git for-each-ref --format='%(refname:short)' refs/heads
  if ($LASTEXITCODE -ne 0) {
    throw 'Unable to list local branches.'
  }

  return $raw |
    Where-Object { $_ -and $_ -ne $Base } |
    Sort-Object -Unique
}

function Remove-LocalBranchSafe {
  param([Parameter(Mandatory = $true)][string]$Branch)
  Write-Host "Deleting local branch: $Branch"
  Invoke-Git "branch -D $Branch" | Out-Null
}

function Remove-RemoteBranchSafe {
  param([Parameter(Mandatory = $true)][string]$Branch)
  Write-Host "Deleting remote branch: origin/$Branch"
  Invoke-Git "push origin --delete $Branch" | Out-Null
}

function Confirm-OrStop {
  param([Parameter(Mandatory = $true)][string]$Message)

  if ($Yes) {
    return
  }

  $answer = Read-Host "$Message (type 'yes' to continue)"
  if ($answer -ne 'yes') {
    throw 'Operation cancelled by user.'
  }
}

function Append-JsonLine {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][object]$Payload
  )

  $resolvedPath = if ([System.IO.Path]::IsPathRooted($Path)) {
    $Path
  } else {
    Join-Path (Get-Location) $Path
  }

  $parent = Split-Path -Parent $resolvedPath
  if ($parent) {
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
  }

  Add-Content -LiteralPath $resolvedPath -Value ($Payload | ConvertTo-Json -Compress)
}

function Write-LaneCCiLogFirstTriage {
  param(
    [Parameter(Mandatory = $true)][string]$Branch,
    [string]$PrNumber
  )

  Write-Host ''
  Write-Host '=== Lane C CI log-first triage ==='
  if (-not [string]::IsNullOrWhiteSpace($PrNumber)) {
    Write-Host "1) Inspect PR checks first:"
    Write-Host "   gh pr checks $PrNumber"
    Write-Host ''
  }
  Write-Host '1) List latest runs for the branch and identify failures:'
  Write-Host "   gh run list --branch $Branch --limit 5 --json databaseId,status,conclusion,workflowName,url"
  Write-Host '2) Pull failed-step logs before rerunning anything:'
  Write-Host '   gh run view <run-id> --log-failed'
  Write-Host '3) Patch root cause; rerun failed jobs only:'
  Write-Host '   gh run rerun <run-id> --failed'
}

Write-Host '=== Repo Hygiene (diagnostic-first) ==='
Write-Host "Base branch: $BaseBranch"

if (-not (Test-BranchExistsLocal -Branch $BaseBranch)) {
  throw "Base branch '$BaseBranch' does not exist locally."
}

if (-not $SkipFetch) {
  Write-Host 'Fetching remote updates (git fetch -p)...'
  Invoke-Git 'fetch -p' | Out-Null
}

$currentBranch = (Invoke-Git 'branch --show-current').Trim()
Write-Host "Current branch: $currentBranch"

$targets = if ($TargetBranches.Count -gt 0) {
  @($TargetBranches)
} else {
  @(Get-BranchCandidates -Base $BaseBranch)
}

if (@($targets).Count -eq 0) {
  Write-Host 'No target branches to analyze.'
  exit 0
}

$report = @()

foreach ($branch in $targets) {
  if (-not (Test-BranchExistsLocal -Branch $branch)) {
    Write-Warning "Skipping missing local branch: $branch"
    continue
  }

  $delta = Get-BranchDelta -Base $BaseBranch -Branch $branch
  $superseded = Get-SupersededSignal -Base $BaseBranch -Branch $branch
  $changed = @(Get-ChangedFilesVsBase -Base $BaseBranch -Branch $branch)

  $report += [pscustomobject]@{
    Branch = $branch
    Ahead = $delta.Ahead
    Behind = $delta.Behind
    CherryPlus = $superseded.PlusCount
    CherryMinus = $superseded.MinusCount
    LikelySuperseded = $superseded.IsLikelySuperseded
    ChangedFiles = @($changed).Count
  }

  Write-Host ''
  Write-Host "[$branch]"
  Write-Host "  ahead=$($delta.Ahead) behind=$($delta.Behind) cherry(+/ -)=$($superseded.PlusCount)/$($superseded.MinusCount)"
  Write-Host "  likely_superseded=$($superseded.IsLikelySuperseded) changed_files=$(@($changed).Count)"

  if (@($changed).Count -gt 0) {
    $preview = $changed | Select-Object -First 12
    foreach ($line in $preview) {
      Write-Host "    $line"
    }
    if (@($changed).Count -gt 12) {
      Write-Host '    ...'
    }
  }
}

Write-Host ''
Write-Host '=== Summary ==='
$report | Sort-Object Branch | Format-Table -AutoSize

$supersededBranches = @($report | Where-Object { $_.LikelySuperseded })

if ($DeleteLocalSuperseded -and $supersededBranches.Count -gt 0) {
  Confirm-OrStop -Message "Delete $($supersededBranches.Count) superseded local branches"
  foreach ($item in $supersededBranches) {
    if ($item.Branch -eq $currentBranch) {
      Write-Warning "Skipping current branch '$($item.Branch)'"
      continue
    }
    Remove-LocalBranchSafe -Branch $item.Branch
  }
}

if ($DeleteRemoteSuperseded -and $supersededBranches.Count -gt 0) {
  Confirm-OrStop -Message "Delete remote origin/* branches for $($supersededBranches.Count) superseded branches"
  foreach ($item in $supersededBranches) {
    if (Test-BranchExistsRemote -Branch $item.Branch) {
      Remove-RemoteBranchSafe -Branch $item.Branch
    } else {
      Write-Host "Remote branch origin/$($item.Branch) not found, skipping"
    }
  }
}

if ($RunSliceChecks) {
  Write-Host ''
  Write-Host 'Running default runtime command slice checks...'
  $testCmd = 'pnpm --filter dvt-api test -- test/entrypoints/http/runCommandRouteExecutor.test.ts test/entrypoints/http/runCommandFieldParsers.test.ts test/entrypoints/http/signalRunRouteParser.test.ts test/entrypoints/http/cancelRunRouteParser.test.ts test/entrypoints/http/signalRunRoute.test.ts test/entrypoints/http/cancelRunRoute.test.ts'
  Write-Host "  $testCmd"
  & pnpm --filter dvt-api test -- test/entrypoints/http/runCommandRouteExecutor.test.ts test/entrypoints/http/runCommandFieldParsers.test.ts test/entrypoints/http/signalRunRouteParser.test.ts test/entrypoints/http/cancelRunRouteParser.test.ts test/entrypoints/http/signalRunRoute.test.ts test/entrypoints/http/cancelRunRoute.test.ts
  if ($LASTEXITCODE -ne 0) {
    throw 'Slice tests failed.'
  }
}

if ($RunChecks) {
  if ([string]::IsNullOrWhiteSpace($ChecksCommand)) {
    throw 'RunChecks requires -ChecksCommand "<command>".'
  }

  Write-Host ''
  Write-Host "Running custom checks command: $ChecksCommand"
  & cmd /c $ChecksCommand
  if ($LASTEXITCODE -ne 0) {
    throw 'Custom checks command failed.'
  }
}

if ($RunLaneCPreflight) {
  Write-Host ''
  Write-Host '=== Lane C preflight chain ==='
  $preflightStart = Get-Date
  $preflightRecord = [ordered]@{
    timestampUtc = (Get-Date).ToUniversalTime().ToString('o')
    baseBranch = $BaseBranch
    branch = $currentBranch
    targetBranchesAnalyzed = @($report).Count
    supersededCandidates = @($supersededBranches).Count
    verifyPrepush = 'failed'
    durationSeconds = 0
  }

  try {
    Write-Host 'Running pnpm verify:prepush'
    & pnpm verify:prepush
    if ($LASTEXITCODE -ne 0) {
      throw 'pnpm verify:prepush failed.'
    }
    $preflightRecord.verifyPrepush = 'passed'
  } finally {
    $preflightRecord.durationSeconds = [Math]::Round(((Get-Date) - $preflightStart).TotalSeconds, 1)
    Write-Host "Lane C preflight summary: $($preflightRecord | ConvertTo-Json -Compress)"
    if (-not [string]::IsNullOrWhiteSpace($PreflightEvidenceFile)) {
      Append-JsonLine -Path $PreflightEvidenceFile -Payload $preflightRecord
      Write-Host "Preflight evidence appended to: $PreflightEvidenceFile"
    }
  }
}

if ($PrintCiLogFirstTriage) {
  Write-LaneCCiLogFirstTriage -Branch $currentBranch -PrNumber $PullRequest
}

Write-Host ''
Write-Host 'Done.'
