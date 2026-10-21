# vibe.ps1 - Windows PowerShell wrapper for the Vibe Music CLI.
# Finds the CLI shipped inside this skill and forwards all arguments to node.

$ErrorActionPreference = 'Stop'

$SkillDir = Split-Path -Parent $PSScriptRoot
$candidates = New-Object System.Collections.Generic.List[string]

if ($env:VIBE_CLI) {
  $candidates.Add(($env:VIBE_CLI -replace '[\\/]+$', ''))
}

$candidates.Add((Join-Path $SkillDir 'cli'))
$candidates.Add((Get-Location).Path)

$dir = (Get-Location).Path
while ($true) {
  $candidates.Add((Join-Path $dir 'skills\vibe-music\cli'))
  $parent = Split-Path -Parent $dir
  if ([string]::IsNullOrEmpty($parent) -or $parent -eq $dir) { break }
  $dir = $parent
}

$cli = $null
foreach ($candidate in $candidates) {
  if ([string]::IsNullOrWhiteSpace($candidate)) { continue }
  if (Test-Path -LiteralPath (Join-Path $candidate 'bin\vibe.js')) {
    $cli = (Resolve-Path -LiteralPath $candidate).Path
    break
  }
}

if (-not $cli) {
  [Console]::Error.WriteLine('Vibe Music CLI not found.')
  [Console]::Error.WriteLine('Set VIBE_CLI to the skill cli folder, or run from the music repo.')
  exit 2
}

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  [Console]::Error.WriteLine('Node.js (>= 18) is required to run the Vibe Music CLI.')
  exit 2
}

if ($args.Count -eq 1 -and $args[0] -eq '--which-cli') {
  Write-Output $cli
  exit 0
}

& $node.Source (Join-Path $cli 'bin\vibe.js') @args
$code = $LASTEXITCODE
if ($null -eq $code) { $code = 0 }
exit $code
