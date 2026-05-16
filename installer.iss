; ─────────────────────────────────────────────────────────────────────────
;  Boggi Milano — Sistema Incentivazione Rete Vendita
;  Installer Inno Setup (produce BoggiIncentivi_Setup.exe)
;
;  Build con:    iscc installer.iss
;  Output:       BoggiIncentivi_Setup.exe (~60 MB) in questa cartella.
;  Richiede:     bin\Release\net8.0-windows\win-x64\publish\ gia` prodotto via
;                dotnet publish -c Release -r win-x64 --self-contained true
;                                -p:PublishSingleFile=true
; ─────────────────────────────────────────────────────────────────────────

[Setup]
AppId={{B0664912-09EE-4501-A6CC-BB6E62695F0F}
AppName=Boggi Incentivi
AppVersion=8.31
AppVerName=Boggi Incentivi 8.31
AppPublisher=Boggi Milano
AppPublisherURL=https://www.boggi.com/
AppSupportURL=https://www.boggi.com/
DefaultDirName={autopf}\BoggiIncentivi
DefaultGroupName=Boggi Incentivi
OutputDir=.
OutputBaseFilename=BoggiIncentivi_Setup
SetupIconFile=boggi.ico
UninstallDisplayIcon={app}\BoggiIncentivi.exe
UninstallDisplayName=Boggi Incentivi
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
PrivilegesRequiredOverridesAllowed=dialog
DisableProgramGroupPage=yes
DisableReadyPage=no
CloseApplications=yes
RestartApplications=no
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible

[Languages]
Name: "italian"; MessagesFile: "compiler:Languages\Italian.isl"

[Tasks]
Name: "desktopicon"; Description: "Crea collegamento sul Desktop"; GroupDescription: "Collegamenti aggiuntivi:"; Flags: checkedonce

[Files]
; Tutta la cartella publish del Release self-contained
Source: "bin\Release\net8.0-windows\win-x64\publish\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\Boggi Incentivi"; Filename: "{app}\BoggiIncentivi.exe"
Name: "{group}\Disinstalla Boggi Incentivi"; Filename: "{uninstallexe}"
Name: "{autodesktop}\Boggi Incentivi"; Filename: "{app}\BoggiIncentivi.exe"; Tasks: desktopicon

[Run]
Filename: "{app}\BoggiIncentivi.exe"; Description: "Avvia Boggi Incentivi"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
; Pulisce eventuali file orfani in app dir (gli output utente in %LOCALAPPDATA% NON vengono toccati di proposito)
Type: filesandordirs; Name: "{app}\runtimes"

[Code]
// ────────────────────────────────────────────────────────────────────────
//  Upgrade automatico: rileva una versione precedente di Boggi Incentivi
//  e la disinstalla silently prima di installare la nuova.
//
//  Il vecchio installer (pre v8.31) registrava la chiave registry usando
//  AppName come fallback: "Boggi Incentivi_is1".
//  Il nuovo usa il GUID: "{B0664912-09EE-4501-A6CC-BB6E62695F0F}_is1".
//  Quindi non c'e` collisione tra i due.
//
//  Fallback per casi non standard: cerca l'uninstaller nel path
//  tipico C:\Program Files (x86)\BoggiIncentivi\unins000.exe.
//
//  I dati utente in %LOCALAPPDATA%\BoggiIncentivi\ NON vengono toccati.
// ────────────────────────────────────────────────────────────────────────

function GetUninstallString(const appKey: String): String;
var
  fullPath: String;
  uninstStr: String;
begin
  fullPath := 'Software\Microsoft\Windows\CurrentVersion\Uninstall\' + appKey;
  uninstStr := '';
  // Prova HKLM 64-bit
  if not RegQueryStringValue(HKLM, fullPath, 'UninstallString', uninstStr) then
    // Fallback HKLM 32-bit (per app x86 su Win64)
    RegQueryStringValue(HKLM32, fullPath, 'UninstallString', uninstStr);
  Result := uninstStr;
end;

function InitializeSetup(): Boolean;
var
  oldUninst: String;
  pfx86Uninst: String;
  resultCode: Integer;
begin
  Result := True;
  // 1. Cerca vecchia install via registry (chiave fallback AppName)
  oldUninst := GetUninstallString('Boggi Incentivi_is1');
  // 2. Fallback: cerca uninstaller nel path tipico Program Files (x86)
  if oldUninst = '' then
  begin
    pfx86Uninst := ExpandConstant('{commonpf32}\BoggiIncentivi\unins000.exe');
    if FileExists(pfx86Uninst) then
      oldUninst := pfx86Uninst;
  end;
  if oldUninst <> '' then
  begin
    oldUninst := RemoveQuotes(oldUninst);
    Log('Vecchia installazione rilevata: ' + oldUninst);
    // Esegui in silent, aspetta che termini
    Exec(oldUninst, '/VERYSILENT /SUPPRESSMSGBOXES /NORESTART', '', SW_HIDE,
         ewWaitUntilTerminated, resultCode);
    Log('Uninstall precedente terminato, exit code: ' + IntToStr(resultCode));
    // Piccola pausa per rilascio handle file
    Sleep(800);
  end;
end;
