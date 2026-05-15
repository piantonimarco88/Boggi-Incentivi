; ============================================================
; BoggiIncentivi — Script NSIS Installer
; Genera: BoggiIncentivi_Setup.exe
; Requisiti: NSIS 3.x (https://nsis.sourceforge.io)
; ============================================================

Unicode True
CRCCheck off  ; disabilita CRC check per evitare falsi 'integrity check failed'

; ── Metadata ────────────────────────────────────────────────
!define APP_NAME        "Boggi Incentivi"
!define APP_VERSION     "4.6"
!define APP_PUBLISHER   "Boggi Milano"
!define APP_EXE         "BoggiIncentivi.exe"
!define APP_DIR         "$PROGRAMFILES64\BoggiIncentivi"
!define UNINSTALL_KEY   "Software\Microsoft\Windows\CurrentVersion\Uninstall\BoggiIncentivi"

; Cartella sorgente dei file compilati (relativa a dove si trova questo .nsi)
; Dopo "dotnet publish -c Release -r win-x64 --self-contained true -o publish"
!define SRC_DIR "publish"

; ── Impostazioni generali ────────────────────────────────────
; Versione letta automaticamente da app.html durante la build (vedi build_and_package.bat)
Name              "${APP_NAME} ${APP_VERSION}"
OutFile           "BoggiIncentivi_Setup.exe"
InstallDir        "${APP_DIR}"
InstallDirRegKey  HKLM "${UNINSTALL_KEY}" "InstallLocation"
RequestExecutionLevel admin
SetCompressor     /SOLID lzma
SetCompressorDictSize 64

; ── Include UI moderna ───────────────────────────────────────
!include "MUI2.nsh"
!include "FileFunc.nsh"
!include "LogicLib.nsh"

; Impostazioni UI
!define MUI_ABORTWARNING
!define MUI_ICON   "${SRC_DIR}\boggi.ico"
!define MUI_UNICON "${SRC_DIR}\boggi.ico"
!define MUI_WELCOMEFINISHPAGE_BITMAP "${NSISDIR}\Contrib\Graphics\Wizard\win.bmp"

; Colori header (simulazione brand Boggi)
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_BITMAP "${NSISDIR}\Contrib\Graphics\Header\nsis.bmp"

; ── Pagine Installer ─────────────────────────────────────────
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!define MUI_FINISHPAGE_RUN          "$INSTDIR\${APP_EXE}"
!define MUI_FINISHPAGE_RUN_TEXT     "Avvia Boggi Incentivi"
!define MUI_FINISHPAGE_SHOWREADME   ""
!insertmacro MUI_PAGE_FINISH

; ── Pagine Uninstaller ───────────────────────────────────────
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

; ── Lingua ───────────────────────────────────────────────────
!insertmacro MUI_LANGUAGE "Italian"

; ── Versione risorsa EXE ────────────────────────────────────
VIProductVersion "${APP_VERSION}.0.0"
VIAddVersionKey /LANG=0 "ProductName"     "${APP_NAME}"
VIAddVersionKey /LANG=0 "ProductVersion"  "${APP_VERSION}"
VIAddVersionKey /LANG=0 "CompanyName"     "${APP_PUBLISHER}"
VIAddVersionKey /LANG=0 "FileDescription" "${APP_NAME} Installer"
VIAddVersionKey /LANG=0 "FileVersion"     "${APP_VERSION}"

; ────────────────────────────────────────────────────────────
; SEZIONE PRINCIPALE: Installazione
; ────────────────────────────────────────────────────────────
Section "Applicazione (obbligatoria)" SecMain
    SectionIn RO  ; non deselezionabile

    SetOutPath "$INSTDIR"

    ; ── File principali ──────────────────────────────────────
    ; Copia tutto il contenuto della cartella publish/
    File /r "${SRC_DIR}\*.*"

    ; ── update.json ─────────────────────────────────────────
    ; Copia solo se non esiste già (preserva le impostazioni URL del collega)
    IfFileExists "$INSTDIR\update.json" +2 0
        File "update.json"

    ; ── Shortcut Desktop ────────────────────────────────────
    CreateShortcut "$DESKTOP\${APP_NAME}.lnk" \
        "$INSTDIR\${APP_EXE}" "" \
        "$INSTDIR\boggi.ico" 0 \
        SW_SHOWNORMAL "" "${APP_NAME}"

    ; ── Shortcut Menu Start ──────────────────────────────────
    CreateDirectory "$SMPROGRAMS\${APP_NAME}"
    CreateShortcut "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk" \
        "$INSTDIR\${APP_EXE}" "" \
        "$INSTDIR\${APP_EXE}" 0
    CreateShortcut "$SMPROGRAMS\${APP_NAME}\Disinstalla.lnk" \
        "$INSTDIR\Uninstall.exe"

    ; ── Registrazione Aggiungi/Rimuovi Programmi ─────────────
    WriteRegStr   HKLM "${UNINSTALL_KEY}" "DisplayName"     "${APP_NAME}"
    WriteRegStr   HKLM "${UNINSTALL_KEY}" "DisplayVersion"  "${APP_VERSION}"
    WriteRegStr   HKLM "${UNINSTALL_KEY}" "Publisher"       "${APP_PUBLISHER}"
    WriteRegStr   HKLM "${UNINSTALL_KEY}" "InstallLocation" "$INSTDIR"
    WriteRegStr   HKLM "${UNINSTALL_KEY}" "UninstallString" "$INSTDIR\Uninstall.exe"
    WriteRegStr   HKLM "${UNINSTALL_KEY}" "DisplayIcon"     "$INSTDIR\${APP_EXE}"
    WriteRegDWORD HKLM "${UNINSTALL_KEY}" "NoModify"        1
    WriteRegDWORD HKLM "${UNINSTALL_KEY}" "NoRepair"        1

    ; Calcola e registra dimensione installazione
    ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
    IntFmt $0 "0x%08X" $0
    WriteRegDWORD HKLM "${UNINSTALL_KEY}" "EstimatedSize" "$0"

    ; Scrivi uninstaller
    WriteUninstaller "$INSTDIR\Uninstall.exe"

SectionEnd

; ── Sezione opzionale: WebView2 Runtime ─────────────────────
; Se il PC del collega non ha Edge/WebView2 installato
Section /o "WebView2 Runtime (se non presente)" SecWebView2
    SetOutPath "$TEMP"
    NSISdl::download \
        "https://go.microsoft.com/fwlink/p/?LinkId=2124703" \
        "$TEMP\MicrosoftEdgeWebview2Setup.exe"
    ExecWait '"$TEMP\MicrosoftEdgeWebview2Setup.exe" /silent /install'
SectionEnd

; ────────────────────────────────────────────────────────────
; UNINSTALLER
; ────────────────────────────────────────────────────────────
Section "Uninstall"

    ; Rimuovi file (preserva update.json e configurazioni utente)
    RMDir /r "$INSTDIR\web"
    RMDir /r "$INSTDIR\runtimes"

    ; Rimuovi exe e dll ma NON update.json (mantieni impostazioni URL)
    Delete "$INSTDIR\${APP_EXE}"
    Delete "$INSTDIR\*.dll"
    Delete "$INSTDIR\*.json"  ; deps.json, runtimeconfig.json
    Delete "$INSTDIR\*.pdb"
    Delete "$INSTDIR\Uninstall.exe"

    ; Rimuovi update.json solo se l'utente vuole (chiedi)
    MessageBox MB_YESNO "Eliminare anche le impostazioni di aggiornamento (update.json)?" \
        IDNO +2
        Delete "$INSTDIR\update.json"

    RMDir "$INSTDIR"

    ; Rimuovi shortcut
    Delete "$DESKTOP\${APP_NAME}.lnk"
    Delete "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk"
    Delete "$SMPROGRAMS\${APP_NAME}\Disinstalla.lnk"
    RMDir  "$SMPROGRAMS\${APP_NAME}"

    ; Rimuovi chiave registro
    DeleteRegKey HKLM "${UNINSTALL_KEY}"

SectionEnd

; ── Descrizioni sezioni ─────────────────────────────────────
!insertmacro MUI_FUNCTION_DESCRIPTION_BEGIN
    !insertmacro MUI_DESCRIPTION_TEXT ${SecMain}    "File principali dell'applicazione Boggi Incentivi."
    !insertmacro MUI_DESCRIPTION_TEXT ${SecWebView2} "Runtime WebView2 (Microsoft Edge). Necessario se Edge non è installato."
!insertmacro MUI_FUNCTION_DESCRIPTION_END
