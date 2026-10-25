$root = Split-Path -Parent $PSScriptRoot
$output = "$root\agent-player-files.zip"

if (Test-Path $output) { Remove-Item $output -Force }

Write-Host "Compressing Dpro Bot (excluding node_modules, .next, etc.)..."

# Use robocopy to copy files (better exclusion support)
$temp = "$root\temp-release"
if (Test-Path $temp) {
    Write-Host "Cleaning old temp..."
    cmd /c "rmdir /s /q `"$temp`"" 2>$null
}

New-Item -ItemType Directory -Path $temp -Force | Out-Null

# Copy with robocopy (faster + better exclusions)
Write-Host "Copying files..."
robocopy "$root" "$temp" /E /XD node_modules .next .git target installer .cache dist .turbo .data .github temp-release /XF *.zip *.log /NFL /NDL /NJH /NJS | Out-Null

# Compress
Write-Host "Creating zip..."
Compress-Archive -Path "$temp\*" -DestinationPath $output -CompressionLevel Optimal

# Cleanup
cmd /c "rmdir /s /q `"$temp`"" 2>$null

$size = [math]::Round((Get-Item $output).Length / 1MB, 2)
Write-Host "Done! agent-player-files.zip - $size MB"
