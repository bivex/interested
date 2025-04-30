@echo off
setlocal enabledelayedexpansion
title Docker Setup in VMware Windows VM

:: Run with administrator privileges
>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"
if %errorlevel% neq 0 (
    echo Administrator rights required. Restarting script...
    powershell -Command "Start-Process '%0' -Verb RunAs"
    exit /b
)

:menu
cls
echo ============================================================
echo   Docker Setup in VMware Windows VM
echo ============================================================
echo.
echo IMPORTANT: Ensure nested virtualization is enabled in VMware:
echo            VM Settings → Hardware → CPU → Virtualize Intel VT-x/EPT or AMD-V/RVI
echo.
echo This script will help you set up Docker with WSL2 inside Windows VM.
echo.
echo ============================================================
echo.
echo 1. Check virtualization prerequisites
echo 2. Install WSL2 components
echo 3. Download and install Ubuntu for WSL
echo 4. Download Docker Desktop installer
echo 5. Enable required Windows features
echo 6. Check current status
echo 7. Exit
echo.
set /p choice=Select action (1-7): 

if "%choice%"=="1" goto check_virt
if "%choice%"=="2" goto install_wsl2
if "%choice%"=="3" goto install_ubuntu
if "%choice%"=="4" goto download_docker
if "%choice%"=="5" goto enable_features
if "%choice%"=="6" goto check_status
if "%choice%"=="7" goto end
goto menu

:check_virt
cls
echo.
echo Checking virtualization prerequisites...
echo.

:: Check if Hyper-V is available
systeminfo | findstr /i "Hyper-V Requirements"
echo.

:: Check if virtualization is enabled
systeminfo | findstr /i "Virtualization Enabled In Firmware: Yes"
if %errorlevel% neq 0 (
    echo WARNING: Virtualization may not be enabled in VMware settings.
    echo Please make sure nested virtualization is enabled in VMware:
    echo VM Settings → Hardware → CPU → Check "Virtualize Intel VT-x/EPT or AMD-V/RVI"
) else (
    echo Virtualization appears to be properly enabled.
)
echo.

:: Check Windows version
ver | findstr /i "10\."
if %errorlevel% equ 0 (
    echo Windows 10 detected. Compatible with WSL2.
) else (
    ver | findstr /i "11\."
    if %errorlevel% equ 0 (
        echo Windows 11 detected. Compatible with WSL2.
    ) else (
        echo WARNING: Couldn't confirm a compatible Windows version.
        echo WSL2 requires Windows 10 version 1903 or higher with Build 18362 or higher.
    )
)
echo.
pause
goto menu

:install_wsl2
cls
echo.
echo Installing WSL2 components...
echo.

:: Download the WSL2 kernel update package
echo Downloading WSL2 Linux kernel update package...
powershell -Command "Invoke-WebRequest -Uri 'https://wslstorestorage.blob.core.windows.net/wslblob/wsl_update_x64.msi' -OutFile '%TEMP%\wsl_update_x64.msi'"
echo Installing WSL2 Linux kernel...
start /wait msiexec /i "%TEMP%\wsl_update_x64.msi" /qn
echo.

:: Set WSL2 as default
echo Setting WSL2 as default version...
wsl --set-default-version 2
echo.
echo WSL2 components installed. You may need to restart your computer.
echo.
choice /c YN /m "Restart computer now? (Y/N): "
if errorlevel 2 goto menu
if errorlevel 1 shutdown /r /t 5 /c "Restarting to apply WSL2 changes"
goto end

:install_ubuntu
cls
echo.
echo Installing Ubuntu for WSL...
echo.
echo Options:
echo 1. Install from Microsoft Store (recommended)
echo 2. Install via command line
echo.
set /p ubuntuchoice=Select installation method (1-2): 

if "%ubuntuchoice%"=="1" (
    echo Opening Microsoft Store...
    start ms-windows-store://search/?query=ubuntu
    echo Please install Ubuntu from the Microsoft Store.
) else if "%ubuntuchoice%"=="2" (
    echo Installing Ubuntu via command line...
    echo This may take some time...
    wsl --install -d Ubuntu
)
echo.
echo After installation, launch Ubuntu and complete the setup.
echo.
pause
goto menu

:download_docker
cls
echo.
echo Downloading Docker Desktop installer...
echo.
echo Downloading Docker Desktop...
powershell -Command "Invoke-WebRequest -Uri 'https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe' -OutFile '%USERPROFILE%\Downloads\DockerDesktopInstaller.exe'"
echo.
echo Docker Desktop installer downloaded to your Downloads folder.
echo.
echo IMPORTANT: After installation:
echo 1. Start Docker Desktop
echo 2. Go to Settings
echo 3. In General, ensure "Use WSL 2 based engine" is checked
echo 4. In Resources → WSL Integration, enable integration with your Ubuntu distro
echo.
choice /c YN /m "Run Docker Desktop installer now? (Y/N): "
if errorlevel 2 goto menu
if errorlevel 1 start "" "%USERPROFILE%\Downloads\DockerDesktopInstaller.exe"
goto menu

:enable_features
cls
echo.
echo Enabling required Windows features...
echo.

:: Enable Virtual Machine Platform
dism /online /Enable-Feature /FeatureName:VirtualMachinePlatform /All
echo.

:: Enable Windows Subsystem for Linux
dism /online /Enable-Feature /FeatureName:Microsoft-Windows-Subsystem-Linux /All
echo.

echo Required Windows features enabled. You'll need to restart your computer.
echo.
choice /c YN /m "Restart computer now? (Y/N): "
if errorlevel 2 goto menu
if errorlevel 1 shutdown /r /t 5 /c "Restarting to apply Windows feature changes"
goto end

:check_status
cls
echo.
echo Checking current Docker/WSL status...
echo.

:: Check WSL status
echo WSL status:
wsl --status
echo.

:: Check WSL distributions
echo WSL distributions:
wsl -l -v
echo.

:: Check if Docker is installed
if exist "%ProgramFiles%\Docker\Docker\Docker Desktop.exe" (
    echo Docker Desktop is installed.
) else (
    echo Docker Desktop is not installed or not found in standard location.
)
echo.

:: Check Docker service
sc query com.docker.service >nul 2>&1
if %errorlevel% equ 0 (
    echo Docker service is installed.
) else (
    echo Docker service is not found or not running.
)
echo.
pause
goto menu

:end
exit /b 0