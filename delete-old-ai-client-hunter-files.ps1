# Deletes the retired "AI Client Hunter" (V1) files now superseded by the
# "AI Prospect Hunter" (V2) rewrite. Run this from the repo root
# (C:\Users\mochn\nimia-games) in PowerShell:
#
#   .\delete-old-ai-client-hunter-files.ps1
#
# Review the list below before running — this permanently deletes files.
# Nothing here is used by the Order Dashboard or any other admin feature.

$ErrorActionPreference = "Stop"

$paths = @(
    "apps\admin\app\(protected)\ai-client-hunter",
    "apps\admin\lib\ai-agent\discovery\reddit-provider.ts",
    "apps\admin\lib\ai-agent\discovery\web-search-provider.ts",
    "apps\admin\lib\ai-agent\discovery\job-board-provider.ts",
    "apps\admin\lib\ai-agent\discovery\coingecko-memecoin-provider.ts",
    "apps\admin\lib\ai-agent\discovery\coingecko-nft-provider.ts",
    "apps\admin\lib\ai-agent\tools\qualify.ts",
    "apps\admin\lib\ai-agent\tools\extract.ts",
    "apps\admin\lib\ai-agent\tools\score.ts",
    "apps\admin\lib\ai-agent\tools\scoreFirmographic.ts",
    "apps\admin\lib\ai-agent\tools\text.ts"
)

foreach ($relativePath in $paths) {
    $fullPath = Join-Path -Path (Get-Location) -ChildPath $relativePath
    if (Test-Path $fullPath) {
        Remove-Item -Path $fullPath -Recurse -Force
        Write-Host "Deleted: $relativePath"
    } else {
        Write-Host "Already gone (skipped): $relativePath"
    }
}

Write-Host ""
Write-Host "Done. Now run: cd apps\admin; npm run typecheck; npm run lint; npm run build"
