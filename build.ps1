Rename-Item -Path ".\bin\Debug\netcoreapp3.1\publish\app_offline.html" -NewName "app_offline.htm"

Start-Sleep -Seconds 1.5

dotnet publish

Rename-Item -Path ".\bin\Debug\netcoreapp3.1\publish\app_offline.htm" -NewName "app_offline.html"