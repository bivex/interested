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
echo 7. VMware Pro vs Player for development
echo 8. Exit
echo.
set /p choice=Select action (1-8): 

if "%choice%"=="1" goto check_virt
if "%choice%"=="2" goto install_wsl2
if "%choice%"=="3" goto install_ubuntu
if "%choice%"=="4" goto download_docker
if "%choice%"=="5" goto enable_features
if "%choice%"=="6" goto check_status
if "%choice%"=="7" goto vmware_compare
if "%choice%"=="8" goto end
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

:vmware_compare
cls
echo ============================================================
echo   VMware Workstation Pro vs Player for Development
echo ============================================================
echo.
echo For development purposes, here's a comparison between
echo VMware Workstation 17.5.1 Pro and VMware Workstation 17.5.1 Player:
echo.
echo VMware Workstation Pro advantages for developers:
echo.
echo 1. Snapshots - Create multiple save points to test different
echo    configurations without risking your development environment
echo.
echo 2. Cloning - Quickly create linked or full clones of VMs for
echo    parallel development environments or testing
echo.
echo 3. Multiple tabs - Run several VMs simultaneously with easy
echo    tab-based switching between environments
echo.
echo 4. Advanced networking - Create custom virtual networks for
echo    complex development/testing scenarios
echo.
echo 5. Team development features - Share VMs with team members and
echo    access them remotely
echo.
echo 6. Resource control - Fine-tune CPU, memory, and disk allocation
echo    for optimal development performance
echo.
echo 7. VM encryption and restrictions - Secure development environments
echo    and intellectual property
echo.
echo VMware Workstation Player limitations:
echo.
echo 1. No snapshots - Can't create recovery points during development
echo 2. No cloning - Manual copy required for duplicate environments
echo 3. Limited networking options - Basic NAT and bridged only
echo 4. Single VM interface - No tabbed interface for multiple VMs
echo 5. No VM sharing - Limited team collaboration features 
echo.
echo Recommendation:
echo.
echo * For professional development: VMware Workstation Pro provides
echo   essential features for efficient development workflows
echo.
echo * For casual or learning purposes: VMware Player may be
echo   sufficient if advanced features aren't required
echo.
echo Workstation Pro is worth the investment for serious development
echo work where productivity, flexibility and team collaboration
echo are important.
echo.
pause
goto menu

:end
exit /b 0
