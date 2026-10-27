# Girru Build Scripts

This directory contains scripts for building and releasing Girru installers.

## 📁 Available Scripts

### 1. `build-installer.sh` (Linux/macOS)
Builds platform-specific installer on Linux or macOS.

**Usage:**
```bash
chmod +x scripts/build-installer.sh
./scripts/build-installer.sh
```

**Output:**
- Linux: `releases/agent-player-installer-1.3.0-linux-x86_64.AppImage`
- macOS: `releases/agent-player-installer-1.3.0-macos-universal.dmg`

### 2. `build-installer.ps1` (Windows)
Builds Windows .msi installer.

**Usage:**
```powershell
.\scripts\build-installer.ps1
```

**Output:**
- Windows: `releases\agent-player-installer-1.3.0-win-x64.msi`

### 3. `create-release.sh`
Creates GitHub Release with all platform installers.

**Prerequisites:**
- All 3 platform installers built
- GitHub CLI installed and authenticated
- Sufficient repository permissions

**Usage:**
```bash
chmod +x scripts/create-release.sh
./scripts/create-release.sh
```

## 🛠️ Prerequisites

### All Platforms
- **Rust 1.70+**: Install from [rustup.rs](https://rustup.rs/)
- **Tauri CLI**: Install with `cargo install tauri-cli`

### Windows
- **Visual Studio 2019+** or **Build Tools for Visual Studio**
- **WiX Toolset 3.11+**: Download from [wixtoolset.org](https://wixtoolset.org/releases/)

### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install -y libwebkit2gtk-4.1-dev \
    build-essential \
    curl \
    wget \
    file \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev
```

### Linux (Fedora/RHEL)
```bash
sudo dnf install -y webkit2gtk4.1-devel \
    openssl-devel \
    curl \
    wget \
    file \
    gtk3-devel \
    libappindicator-gtk3-devel \
    librsvg2-devel
```

### macOS
```bash
xcode-select --install
```

## 📦 Build Process

### Step 1: Build Installers (Per Platform)

**On Windows machine:**
```powershell
.\scripts\build-installer.ps1
```

**On Linux machine:**
```bash
./scripts/build-installer.sh
```

**On macOS machine:**
```bash
./scripts/build-installer.sh
```

### Step 2: Collect All Installers

After building on each platform, collect all files:
```
releases/
├── agent-player-installer-1.3.0-win-x64.msi
├── agent-player-installer-1.3.0-linux-x86_64.AppImage
├── agent-player-installer-1.3.0-macos-universal.dmg
├── checksums-Windows.txt
├── checksums-Linux.txt
└── checksums-macOS.txt
```

### Step 3: Code Signing (Optional but Recommended)

#### Windows
```powershell
# Using signtool.exe with certificate
signtool sign /f certificate.pfx /p password /tr http://timestamp.digicert.com /td sha256 /fd sha256 agent-player-installer-1.3.0-win-x64.msi
```

**Certificate Providers:**
- **DigiCert**: ~$400/year (EV Code Signing)
- **Sectigo**: ~$200/year (Standard Code Signing)
- **GlobalSign**: ~$250/year

#### macOS
```bash
# Sign the app
codesign --deep --force --verify --verbose --sign "Developer ID Application: Your Name (TEAM_ID)" agent-player-installer-1.3.0-macos-universal.dmg

# Notarize with Apple
xcrun notarytool submit agent-player-installer-1.3.0-macos-universal.dmg --apple-id your@email.com --team-id TEAM_ID --password app-specific-password --wait

# Staple notarization ticket
xcrun stapler staple agent-player-installer-1.3.0-macos-universal.dmg
```

**Apple Developer Program:** $99/year

#### Linux (Optional GPG Signing)
```bash
# Create detached signature
gpg --armor --detach-sign agent-player-installer-1.3.0-linux-x86_64.AppImage

# Verify signature
gpg --verify agent-player-installer-1.3.0-linux-x86_64.AppImage.asc
```

### Step 4: Create GitHub Release

```bash
# Make sure all files are in releases/ directory
ls -lh releases/

# Create release
./scripts/create-release.sh
```

## 🔍 Verification

### Windows
```powershell
# Verify signature
Get-AuthenticodeSignature releases\agent-player-installer-1.3.0-win-x64.msi

# Verify checksum
$hash = Get-FileHash releases\agent-player-installer-1.3.0-win-x64.msi -Algorithm SHA256
Write-Host $hash.Hash.ToLower()
```

### Linux/macOS
```bash
# Verify checksum
sha256sum releases/agent-player-installer-1.3.0-linux-x86_64.AppImage
# or
shasum -a 256 releases/agent-player-installer-1.3.0-macos-universal.dmg

# Compare with checksums.txt
cat releases/checksums.txt
```

## 🧪 Testing

After building, test on **fresh VMs** before release:

1. **Windows**: Fresh Windows 10/11 VM
2. **Linux**: Fresh Ubuntu 22.04/24.04 VM
3. **macOS**: Fresh macOS 14/15 VM

**Test checklist:**
- ✅ Installer runs without errors
- ✅ All 8 wizard steps complete
- ✅ Services start successfully
- ✅ Dashboard accessible at http://localhost:41521
- ✅ System tray icon appears
- ✅ Auto-start on boot works
- ✅ Uninstaller removes everything

See [docs/TESTING_CHECKLIST.md](../docs/TESTING_CHECKLIST.md) for full testing guide.

## 🐛 Troubleshooting

### Rust/Cargo Not Found
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

### Tauri CLI Build Fails
```bash
# Update Rust
rustup update

# Clean build cache
cd installer
cargo clean
cargo update

# Retry build
cargo tauri build
```

### WiX Toolset Error (Windows)
```powershell
# Add WiX to PATH
$env:PATH += ";${env:ProgramFiles(x86)}\WiX Toolset v3.11\bin"

# Verify
candle.exe -?
```

### webkit2gtk Missing (Linux)
```bash
# Ubuntu/Debian
sudo apt install -y libwebkit2gtk-4.1-dev

# Fedora
sudo dnf install -y webkit2gtk4.1-devel
```

## 📚 Documentation

- [Installation Guide](../docs/INSTALLATION.md) - End-user installation instructions
- [Deployment Guide](../docs/DEPLOYMENT.md) - Production deployment strategies
- [Release Checklist](../docs/RELEASE_CHECKLIST.md) - Complete release workflow
- [Testing Checklist](../docs/TESTING_CHECKLIST.md) - Comprehensive testing guide

## 🤝 Contributing

If you improve these scripts, please:
1. Test on your platform
2. Update this README
3. Submit a pull request

## 📄 License

MIT License - Same as Girru
