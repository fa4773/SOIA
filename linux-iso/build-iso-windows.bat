@echo off
setlocal enabledelayedexpansion

echo ========================================================================
echo                  SOIA OS - DEBIAN LIVE ISO BUILDER
echo ========================================================================
echo.

:: 1. Automatically build the SOIA bundle (React + Electron) if not compiled
if not exist "..\dist-electron\main.js" (
    echo [1/3] Compiling SOIA bundle...
    cd ..
    call npm run build
    cd linux-iso
) else (
    echo [1/3] SOIA bundle already compiled in dist and dist-electron.
)

:: 2. Check for WSL to build Debian
echo.
echo [2/3] Checking Debian build environment (WSL)...
wsl -l -v >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [WARNING] WSL (Windows Subsystem for Linux) is not enabled yet.
    echo Building a pure Debian ISO (kernel, debootstrap, squashfs)
    echo requires Linux root privileges.
    echo.
    echo Option A (Recommended): Install Debian on Windows with:
    echo   wsl --install -d Debian
    echo.
    echo After installation (and reboot if required by Windows), rerun this script.
    echo.
    pause
    exit /b 1
)

:: 3. Start the build inside WSL with root privileges
echo.
echo [3/3] Starting live-build generator inside Debian WSL...
wsl -d Debian -u root -- bash -c "cd /mnt/c/Users/franc/SOIA/linux-iso && ./build-debian-iso.sh"

echo.
echo ========================================================================
echo Build complete! Check 'soia-os-latest-amd64.iso' in this folder.
echo To flash to USB from Windows: use Rufus (DD or hybrid ISO mode)
echo or BalenaEtcher.
echo ========================================================================
pause
