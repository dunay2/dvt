param(
  [string]$BaseBranch = 'main',
  [string[]]$TargetBranches = @(),
  [switch]$SkipFetch,
  [switch]$Preflight,
  [string]$SliceCommand = '',
  [switch]$PrCheckSummary,
  [switch]$LogFirstTriage,
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

function Invoke-NativeCommandCapture {
  param([Parameter(Mandatory = $true)][scriptblock]$Command)

  $previousErrorPreference = $ErrorActionPreference
  try {
    $ErrorActionPreference = 'Continue'
    $output = & $Command 2>&1 | ForEach-Object {
      if ($_ -is [System.Management.Automation.ErrorRecord]) {
        $_.ToString()
      } else {
        [string]$_
      }
    }

    return [pscustomobject]@{
      ExitCode = $LASTEXITCODE
      Output = @($output)
    }
  } finally {
    $ErrorActionPreference = $previousErrorPreference
  }
}

function Invoke-Git {
  param([Parameter(Mandatory = $true)][string]$GitArgs)

  $result = Invoke-NativeCommandCapture -Command { cmd /c "git $GitArgs" }
  if ($result.ExitCode -ne 0) {
    throw "git $GitArgs failed:`n$($result.Output -join "`n")"
  }
  return $result.Output
}

function Invoke-ShellCommandStrict {
  param(
    [Parameter(Mandatory = $true)][string]$Command,
    [Parameter(Mandatory = $true)][string]$FailureMessage
  )

  $previousErrorPreference = $ErrorActionPreference
  try {
    $ErrorActionPreference = 'Continue'
    $output = & cmd /c $Command 2>&1 | ForEach-Object {
      if ($_ -is [System.Management.Automation.ErrorRecord]) {
        $_.ToString()
      } else {
        [string]$_
      }
    }

    $exitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousErrorPreference
  }

  foreach ($line in @($output)) {
    if (-not [string]::IsNullOrWhiteSpace($line)) {
      Write-Host $line
    }
  }

  if ($exitCode -ne 0) {
    throw "$FailureMessage`n$(@($output) -join "`n")"
  }
}

function Invoke-JsonHelper {
  param([Parameter(Mandatory = $true)][string[]]$NodeArgs)

  $result = Invoke-NativeCommandCapture -Command { & node @NodeArgs }
  if ($result.ExitCode -ne 0) {
    throw "Node helper failed:`n$($result.Output -join "`n")"
  }

  return ($result.Output -join "`n") | ConvertFrom-Json
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

function Write-BranchDiagnostics {
  param(
    [Parameter(Mandatory = $true)][string]$Base,
    [Parameter(Mandatory = $true)][string]$Branch,
    [ref]$Accumulator
  )

  if (-not (Test-BranchExistsLocal -Branch $Branch)) {
    Write-Warning "Skipping missing local branch: $Branch"
    return
  }

  $delta = Get-BranchDelta -Base $Base -Branch $Branch
  $superseded = Get-SupersededSignal -Base $Base -Branch $Branch
  $changed = @(Get-ChangedFilesVsBase -Base $Base -Branch $Branch)

  $Accumulator.Value += [pscustomobject]@{
    Branch = $Branch
    Ahead = $delta.Ahead
    Behind = $delta.Behind
    CherryPlus = $superseded.PlusCount
    CherryMinus = $superseded.MinusCount
    LikelySuperseded = $superseded.IsLikelySuperseded
    ChangedFiles = @($changed).Count
  }

  Write-Host ''
  Write-Host "[$Branch]"
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

function Write-PrCheckSummary {
  param([string]$PrRef = '')

  Write-Host ''
  Write-Host '=== PR Check Summary ==='

  $args = @('tools/ci/pr-check-triage.mjs', 'summary')
  if (-not [string]::IsNullOrWhiteSpace($PrRef)) {
    $args += @('--pr', $PrRef)
  }

  $summary = Invoke-JsonHelper -NodeArgs $args

  if ($summary.status -eq 'no_pr') {
    Write-Host $summary.message
    return
  }

  Write-Host "PR #$($summary.pr.number) [$($summary.pr.headRefName)]"
  Write-Host "  $($summary.pr.url)"
  Write-Host "  failed=$($summary.counts.failed) pending=$($summary.counts.pending) successful=$($summary.counts.successful) external=$($summary.counts.external) skipped=$($summary.counts.skipped)"

  foreach ($failed in @($summary.failed)) {
    Write-Host "  FAIL  $($failed.name)"
    if ($failed.detailsUrl) {
      Write-Host "        $($failed.detailsUrl)"
    }
  }

  foreach ($pending in @($summary.pending)) {
    Write-Host "  WAIT  $($pending.name)"
    if ($pending.detailsUrl) {
      Write-Host "        $($pending.detailsUrl)"
    }
  }

  foreach ($external in @($summary.external)) {
    Write-Host "  EXTERNAL  $($external.name)"
    if ($external.detailsUrl) {
      Write-Host "            $($external.detailsUrl)"
    }
  }
}

function Write-FirstRedTriage {
  param([string]$PrRef = '')

  Write-Host ''
  Write-Host '=== CI Log-First Triage ==='

  $args = @('tools/ci/pr-check-triage.mjs', 'first-failure')
  if (-not [string]::IsNullOrWhiteSpace($PrRef)) {
    $args += @('--pr', $PrRef)
  }

  $triage = Invoke-JsonHelper -NodeArgs $args

  if ($triage.status -eq 'no_pr') {
    Write-Host $triage.message
    return
  }

  if ($triage.status -eq 'no_failing_actions_check') {
    Write-Host "PR #$($triage.pr.number) has no failing GitHub Actions checks."
    return
  }

  if ($triage.status -eq 'unloggable_failure') {
    Write-Host "Found a failing check but its details URL is not a GitHub Actions job:"
    Write-Host "  $($triage.check.name)"
    if ($triage.check.detailsUrl) {
      Write-Host "  $($triage.check.detailsUrl)"
    }
    return
  }

  Write-Host "PR #$($triage.pr.number) first failing job:"
  Write-Host "  $($triage.check.name)"
  if ($triage.check.workflowName) {
    Write-Host "  workflow=$($triage.check.workflowName)"
  }
  if ($triage.check.detailsUrl) {
    Write-Host "  $($triage.check.detailsUrl)"
  }
  Write-Host ''
  Write-Host 'Failure snippet:'
  if ($triage.snippet) {
    Write-Host $triage.snippet
  } else {
    Write-Host '  No failed-step snippet was available from gh run view.'
  }
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

$useCurrentBranchDiagnostics = $Preflight -or $PrCheckSummary -or $LogFirstTriage

if ($Preflight -and -not [string]::IsNullOrWhiteSpace($ChecksCommand)) {
  throw 'Use -SliceCommand with -Preflight. -ChecksCommand is only for legacy -RunChecks mode.'
}

if ($RunSliceChecks -and -not [string]::IsNullOrWhiteSpace($SliceCommand)) {
  throw 'Use either -RunSliceChecks or -SliceCommand, not both.'
}

$targets = if ($TargetBranches.Count -gt 0) {
  @($TargetBranches)
} elseif ($useCurrentBranchDiagnostics) {
  @($currentBranch)
} else {
  @(Get-BranchCandidates -Base $BaseBranch)
}

if (
  @($targets).Count -eq 0 -and
  -not $RunSliceChecks -and
  -not $RunChecks -and
  -not $Preflight -and
  -not $PrCheckSummary -and
  -not $LogFirstTriage
) {
  Write-Host 'No target branches to analyze.'
  exit 0
}

$report = @()

foreach ($branch in $targets) {
  Write-BranchDiagnostics -Base $BaseBranch -Branch $branch -Accumulator ([ref]$report)
}

Write-Host ''
Write-Host '=== Summary ==='
if ($report.Count -gt 0) {
  $report | Sort-Object Branch | Format-Table -AutoSize
} else {
  Write-Host 'No branch diagnostics collected.'
}

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

if ($Preflight) {
  Write-Host ''
  Write-Host '=== Preflight ==='

  if ($RunSliceChecks) {
    Write-Host 'Running default runtime command slice checks...'
    $testCmd = 'pnpm --filter dvt-api test -- test/entrypoints/http/runCommandRouteExecutor.test.ts test/entrypoints/http/runCommandFieldParsers.test.ts test/entrypoints/http/signalRunRouteParser.test.ts test/entrypoints/http/cancelRunRouteParser.test.ts test/entrypoints/http/signalRunRoute.test.ts test/entrypoints/http/cancelRunRoute.test.ts'
    Write-Host "  $testCmd"
    Invoke-ShellCommandStrict -Command $testCmd -FailureMessage 'Slice tests failed.'
  } elseif (-not [string]::IsNullOrWhiteSpace($SliceCommand)) {
    Write-Host "Running custom slice command: $SliceCommand"
    Invoke-ShellCommandStrict -Command $SliceCommand -FailureMessage 'Slice command failed.'
  } else {
    Write-Host 'Running affected-package preflight checks'
    Invoke-ShellCommandStrict -Command 'pnpm preflight:affected' -FailureMessage 'pnpm preflight:affected failed.'
  }

  Write-Host 'Auto-fixing changed files (Prettier + ESLint) before verify gate'
  Invoke-ShellCommandStrict -Command 'pnpm fix:changed' -FailureMessage 'pnpm fix:changed failed.'

  Write-Host 'Running pnpm verify:prepush'
  Invoke-ShellCommandStrict -Command 'pnpm verify:prepush' -FailureMessage 'pnpm verify:prepush failed.'
}

if ($RunSliceChecks -and -not $Preflight) {
  Write-Host ''
  Write-Host 'Running default runtime command slice checks...'
  $testCmd = 'pnpm --filter dvt-api test -- test/entrypoints/http/runCommandRouteExecutor.test.ts test/entrypoints/http/runCommandFieldParsers.test.ts test/entrypoints/http/signalRunRouteParser.test.ts test/entrypoints/http/cancelRunRouteParser.test.ts test/entrypoints/http/signalRunRoute.test.ts test/entrypoints/http/cancelRunRoute.test.ts'
  Write-Host "  $testCmd"
  Invoke-ShellCommandStrict -Command $testCmd -FailureMessage 'Slice tests failed.'
}

if ($RunChecks -and -not $Preflight) {
  if ([string]::IsNullOrWhiteSpace($ChecksCommand)) {
    throw 'RunChecks requires -ChecksCommand "<command>".'
  }

  Write-Host ''
  Write-Host "Running custom checks command: $ChecksCommand"
  Invoke-ShellCommandStrict -Command $ChecksCommand -FailureMessage 'Custom checks command failed.'
}

if ($PrCheckSummary) {
  Write-PrCheckSummary
}

if ($LogFirstTriage) {
  Write-FirstRedTriage
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
