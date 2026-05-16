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
