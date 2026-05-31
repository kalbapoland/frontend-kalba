Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$testRoot = Split-Path -Parent $PSScriptRoot
$frontendRoot = Split-Path -Parent $testRoot

Push-Location $frontendRoot
try {
  python test/automated/prepare_mobile_e2e.py
}
finally {
  Pop-Location
}
