# Script zum automatischen Erhöhen der Versionsnummer
$versionFile = "version.json"

if (Test-Path $versionFile) {
    # Lade aktuelle Version
    $json = Get-Content $versionFile -Raw | ConvertFrom-Json
    $currentVersion = [decimal]$json.version
    
    # Erhöhe Version
    $newVersion = $currentVersion + 0.1
    $newVersion = [Math]::Round($newVersion, 1)
    
    # Speichere neue Version
    $json.version = $newVersion.ToString("0.0")
    $json | ConvertTo-Json | Set-Content $versionFile -Encoding UTF8
    
    Write-Host "Version erhöht: v$($json.version)" -ForegroundColor Green
    
    # Füge zur Staging Area hinzu
    git add $versionFile
} else {
    Write-Host "version.json nicht gefunden!" -ForegroundColor Red
}
