# ============================================================
# Nimia Games - Monorepo Migration Script (Tahap 2)
#
# Jalankan dari PowerShell DI DALAM C:\Users\mochn\nimia-games,
# SETELAH Anda extract zip "nimia-monorepo-scaffold.zip" ke folder
# ini (lihat instruksi di chat). Baca dulu sebelum run.
#
# Yang dilakukan script ini:
#   1. Buat branch baru "monorepo-migration" (tidak menyentuh main)
#   2. git mv seluruh source app lama ke apps/www/
#   3. Aktifkan package.json & README.md root yang baru (workspaces)
#   4. Hapus node_modules/.next lama di root (akan diinstall ulang)
#
# TIDAK melakukan commit atau push - itu langkah manual terakhir,
# setelah Anda verifikasi npm install & npm run dev berhasil.
# ============================================================

$ErrorActionPreference = "Stop"

Write-Host "1. Cek status git..." -ForegroundColor Cyan
git status

Write-Host "`n2. Membuat branch 'monorepo-migration'..." -ForegroundColor Cyan
git checkout -b monorepo-migration

Write-Host "`n3. Membuat folder apps/www..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path apps\www | Out-Null

Write-Host "`n4. Memindahkan source www app ke apps/www (git mv, riwayat git tetap terjaga)..." -ForegroundColor Cyan
git mv app apps\www\app
git mv components apps\www\components
git mv data apps\www\data
git mv hooks apps\www\hooks
git mv lib apps\www\lib
git mv types apps\www\types
git mv public apps\www\public
git mv package.json apps\www\package.json
git mv next.config.ts apps\www\next.config.ts
git mv tsconfig.json apps\www\tsconfig.json
git mv eslint.config.mjs apps\www\eslint.config.mjs
git mv postcss.config.mjs apps\www\postcss.config.mjs
git mv next-env.d.ts apps\www\next-env.d.ts
git mv README.md apps\www\README.md
git rm package-lock.json

Write-Host "`n5. Ganti nama package di apps/www/package.json jadi 'www'..." -ForegroundColor Cyan
(Get-Content apps\www\package.json) -replace '"name": "nimia-games"', '"name": "www"' | Set-Content apps\www\package.json

Write-Host "`n6. Mengaktifkan package.json & README.md root yang baru..." -ForegroundColor Cyan
Move-Item -Force package.json.monorepo package.json
Move-Item -Force README.md.monorepo README.md

Write-Host "`n7. Membersihkan node_modules/.next lama di root (akan diinstall ulang lewat workspaces)..." -ForegroundColor Cyan
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue

Write-Host "`n8. Staging semua perubahan untuk direview..." -ForegroundColor Cyan
git add -A
git status

Write-Host "`n============================================================" -ForegroundColor Yellow
Write-Host "SELESAI pemindahan file. Langkah manual berikutnya:" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Yellow
Write-Host "  1. npm install"
Write-Host "  2. npm run dev:www     -> buka localhost, pastikan situs utama masih normal"
Write-Host "  3. npm run dev:studio  -> buka localhost, pastikan skeleton studio muncul"
Write-Host "  4. Kalau dua-duanya OK:"
Write-Host "       git commit -m 'chore: migrate to turborepo monorepo'"
Write-Host "       git push -u origin monorepo-migration"
Write-Host "  5. Di dashboard Vercel, project nimiagames.com yang SUDAH ADA:"
Write-Host "       Settings -> General -> Root Directory -> ganti jadi 'apps/www' -> Save"
Write-Host "  6. Buat project Vercel BARU untuk studio.nimiagames.com, repo yang sama,"
Write-Host "       Root Directory 'apps/studio', tambahkan domain studio.nimiagames.com."
Write-Host "  7. Setelah kedua project berhasil deploy dari branch ini, baru merge"
Write-Host "       monorepo-migration ke branch production Anda."
Write-Host "  JANGAN commit/push sebelum langkah 2-3 di atas berhasil di local Anda." -ForegroundColor Red
