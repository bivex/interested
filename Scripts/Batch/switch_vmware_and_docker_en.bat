@echo off
setlocal enabledelayedexpansion
title Virtualization Management: VMware/Docker

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
echo   VMware/Docker Virtualization Management
echo ============================================================
echo.
echo IMPORTANT: VMware and Docker (with Hyper-V) cannot run simultaneously
echo            on the same system due to virtualization technology conflicts.
echo.
echo  * VMware Mode: Hyper-V disabled, VMware works normally
echo  * Docker Mode: Hyper-V enabled, Docker works, but VMware
echo    will run slowly or fail to start
echo.
echo ============================================================
echo.
echo 1. Enable Docker Mode (Hyper-V)
echo 2. Enable VMware Mode (disable Hyper-V)
echo 3. Check current status
echo 4. Exit
echo.
set /p choice=Select action (1-4): 

if "%choice%"=="1" goto enable_docker
if "%choice%"=="2" goto enable_vmware
if "%choice%"=="3" goto check_status
if "%choice%"=="4" goto end
goto menu

:enable_docker
echo.
echo Enabling Docker Mode (with Hyper-V)...
echo WARNING: VMware will run slowly or may not work at all.

:: Enable Windows Hypervisor Platform
dism /online /Enable-Feature /FeatureName:HypervisorPlatform /All

:: Enable Virtual Machine Platform
dism /online /Enable-Feature /FeatureName:VirtualMachinePlatform /All

:: Enable Windows Subsystem for Linux
dism /online /Enable-Feature /FeatureName:Microsoft-Windows-Subsystem-Linux /All

:: Enable Hyper-V
dism /online /Enable-Feature /FeatureName:Microsoft-Hyper-V /All

:: Configure virtualization settings in registry
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\DeviceGuard\Scenarios\HypervisorEnforcedCodeIntegrity" /v "Enabled" /t REG_DWORD /d 1 /f

:: Enable hypervisor through bcdedit
bcdedit /set hypervisorlaunchtype auto

echo.
echo Docker Mode enabled. After reboot:
echo  + Docker will work normally
echo  - VMware will work slowly or not work
echo  + WSL2 will work normally
echo.
choice /c YN /m "Restart computer now? (Y/N): "
if errorlevel 2 goto menu
if errorlevel 1 shutdown /r /t 5 /c "Restarting to apply virtualization changes (Docker Mode)"
goto end

:enable_vmware
echo.
echo Enabling VMware Mode (disabling Hyper-V)...
echo WARNING: Docker will not work in Hyper-V mode.

:: Disable Hyper-V
dism /online /Disable-Feature /FeatureName:Microsoft-Hyper-V /All

:: Disable Windows Hypervisor Platform
dism /online /Disable-Feature /FeatureName:HypervisorPlatform /All

:: Configure virtualization settings in registry
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\DeviceGuard\Scenarios\HypervisorEnforcedCodeIntegrity" /v "Enabled" /t REG_DWORD /d 0 /f

:: Disable hypervisor through bcdedit
bcdedit /set hypervisorlaunchtype off

echo.
echo VMware Mode enabled. After reboot:
echo  + VMware will work at full speed
echo  - Docker may not work or will require switching to non-Hyper-V mode
echo  - WSL2 will be unavailable (you can use WSL1)
echo.
choice /c YN /m "Restart computer now? (Y/N): "
if errorlevel 2 goto menu
if errorlevel 1 shutdown /r /t 5 /c "Restarting to apply virtualization changes (VMware Mode)"
goto end

:check_status
echo.
echo Checking current virtualization status...
echo.

:: Check Hyper-V status
sc query hvservice >nul 2>&1
if %errorlevel% equ 0 (
    echo [ACTIVE] Hyper-V service is running
    echo Current mode: Docker/Hyper-V
    echo  + Docker should work normally
    echo  - VMware may run slowly or fail to start
) else (
    echo [INACTIVE] Hyper-V service is not running
    echo Current mode: VMware
    echo  + VMware should work normally
    echo  - Docker in Hyper-V mode will not work
)

:: Check hypervisorlaunchtype setting
for /f "tokens=3" %%a in ('bcdedit /enum ^| findstr "hypervisorlaunchtype"') do set hypervisor=%%a
if "%hypervisor%"=="" set hypervisor=Not configured
echo.
echo Hypervisor status: %hypervisor%
echo.
pause
goto menu

:end
exit /b 0