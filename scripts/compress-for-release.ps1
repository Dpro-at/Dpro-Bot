# =====================================================================
# Dpro Bot - Compress for GitHub Release
# =====================================================================
# This script creates agent-player-files.zip for stub installer
# It excludes build artifacts and development files
# =====================================================================

Write-Host "================================================" -ForegroundColor Cyan
Write-Host " Dpro Bot - Release Compression Script" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Get the project root directory (parent of scripts folder)
$projectRoot = Split-Path -Parent $PSScriptRoot
Write-Host "[Step 1] Project root: $projectRoot" -ForegroundColor Yellow

# Output file
$outputFile = Join-Path $projectRoot "agent-player-files.zip"
Write-Host "[Step 2] Output file: $outputFile" -ForegroundColor Yellow

# Remove existing zip if it exists
if (Test-Path $outputFile) {
    Write-Host "[Step 3] Removing existing zip file..." -ForegroundColor Yellow
    Remove-Item $outputFile -Force
}

# Folders and files to EXCLUDE (same as bundler.rs)
$excludePatterns = @(
    "node_modules",
    ".next",
    ".data",
    ".git",
    "target",
    "installer",
    ".cache",
    "dist",
    ".turbo",
    "*.zip",
    ".gitignore",
    ".env",
    ".env.local",
    "*.log"
)

Write-Host "[Step 4] Building file list to compress..." -ForegroundColor Yellow
Write-Host "    Excluding:" -ForegroundColor Gray
foreach ($pattern in $excludePatterns) {
    Write-Host "      - $pattern" -ForegroundColor Gray
}

# Get all files in project root
$allFiles = Get-ChildItem -Path $projectRoot -Recurse -File

# Filter out excluded files
$filesToCompress = $allFiles | Where-Object {
    $file = $_
    $relativePath = $file.FullName.Substring($projectRoot.Length + 1)

    # Check if file matches any exclude pattern
    $shouldExclude = $false
    foreach ($pattern in $excludePatterns) {
        if ($relativePath -like "*$pattern*") {
            $shouldExclude = $true
            break
        }
    }

    -not $shouldExclude
}

$fileCount = $filesToCompress.Count
$totalSize = ($filesToCompress | Measure-Object -Property Length -Sum).Sum
$totalSizeMB = [math]::Round($totalSize / 1MB, 2)

Write-Host ""
Write-Host "[Step 5] Compression summary:" -ForegroundColor Yellow
Write-Host "    Files to compress: $fileCount" -ForegroundColor Green
Write-Host "    Total size: $totalSizeMB MB" -ForegroundColor Green
Write-Host ""

# Create zip file using .NET compression
Write-Host "[Step 6] Creating zip archive..." -ForegroundColor Yellow
Write-Host "    This may take 2-3 minutes..." -ForegroundColor Gray

Add-Type -AssemblyName System.IO.Compression.FileSystem

$zip = [System.IO.Compression.ZipFile]::Open($outputFile, [System.IO.Compression.ZipArchiveMode]::Create)

$progressCount = 0
foreach ($file in $filesToCompress) {
    $progressCount++

    # Print progress every 100 files
    if ($progressCount % 100 -eq 0) {
        $percent = [math]::Round(($progressCount / $fileCount) * 100)
        Write-Host "    Progress: $progressCount / $fileCount files ($percent%)" -ForegroundColor Cyan
    }

    # Get relative path for zip entry
    $relativePath = $file.FullName.Substring($projectRoot.Length + 1)

    # Add file to zip
    try {
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $file.FullName, $relativePath, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
    } catch {
        Write-Host "    ⚠️  Warning: Skipped $relativePath (error: $_)" -ForegroundColor Yellow
    }
}

$zip.Dispose()

# Get final zip size
$zipSize = (Get-Item $outputFile).Length
$zipSizeMB = [math]::Round($zipSize / 1MB, 2)

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host " ✅ Compression Complete!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Output file: $outputFile" -ForegroundColor Yellow
Write-Host "Compressed size: $zipSizeMB MB" -ForegroundColor Yellow
Write-Host "Original size: $totalSizeMB MB" -ForegroundColor Yellow
Write-Host "Compression ratio: $([math]::Round(($zipSize / $totalSize) * 100, 1))%" -ForegroundColor Yellow
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Go to: https://github.com/9mtm/Agent-Player/releases/new" -ForegroundColor White
Write-Host "  2. Tag: v1.3.0" -ForegroundColor White
Write-Host "  3. Title: Dpro Bot v1.3.0" -ForegroundColor White
Write-Host "  4. Upload: $outputFile" -ForegroundColor White
Write-Host "  5. Publish release" -ForegroundColor White
Write-Host ""
Write-Host "The stub installer will download from:" -ForegroundColor Cyan
Write-Host "  https://github.com/9mtm/Agent-Player/releases/download/1.3.0/agent-player-files.zip" -ForegroundColor White
Write-Host ""
