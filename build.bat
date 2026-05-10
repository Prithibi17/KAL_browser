@echo off
echo ==========================================
echo KAL BROWSER: PROFESSIONAL BUILD SYSTEM
echo ==========================================

echo [1/4] Terminating existing browser instances...
taskkill /F /IM kal-browser.exe /T 2>nul
taskkill /F /IM rcedit-x64.exe /T 2>nul

echo [2/4] Clearing previous release artifacts...
if exist build (
    rmdir /s /q build
)
if exist release (
    rmdir /s /q release
)
mkdir build
copy public\logo.ico build\icon.ico

echo [3/4] Running production compilation...
call npm run build

echo [4/4] Generating installer and portable binaries...
call npx electron-builder build --win --x64

echo ==========================================
echo BUILD COMPLETE: Check the 'release' folder.
echo ==========================================
