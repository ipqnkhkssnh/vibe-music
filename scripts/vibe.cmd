@echo off
setlocal
set "PS1=%~dp0vibe.ps1"
if not exist "%PS1%" (
  echo vibe.ps1 not found.
  exit /b 2
)
set "PSEXE=powershell"
where powershell >nul 2>nul
if errorlevel 1 (
  set "PSEXE=pwsh"
  where pwsh >nul 2>nul
  if errorlevel 1 (
    echo PowerShell is required to run the Vibe Music CLI on Windows.
    exit /b 2
  )
)
"%PSEXE%" -NoProfile -ExecutionPolicy Bypass -File "%PS1%" %*
exit /b %ERRORLEVEL%
