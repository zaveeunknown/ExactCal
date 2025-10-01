[Setup]
AppName=ExactCal.25
AppVersion=1.0
DefaultDirName={pf}\ExactCal.25
DefaultGroupName=ExactCal.25
OutputDir=.
OutputBaseFilename=ExactCalInstaller
SetupIconFile=ExactCal25.ico
UninstallDisplayIcon={app}\ExactCalLauncher.exe
AppPublisher=VektorOrder
AppPublisherURL=https://VektorOrder.com

[Files]
; Copy everything to program folder
Source: "commission-server.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "ExactCalLauncher.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "config.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "public\*"; DestDir: "{app}\public"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "ExactCal25.ico"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
; Start Menu shortcut
Name: "{group}\ExactCal.25"; Filename: "{app}\ExactCalLauncher.exe"; IconFilename: "{app}\ExactCal25.ico"
; Desktop shortcut (this is the one you want 👇)
Name: "{commondesktop}\ExactCal.25"; Filename: "{app}\ExactCalLauncher.exe"; IconFilename: "{app}\ExactCal25.ico"

[Run]
; Optionally auto-run after install
Filename: "{app}\ExactCalLauncher.exe"; Description: "Launch ExactCal.25"; Flags: nowait postinstall skipifsilent
