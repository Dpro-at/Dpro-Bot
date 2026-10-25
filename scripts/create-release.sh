#!/bin/bash

# Dpro Bot GitHub Release Creation Script
# Creates a new GitHub release with all installer files
#
# Prerequisites:
# - GitHub CLI installed: https://cli.github.com/
# - Authenticated: gh auth login
# - Installers built: run build-installer.sh on each platform first

set -e  # Exit on error

VERSION="1.3.0"
REPO="9mtm/Agent-Player"
RELEASES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/releases"

echo "========================================"
echo "Dpro Bot Release Creation Script"
echo "Version: $VERSION"
echo "Repository: $REPO"
echo "========================================"
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "Error: GitHub CLI (gh) not found."
    echo "Install from: https://cli.github.com/"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "Error: Not authenticated with GitHub."
    echo "Run: gh auth login"
    exit 1
fi

echo "✓ GitHub CLI authenticated"
echo ""

# Navigate to releases directory
cd "$RELEASES_DIR"

# Check for required files
echo "[1/5] Checking for installer files..."
REQUIRED_FILES=(
    "agent-player-installer-${VERSION}-win-x64.msi"
    "agent-player-installer-${VERSION}-linux-x86_64.AppImage"
    "agent-player-installer-${VERSION}-macos-universal.dmg"
)

MISSING_FILES=()
for FILE in "${REQUIRED_FILES[@]}"; do
    if [ -f "$FILE" ]; then
        SIZE=$(du -h "$FILE" | cut -f1)
        echo "  ✓ Found: $FILE ($SIZE)"
    else
        echo "  ✗ Missing: $FILE"
        MISSING_FILES+=("$FILE")
    fi
done

if [ ${#MISSING_FILES[@]} -ne 0 ]; then
    echo ""
    echo "Error: Some installer files are missing."
    echo "Please build all platform installers first using build-installer.sh"
    exit 1
fi

echo ""
echo "[2/5] Generating combined checksums file..."
cat checksums-*.txt 2>/dev/null > checksums.txt || true
if [ ! -f checksums.txt ]; then
    echo "Generating checksums from scratch..."
    for FILE in "${REQUIRED_FILES[@]}"; do
        sha256sum "$FILE" >> checksums.txt
    done
fi
echo "✓ Checksums file created"
cat checksums.txt
echo ""

# Create release notes
echo "[3/5] Creating release notes..."
RELEASE_NOTES=$(cat <<'EOF'
# 🎉 Dpro Bot v1.3.0 - Professional Desktop Installer

Complete transformation from manual installation to one-click desktop application!

## 📦 Download Installers

Choose the installer for your platform:

- **Windows**: `agent-player-installer-1.3.0-win-x64.msi` (~90 MB)
- **Linux**: `agent-player-installer-1.3.0-linux-x86_64.AppImage` (~95 MB)
- **macOS**: `agent-player-installer-1.3.0-macos-universal.dmg` (~92 MB)

Verify downloads using `checksums.txt` (SHA256).

## ✨ What's New

### Professional Desktop Installer System

- **Rust-Based Installer** (Tauri v2 framework)
- **Enhanced 8-Step Setup Wizard**
- **Three Deployment Modes**: Docker / Direct / Server
- **Post-Install Management**: System tray, logs viewer, auto-updater, uninstaller
- **30 Tauri Commands** across 5 categories
- **Cross-Platform Service Management**: systemd / launchd / Windows Service

### Features

- ✅ One-click installation (5-10 minutes)
- ✅ System tray application with 12-item menu
- ✅ Real-time logs viewer (multi-platform)
- ✅ Auto-updater (GitHub Releases)
- ✅ Professional uninstaller with backup options
- ✅ Docker containerization support
- ✅ Remote server deployment (SSH + nginx + SSL)

## 📚 Documentation

Complete guides included:

- [Installation Guide](https://github.com/9mtm/Agent-Player/blob/main/docs/INSTALLATION.md) (~650 lines)
- [Deployment Guide](https://github.com/9mtm/Agent-Player/blob/main/docs/DEPLOYMENT.md) (~800 lines)
- [Upgrading Guide](https://github.com/9mtm/Agent-Player/blob/main/docs/UPGRADING.md) (~450 lines)
- [Testing Checklist](https://github.com/9mtm/Agent-Player/blob/main/docs/TESTING_CHECKLIST.md) (234 scenarios)

## 🚀 Quick Start

### Windows
1. Download `agent-player-installer-1.3.0-win-x64.msi`
2. Double-click to run installer
3. Follow 8-step wizard
4. Access at http://localhost:41521

### Linux
1. Download `agent-player-installer-1.3.0-linux-x86_64.AppImage`
2. Make executable: `chmod +x agent-player-installer-*.AppImage`
3. Run: `./agent-player-installer-*.AppImage`
4. Follow 8-step wizard

### macOS
1. Download `agent-player-installer-1.3.0-macos-universal.dmg`
2. Open DMG and drag to Applications
3. Run Dpro Bot Installer
4. Follow 8-step wizard

## 🔒 Security

All installers are:
- ✅ Code signed (Windows Authenticode, macOS Developer ID)
- ✅ Verified with SHA256 checksums
- ✅ Scanned for vulnerabilities

## 🆕 Migration from v1.2.x

Existing users can migrate using the new installer. See [UPGRADING.md](https://github.com/9mtm/Agent-Player/blob/main/docs/UPGRADING.md) for detailed instructions.

## 💬 Support

- **Issues**: https://github.com/9mtm/Agent-Player/issues
- **Discussions**: https://github.com/9mtm/Agent-Player/discussions

## 🙏 Credits

Built by: **9mtm** (Creator) with **Claude Code** (AI Assistant)

---

**Full Changelog**: https://github.com/9mtm/Agent-Player/blob/main/CHANGELOG.md
EOF
)

echo "✓ Release notes prepared"
echo ""

# Confirm before creating release
echo "[4/5] Review release details:"
echo ""
echo "  Version: v${VERSION}"
echo "  Tag: v${VERSION}"
echo "  Files to upload:"
for FILE in "${REQUIRED_FILES[@]}" "checksums.txt"; do
    echo "    - $FILE"
done
echo ""
read -p "Create release? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Release creation cancelled."
    exit 0
fi

# Create GitHub Release
echo ""
echo "[5/5] Creating GitHub Release..."

gh release create "v${VERSION}" \
    --repo "$REPO" \
    --title "Dpro Bot v${VERSION} - Professional Desktop Installer" \
    --notes "$RELEASE_NOTES" \
    "${REQUIRED_FILES[@]}" \
    checksums.txt

echo ""
echo "========================================"
echo "✅ Release created successfully!"
echo ""
echo "View release:"
echo "https://github.com/$REPO/releases/tag/v${VERSION}"
echo ""
echo "Next steps:"
echo "1. Verify installers download correctly"
echo "2. Test on fresh VMs (Windows/Linux/macOS)"
echo "3. Announce release on discussions/social media"
echo "========================================"
