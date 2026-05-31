Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$testRoot = Split-Path -Parent $PSScriptRoot
$frontendRoot = Split-Path -Parent $testRoot

Push-Location $frontendRoot
try {
  python test/automated/run_ios_smoke.py
}
finally {
  Pop-Location
}
