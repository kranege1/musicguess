# Script zum automatischen Erhöhen der Versionsnummer
$versionFile = "version.json"

if (Test-Path $versionFile) {
    # Lade aktuelle Version
    $json = Get-Content $versionFile -Raw | ConvertFrom-Json
    $currentVersion = [decimal]($json.version -replace ',', '.')
    
    # Erhöhe Version um 1
    $newVersion = [int]$currentVersion + 1
    
    # Speichere neue Version
    $json.version = $newVersion.ToString()
    $json | ConvertTo-Json | Set-Content $versionFile -Encoding UTF8
    
    Write-Host "Version erhoeht: v$($json.version)" -ForegroundColor Green
    
    # Füge zur Staging Area hinzu
    git add $versionFile
} else {
    Write-Host "version.json nicht gefunden!" -ForegroundColor Red
}
