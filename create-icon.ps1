# PowerShell script to create icon files from logo.png
Add-Type -AssemblyName System.Drawing

$sourcePath = "e:\projects\screen-time-clean\logo.png"
$iconDir = "e:\projects\screen-time-clean\assets\icons"
$trayIconPath = "$iconDir\tray-icon.png"
$icon256Path = "$iconDir\icon-256.png"
$icon32Path = "$iconDir\icon-32.png"

Write-Host "Creating icon files from logo.png..." -ForegroundColor Cyan

# Ensure directory exists
if (-not (Test-Path $iconDir)) {
    New-Item -ItemType Directory -Path $iconDir -Force | Out-Null
    Write-Host "Created directory: $iconDir" -ForegroundColor Gray
}

try {
    # Load the source image
    $image = [System.Drawing.Image]::FromFile($sourcePath)

    # Create 256x256 icon
    Write-Host "Creating 256x256 icon..." -ForegroundColor Yellow
    $icon256 = New-Object System.Drawing.Bitmap(256, 256)
    $graphics = [System.Drawing.Graphics]::FromImage($icon256)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.DrawImage($image, 0, 0, 256, 256)
    $icon256.Save($icon256Path, [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $icon256.Dispose()
    Write-Host "Created: $icon256Path" -ForegroundColor Green

    # Create 32x32 tray icon
    Write-Host "Creating 32x32 tray icon..." -ForegroundColor Yellow
    $trayIcon = New-Object System.Drawing.Bitmap(32, 32)
    $graphics = [System.Drawing.Graphics]::FromImage($trayIcon)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.DrawImage($image, 0, 0, 32, 32)
    $trayIcon.Save($trayIconPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $trayIcon.Save($icon32Path, [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $trayIcon.Dispose()
    Write-Host "Created: $trayIconPath" -ForegroundColor Green
    Write-Host "Created: $icon32Path" -ForegroundColor Green

    $image.Dispose()

    Write-Host ""
    Write-Host "Icon files created successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "To convert to .ico format for better compatibility:" -ForegroundColor Cyan
    Write-Host "1. Visit https://convertio.co/png-ico/" -ForegroundColor Gray
    Write-Host "2. Upload icon-256.png and convert to icon.ico" -ForegroundColor Gray
    Write-Host "3. Save the result to: assets/icons/icon.ico" -ForegroundColor Gray
    Write-Host ""
    Write-Host "For now, the app will use the PNG tray icon." -ForegroundColor Cyan

} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
