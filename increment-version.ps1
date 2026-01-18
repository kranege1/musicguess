# Script zum automatischen Speichern von Commit-Datum und -Zeit
$versionFile = "json/version.json"

if (Test-Path $versionFile) {
    # Hole aktuelles Datum und Uhrzeit
    $timestamp = Get-Date -Format "dd.MM.yyyy HH:mm"
    
    # Lade JSON und speichere Timestamp
    $json = Get-Content $versionFile -Raw | ConvertFrom-Json
    $json.version = $timestamp
    $json | ConvertTo-Json | Set-Content $versionFile -Encoding UTF8
    
    Write-Host "Version aktualisiert: $timestamp" -ForegroundColor Green
    
    # Füge zur Staging Area hinzu
    git add $versionFile
} else {
    Write-Host "version.json nicht gefunden!" -ForegroundColor Red
}
