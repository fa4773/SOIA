@echo off
setlocal enabledelayedexpansion

echo ========================================================================
echo                  SOIA OS - CREAZIONE ISO DEBIAN LIVE                    
echo ========================================================================
echo.

:: 1. Compilazione automatica del bundle SOIA (React + Electron) se non compilato
if not exist "..\dist-electron\main.js" (
    echo [1/3] Compilazione bundle SOIA in corso...
    cd ..
    call npm run build
    cd linux-iso
) else (
    echo [1/3] Bundle SOIA gia' compilato in dist e dist-electron.
)

:: 2. Verifica presenza di WSL per la generazione di Debian
echo.
echo [2/3] Verifica ambiente di build Debian (WSL)...
wsl -l -v >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [ATTENZIONE] Il sottosistema WSL (Windows Subsystem for Linux) non e' ancora attivo.
    echo La generazione di una ISO Debian pura (kernel, debootstrap, squashfs)
    echo richiede privilegi di root Linux.
    echo.
    echo Opzione A (Consigliata): Installa Debian su Windows con il comando:
    echo   wsl --install -d Debian
    echo.
    echo Dopo l'installazione (e il riavvio se richiesto da Windows), rilancia questo script.
    echo.
    pause
    exit /b 1
)

:: 3. Avvio della build dentro WSL con permessi di root
echo.
echo [3/3] Avvio del generatore live-build dentro Debian WSL...
wsl -d Debian -u root -- bash -c "cd /mnt/c/Users/franc/SOIA/linux-iso && ./build-debian-iso.sh"

echo.
echo ========================================================================
echo Build terminata! Controlla 'soia-os-latest-amd64.iso' in questa cartella.
echo Per scriverla su USB da Windows: usa Rufus (modalita' DD o ISO ibrida)
echo oppure BalenaEtcher.
echo ========================================================================
pause
