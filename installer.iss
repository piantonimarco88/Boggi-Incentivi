[Setup]
AppName=Boggi Incentivi
AppVersion=1.0
DefaultDirName={pf}\BoggiIncentivi
DefaultGroupName=Boggi Incentivi
OutputDir=.
OutputBaseFilename=BoggiIncentiviSetup
Compression=lzma
SolidCompression=yes

[Files]
Source: "bin\Release\net8.0-windows\win-x64\publish\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs

[Icons]
Name: "{group}\Boggi Incentivi"; Filename: "{app}\BoggiIncentivi.exe"
Name: "{commondesktop}\Boggi Incentivi"; Filename: "{app}\BoggiIncentivi.exe"

[Run]
Filename: "{app}\BoggiIncentivi.exe"; Description: "Avvia Boggi Incentivi"; Flags: nowait postinstall skipifsilent