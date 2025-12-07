; Stable Studio Installer Script
; Requires NSIS 3.0+

;--------------------------------
; General

  ; Name and file
  Name "Stable Studio"
  OutFile "Stable_Studio_Setup.exe" ; THIS NAME MUST MATCH BUILDER.JS
  Unicode True

  ; Installation Directory
  InstallDir "$PROGRAMFILES64\Stable Studio"
  
  ; Registry key to check for directory (so if you install again, it will overwrite the old one)
  InstallDirRegKey HKLM "Software\StableStudio" "Install_Dir"

  ; Request application privileges for Windows Vista+
  RequestExecutionLevel admin

;--------------------------------
; Interface Settings

  !include "MUI2.nsh"

  ; Icons
  !define MUI_ICON "resources\assets\icons\icon.ico"
  !define MUI_UNICON "resources\assets\icons\icon.ico"

  ; UI Pages
  !insertmacro MUI_PAGE_WELCOME
  !insertmacro MUI_PAGE_LICENSE "Stable-Diffusion_LICENSE.md"
  !insertmacro MUI_PAGE_DIRECTORY
  !insertmacro MUI_PAGE_INSTFILES
  !insertmacro MUI_PAGE_FINISH

  ; Uninstaller Pages
  !insertmacro MUI_UNPAGE_WELCOME
  !insertmacro MUI_UNPAGE_CONFIRM
  !insertmacro MUI_UNPAGE_INSTFILES
  !insertmacro MUI_UNPAGE_FINISH

  ; Languages
  !insertmacro MUI_LANGUAGE "English"

;--------------------------------
; Installer Sections

Section "Stable Studio (Required)" SecMain

  SetOutPath "$INSTDIR"
  
  ; 1. Copy the Neutralino App (Built by neu build)
  ; The builder ensures the folder is named 'Stable-Studio-Installer' inside 'dist'
  File /r "dist\Stable-Studio-Installer\*"

  ; 2. Copy the Vulkan Backend
  SetOutPath "$INSTDIR\backend"
  File /r "backend\*"
  
  ; 3. Create Empty Data Directories (Reset OutPath to Root)
  SetOutPath "$INSTDIR"
  
  ; Create directories if they don't exist
  CreateDirectory "$INSTDIR\models"
  CreateDirectory "$INSTDIR\outputs"
  CreateDirectory "$INSTDIR\temp"
  
  ; 4. Store installation folder in registry
  WriteRegStr HKLM "Software\StableStudio" "Install_Dir" "$INSTDIR"
  
  ; 5. Create Uninstaller
  WriteUninstaller "$INSTDIR\uninstall.exe"

  ; 6. Create Start Menu Shortcuts
  CreateDirectory "$SMPROGRAMS\Stable Studio"
  CreateShortcut "$SMPROGRAMS\Stable Studio\Stable Studio.lnk" "$INSTDIR\Stable-Studio-Installer.exe" "" "$INSTDIR\resources\assets\icons\icon.ico"
  CreateShortcut "$SMPROGRAMS\Stable Studio\Uninstall.lnk" "$INSTDIR\uninstall.exe"

  ; 7. Create Desktop Shortcut
  CreateShortcut "$DESKTOP\Stable Studio.lnk" "$INSTDIR\Stable-Studio-Installer.exe" "" "$INSTDIR\resources\assets\icons\icon.ico"

SectionEnd

;--------------------------------
; Uninstaller Section

Section "Uninstall"

  ; 1. Remove Registry Keys
  DeleteRegKey HKLM "Software\StableStudio"

  ; 2. Remove Files (Be careful not to delete user outputs/models if they want to keep them)
  ; Removing the core app files
  Delete "$INSTDIR\Stable-Studio-Installer.exe"
  Delete "$INSTDIR\resources.neu"
  Delete "$INSTDIR\WebView2Loader.dll"
  Delete "$INSTDIR\uninstall.exe"
  
  ; Remove Backend
  RMDir /r "$INSTDIR\backend"
  RMDir /r "$INSTDIR\resources"
  
  ; Remove Shortcuts
  Delete "$SMPROGRAMS\Stable Studio\Stable Studio.lnk"
  Delete "$SMPROGRAMS\Stable Studio\Uninstall.lnk"
  RMDir "$SMPROGRAMS\Stable Studio"
  Delete "$DESKTOP\Stable Studio.lnk"

  ; 3. Cleanup Folders (Only if empty, to preserve user generated content)
  RMDir "$INSTDIR\temp"
  RMDir "$INSTDIR"

SectionEnd