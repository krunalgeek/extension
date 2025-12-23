# Load Chrome Extension for Development
# Usage: .\load-extension.ps1

$EXTENSION_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Exam Proctor Helper Extension v1.1.0" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Extension Directory: " -NoNewline
Write-Host "$EXTENSION_DIR" -ForegroundColor Yellow
Write-Host ""
Write-Host "To load this extension in Chrome:" -ForegroundColor Green
Write-Host ""
Write-Host "1. Open Chrome and navigate to:"
Write-Host "   chrome://extensions" -ForegroundColor Yellow
Write-Host ""
Write-Host "2. Enable 'Developer mode' (toggle in top-right)"
Write-Host ""
Write-Host "3. Click 'Load unpacked'"
Write-Host ""
Write-Host "4. Select this directory:"
Write-Host "   $EXTENSION_DIR" -ForegroundColor Yellow
Write-Host ""
Write-Host "5. Verify extension appears with:"
Write-Host "   - Name: Exam Proctor Helper"
Write-Host "   - Version: 1.1.0"
Write-Host "   - Status: Enabled"
Write-Host ""
Write-Host "6. (Optional) Pin extension to toolbar:"
Write-Host "   - Click puzzle icon"
Write-Host "   - Pin 'Exam Proctor Helper'"
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if manifest.json exists
if (-not (Test-Path "$EXTENSION_DIR\manifest.json")) {
    Write-Host "❌ ERROR: manifest.json not found!" -ForegroundColor Red
    Write-Host "   Make sure you're in the extension directory" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Extension files validated" -ForegroundColor Green
Write-Host ""

# Display file list
Write-Host "Extension files:" -ForegroundColor Cyan
Get-ChildItem "$EXTENSION_DIR" -Filter "*.json" | ForEach-Object {
    Write-Host "   $($_.Name) ($([math]::Round($_.Length/1KB, 2)) KB)" -ForegroundColor White
}
Get-ChildItem "$EXTENSION_DIR" -Filter "*.js" | ForEach-Object {
    Write-Host "   $($_.Name) ($([math]::Round($_.Length/1KB, 2)) KB)" -ForegroundColor White
}
Get-ChildItem "$EXTENSION_DIR" -Filter "*.html" | ForEach-Object {
    Write-Host "   $($_.Name) ($([math]::Round($_.Length/1KB, 2)) KB)" -ForegroundColor White
}
Write-Host ""

Write-Host "After loading, test with:" -ForegroundColor Green
Write-Host "  1. Open http://localhost:4200"
Write-Host "  2. Open DevTools Console (F12)"
Write-Host "  3. Run: " -NoNewline
Write-Host "window.postMessage({target:'proctor-ext',type:'PING'},'*')" -ForegroundColor Yellow
Write-Host "  4. Check for PING_RES response"
Write-Host ""
Write-Host "For configuration, click the extension icon in Chrome toolbar" -ForegroundColor Cyan
Write-Host ""

# Optional: Open Chrome extensions page
$openChrome = Read-Host "Open chrome://extensions now? (y/n)"
if ($openChrome -eq 'y' -or $openChrome -eq 'Y') {
    Start-Process "chrome://extensions"
    Write-Host ""
    Write-Host "Chrome extensions page opened!" -ForegroundColor Green
    Write-Host "Enable Developer mode and click 'Load unpacked'" -ForegroundColor Yellow
    Write-Host ""
}
