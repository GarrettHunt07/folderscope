!macro customInit
  ; Silently force-terminate any running instances of FolderScope to clear file locks
  nsExec::Exec 'taskkill /f /t /im "FolderScope.exe"'
!macroend
