@echo off
:: ============================================================
:: build_and_package.bat — Boggi Incentivi
:: Esegui con doppio click o da cmd (non PowerShell)
:: ============================================================

echo.
echo ==========================================
echo   Boggi Incentivi - Build e Package
echo ==========================================
echo.

:: ── Step 1: Verifica .NET SDK ─────────────────────────────
echo [1/4] Verifica .NET SDK...
dotnet --version >nul 2>&1
if errorlevel 1 (
    echo ERRORE: .NET SDK non trovato.
    echo Scarica da: https://dotnet.microsoft.com/download/dotnet/8.0
    pause & exit /b 1
)
for /f "tokens=*" %%v in ('dotnet --version') do echo       SDK: %%v

:: ── Step 2: Copia app.html aggiornato ────────────────────
echo.
echo [2/4] Aggiornamento app.html...
if exist "app_latest.html" (
    if not exist "web" mkdir web
    copy /y "app_latest.html" "web\app.html" >nul
    echo       Copiato: app_latest.html -^> web\app.html
) else (
    echo       app_latest.html non trovato - uso web\app.html esistente
    if not exist "web\app.html" (
        echo ERRORE: Nessun app.html trovato.
        pause & exit /b 1
    )
)

:: ── Step 3: Compila ───────────────────────────────────────
echo.
echo [3/4] Compilazione...
if exist "publish" rmdir /s /q "publish"
dotnet publish "BoggiIncentivi.csproj" -c Release -r win-x64 --self-contained true -p:PublishSingleFile=false -o "publish" /p:DebugType=None /p:DebugSymbols=false
if errorlevel 1 (
    echo ERRORE: Compilazione fallita.
    pause & exit /b 1
)
echo       Compilazione OK

:: Copia update.json se non gia presente nella publish
if exist "update.json" (
    if not exist "publish\update.json" copy "update.json" "publish\update.json" >nul
)

:: ── Step 4: Genera installer ──────────────────────────────
echo.
echo [4/4] Generazione installer NSIS...
"%ProgramFiles(x86)%\NSIS\makensis.exe" "BoggiIncentivi_installer.nsi"
if errorlevel 1 (
    echo ERRORE: NSIS ha riportato un errore.
    pause & exit /b 1
)

echo.
echo ==========================================
echo   COMPLETATO: BoggiIncentivi_Setup.exe
echo ==========================================
echo.
pause
