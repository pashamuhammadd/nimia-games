# Deletes the apps/studio files that were split out into a new app
# (apps/app, app.nimiastudio.com) on 14 Agustus 2026 — see project memory's
# "studio_multi_app_split_plan". These files were NOT deleted automatically
# because Claude's device tools can only read/write files, not delete them
# — this script is the manual cleanup step, same pattern as
# delete-old-ai-client-hunter-files.ps1.
#
# SAFE TO RUN ANYTIME AFTER apps/app IS CONFIRMED WORKING: apps/studio's
# next.config.ts already redirects every one of these routes to
# app.nimiastudio.com, so the files below are dead code — nothing in
# production reaches them anymore. Deleting them is pure tidy-up, not a
# functional change.
#
# Run this from the repo root (C:\Users\mochn\nimia-games) in PowerShell:
#
#   .\delete-old-app-split-files.ps1
#
# Review the list below before running — this permanently deletes files.
# After running, also run: cd apps\studio; npm run build   (to confirm
# nothing in apps/studio still references anything deleted here).

$ErrorActionPreference = "Stop"

$paths = @(
    "apps\studio\app\dashboard",
    "apps\studio\app\login",
    "apps\studio\app\register",
    "apps\studio\app\order",
    "apps\studio\app\r",
    "apps\studio\app\api\discord",
    "apps\studio\app\api\orders",
    "apps\studio\app\lib",
    "apps\studio\app\components\DashboardNav.tsx",
    "apps\studio\app\components\LoginModal.tsx",
    "apps\studio\app\components\dashboard",
    "apps\studio\app\actions.ts",
    "apps\studio\modules\order",
    "apps\studio\modules\quests",
    "apps\studio\modules\vouchers",
    "apps\studio\modules\partners\api",
    "apps\studio\modules\partners\components",
    "apps\studio\modules\partners\hooks",
    "apps\studio\modules\partners\repository",
    "apps\studio\modules\partners\schemas",
    "apps\studio\modules\partners\services",
    "apps\studio\modules\partners\types",
    "apps\studio\modules\partners\utils"
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

# modules/partners/index.ts (the module's root barrel) re-exports from the
# subfolders just deleted above (components/repository/services/schemas/
# hooks/utils/api) — it has to be trimmed down to just `constants` in the
# SAME run as the deletions above, or apps/studio's build breaks the moment
# either half runs alone. The only remaining consumer in apps/studio is
# PartnersMarketingExperience.tsx (the public /partners page), which only
# ever needed the constants.
$partnersIndexPath = Join-Path -Path (Get-Location) -ChildPath "apps\studio\modules\partners\index.ts"
if (Test-Path $partnersIndexPath) {
    $trimmedContent = @"
// Nimia Partner Program - module root barrel (TRIMMED 14 Agustus 2026,
// dashboard split - see project memory's studio_multi_app_split_plan).
// Only PartnersMarketingExperience.tsx (the public /partners page) still
// imports from this module in apps/studio; everything else (dashboard
// components, services, repository, schemas, hooks, utils, api) moved to
// apps/app, which has its own full copy of this module.

export * from "./constants";
"@
    Set-Content -Path $partnersIndexPath -Value $trimmedContent -Encoding utf8
    Write-Host "Trimmed: apps\studio\modules\partners\index.ts (constants-only now)"
}

Write-Host ""
Write-Host "Done. Now run: cd apps\studio; npm install; npm run build"
Write-Host "Also worth doing afterward (optional, not required): simplify apps\studio\middleware.ts"
Write-Host "and next.config.ts's redirects() - the /dashboard, /login, /register, /order etc."
Write-Host "redirects no longer have anything to redirect AWAY from once these files are gone,"
Write-Host "though leaving them in place is harmless."
