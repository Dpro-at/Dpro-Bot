# Girru v1.3.0 Release Checklist

Complete checklist for preparing and publishing the v1.3.0 release with installers.

## Table of Contents

- [Pre-Release Checklist](#pre-release-checklist)
- [Build Process](#build-process)
- [Code Signing](#code-signing)
- [Release Creation](#release-creation)
- [Post-Release Verification](#post-release-verification)
- [Rollback Plan](#rollback-plan)

---

## Pre-Release Checklist

### Code Quality

- [ ] **All tests passing:**
  ```bash
  cd packages/backend && pnpm test
  cd ../../ && pnpm test
  ```

- [ ] **Linting clean:**
  ```bash
  pnpm lint
  pnpm lint:fix  # if needed
  ```

- [ ] **TypeScript compilation:**
  ```bash
  pnpm build
  # No errors
  ```

- [ ] **Rust compilation:**
  ```bash
  cd installer && cargo check
  cargo build --release
  # No errors, only warnings acceptable
  ```

### Documentation

- [ ] **CHANGELOG.md updated** with v1.3.0 changes
- [ ] **README.md links working** (all 3 installer downloads)
- [ ] **docs/ files reviewed:**
  - [x] INSTALLATION.md
  - [x] DEPLOYMENT.md
  - [x] UPGRADING.md
  - [x] TESTING_CHECKLIST.md

### Version Numbers

- [ ] **package.json** version: `1.3.0`
- [ ] **packages/backend/package.json** version: `1.3.0`
- [ ] **packages/frontend/package.json** version: `1.3.0`
- [ ] **installer/Cargo.toml** version: `1.3.0`
- [ ] **installer/tauri.conf.json** version: `1.3.0`

### Security

- [ ] **No secrets in code** (API keys, passwords, tokens)
- [ ] **Dependencies audit:**
  ```bash
  pnpm audit
  pnpm audit fix  # if needed
  cargo audit  # in installer/
  ```

- [ ] **.gitignore includes:**
  - `.env`
  - `.data/`
  - `public/storage/`
  - `node_modules/`
  - `target/` (Rust)

---

## Build Process

### Environment Setup

**Required Tools:**
- Node.js 20 LTS
- pnpm 8.15+
- Rust 1.75+
- Tauri CLI 2.0+

**Platform Requirements:**
- **Windows:** Windows 10+ with Visual Studio 2022 Build Tools
- **Linux:** Ubuntu 22.04+ with build-essential
- **macOS:** Xcode 15+ with Command Line Tools

### Build Scripts

#### 1. Build Windows Installer (.msi)

**Platform:** Windows 10/11

```powershell
# 1. Clean previous builds
cd installer
cargo clean
Remove-Item -Recurse -Force target\release\bundle -ErrorAction SilentlyContinue

# 2. Build release
cargo tauri build --target x86_64-pc-windows-msvc

# 3. Verify output
$installer = "target\release\bundle\msi\agent-player-installer_1.3.0_x64_en-US.msi"
if (Test-Path $installer) {
    Write-Host "✅ Windows installer built: $installer"
    Write-Host "Size: $((Get-Item $installer).Length / 1MB) MB"
} else {
    Write-Host "❌ Build failed!"
    exit 1
}

# 4. Rename for release
Copy-Item $installer "agent-player-installer-1.3.0-win-x64.msi"
```

**Expected Output:**
- File: `agent-player-installer-1.3.0-win-x64.msi`
- Size: ~90 MB

---

#### 2. Build Linux Installer (.AppImage)

**Platform:** Ubuntu 22.04 LTS

```bash
# 1. Install dependencies
sudo apt update
sudo apt install -y libwebkit2gtk-4.1-dev \
  build-essential curl wget file libxdo-dev \
  libssl-dev libayatana-appindicator3-dev librsvg2-dev

# 2. Clean previous builds
cd installer
cargo clean
rm -rf target/release/bundle

# 3. Build release
cargo tauri build --target x86_64-unknown-linux-gnu

# 4. Verify output
installer="target/release/bundle/appimage/agent-player-installer_1.3.0_amd64.AppImage"
if [ -f "$installer" ]; then
    echo "✅ Linux installer built: $installer"
    echo "Size: $(du -h $installer | cut -f1)"
else
    echo "❌ Build failed!"
    exit 1
fi

# 5. Make executable and rename
chmod +x "$installer"
cp "$installer" "agent-player-installer-1.3.0-linux-x86_64.AppImage"
```

**Expected Output:**
- File: `agent-player-installer-1.3.0-linux-x86_64.AppImage`
- Size: ~95 MB

---

#### 3. Build macOS Installer (.dmg)

**Platform:** macOS 14+ (Sonoma)

```bash
# 1. Install Xcode Command Line Tools (if needed)
xcode-select --install

# 2. Clean previous builds
cd installer
cargo clean
rm -rf target/release/bundle

# 3. Build universal binary (x86_64 + ARM64)
cargo tauri build --target universal-apple-darwin

# 4. Verify output
installer="target/release/bundle/dmg/agent-player-installer_1.3.0_x64.dmg"
if [ -f "$installer" ]; then
    echo "✅ macOS installer built: $installer"
    echo "Size: $(du -h $installer | cut -f1)"
else
    echo "❌ Build failed!"
    exit 1
fi

# 5. Rename for release
cp "$installer" "agent-player-installer-1.3.0-macos-universal.dmg"
```

**Expected Output:**
- File: `agent-player-installer-1.3.0-macos-universal.dmg`
- Size: ~92 MB

---

### Generate Checksums

```bash
# Windows (PowerShell)
Get-FileHash agent-player-installer-1.3.0-win-x64.msi -Algorithm SHA256 | `
  Select-Object Hash | Out-File checksums.txt

# Linux/macOS
sha256sum agent-player-installer-1.3.0-win-x64.msi >> checksums.txt
sha256sum agent-player-installer-1.3.0-linux-x86_64.AppImage >> checksums.txt
sha256sum agent-player-installer-1.3.0-macos-universal.dmg >> checksums.txt
```

**Expected checksums.txt:**
```
abc123...  agent-player-installer-1.3.0-win-x64.msi
def456...  agent-player-installer-1.3.0-linux-x86_64.AppImage
ghi789...  agent-player-installer-1.3.0-macos-universal.dmg
```

---

## Code Signing

### Windows Code Signing (Authenticode)

**Requirements:**
- Code signing certificate (.pfx file)
- Certificate password
- Windows SDK (signtool.exe)

**Process:**

```powershell
# 1. Locate signtool
$signtool = "C:\Program Files (x86)\Windows Kits\10\bin\10.0.22621.0\x64\signtool.exe"

# 2. Sign the installer
& $signtool sign /f "path\to\certificate.pfx" `
  /p "certificate-password" `
  /t http://timestamp.digicert.com `
  /fd SHA256 `
  "agent-player-installer-1.3.0-win-x64.msi"

# 3. Verify signature
& $signtool verify /pa "agent-player-installer-1.3.0-win-x64.msi"
```

**Expected Output:**
```
Successfully signed: agent-player-installer-1.3.0-win-x64.msi
Number of files successfully Signed: 1
Number of warnings: 0
Number of errors: 0
```

**Certificate Providers:**
- DigiCert: https://www.digicert.com/code-signing/
- Sectigo: https://sectigo.com/ssl-certificates-tls/code-signing
- GlobalSign: https://www.globalsign.com/en/code-signing-certificate

**Cost:** ~$100-$400/year

---

### macOS Code Signing + Notarization

**Requirements:**
- Apple Developer ID certificate
- Xcode Command Line Tools
- App-specific password (for notarization)

**Process:**

```bash
# 1. Sign the app
codesign --force --deep --sign "Developer ID Application: Your Name (TEAM_ID)" \
  "agent-player-installer-1.3.0-macos-universal.dmg"

# 2. Verify signature
codesign -vvv --deep --strict "agent-player-installer-1.3.0-macos-universal.dmg"
spctl -a -vvv -t install "agent-player-installer-1.3.0-macos-universal.dmg"

# 3. Notarize with Apple
xcrun notarytool submit "agent-player-installer-1.3.0-macos-universal.dmg" \
  --apple-id "your@email.com" \
  --password "app-specific-password" \
  --team-id "TEAM_ID" \
  --wait

# 4. Staple notarization ticket
xcrun stapler staple "agent-player-installer-1.3.0-macos-universal.dmg"

# 5. Verify notarization
xcrun stapler validate "agent-player-installer-1.3.0-macos-universal.dmg"
```

**Expected Output:**
```
Successfully signed: agent-player-installer-1.3.0-macos-universal.dmg
The staple and validate action worked!
```

**Requirements:**
- Apple Developer Program membership: $99/year
- Create app-specific password: https://appleid.apple.com/

---

### Linux Code Signing (Optional)

Linux AppImages typically don't require code signing, but you can add GPG signature:

```bash
# 1. Create GPG signature
gpg --detach-sign --armor agent-player-installer-1.3.0-linux-x86_64.AppImage

# 2. Verify signature
gpg --verify agent-player-installer-1.3.0-linux-x86_64.AppImage.asc \
  agent-player-installer-1.3.0-linux-x86_64.AppImage
```

**Expected Output:**
- `agent-player-installer-1.3.0-linux-x86_64.AppImage.asc` (GPG signature file)

---

## Release Creation

### GitHub Release

#### 1. Create Git Tag

```bash
# 1. Commit all changes
git add .
git commit -m "Release v1.3.0: Rust installer with system tray and auto-updater"

# 2. Create annotated tag
git tag -a v1.3.0 -m "v1.3.0 Release

## What's New

- 🚀 One-click installer for Windows, Linux, and macOS
- 🎛️ System tray application with Start/Stop/Restart controls
- 🔄 Auto-updater from GitHub Releases
- 🐳 Docker deployment mode
- 💻 Direct Mode (localhost installation)
- 🌐 Server Mode (remote VPS deployment with SSH)
- 📝 Logs viewer with filtering and export
- 🗑️ Professional uninstaller with data cleanup options

## Installer Downloads

- Windows: agent-player-installer-1.3.0-win-x64.msi (90 MB)
- Linux: agent-player-installer-1.3.0-linux-x86_64.AppImage (95 MB)
- macOS: agent-player-installer-1.3.0-macos-universal.dmg (92 MB)

See CHANGELOG.md for full details."

# 3. Push tag (requires explicit user permission)
# git push origin v1.3.0
```

**⚠️ IMPORTANT:** Do NOT push without explicit user permission!

---

#### 2. GitHub Release Creation

**Manual Process:**

1. **Navigate to GitHub:**
   - Go to: https://github.com/Dpro-at/Girru/releases/new

2. **Fill Release Form:**
   - **Tag:** v1.3.0
   - **Title:** `Girru v1.3.0 - Professional Installer`
   - **Description:** Copy from CHANGELOG.md

3. **Upload Files:**
   - [ ] `agent-player-installer-1.3.0-win-x64.msi`
   - [ ] `agent-player-installer-1.3.0-linux-x86_64.AppImage`
   - [ ] `agent-player-installer-1.3.0-macos-universal.dmg`
   - [ ] `checksums.txt`
   - [ ] `agent-player-installer-1.3.0-linux-x86_64.AppImage.asc` (GPG signature, optional)

4. **Release Options:**
   - [ ] **Set as latest release** ✅
   - [ ] **Create a discussion for this release** ✅
   - [ ] **Pre-release** ⬜ (unchecked for stable release)

5. **Publish Release**

---

**Automated Process (GitHub CLI):**

```bash
# Install GitHub CLI (if not installed)
# Windows: winget install --id GitHub.cli
# Linux: sudo apt install gh
# macOS: brew install gh

# Authenticate
gh auth login

# Create release
gh release create v1.3.0 \
  --title "Girru v1.3.0 - Professional Installer" \
  --notes-file CHANGELOG.md \
  agent-player-installer-1.3.0-win-x64.msi \
  agent-player-installer-1.3.0-linux-x86_64.AppImage \
  agent-player-installer-1.3.0-macos-universal.dmg \
  checksums.txt
```

---

### Update README.md Download Links

After release is published, verify README.md links work:

- [ ] Windows download link works
- [ ] Linux download link works
- [ ] macOS download link works
- [ ] Checksums.txt download link works

**URL Format:**
```
https://github.com/Dpro-at/Girru/releases/download/v1.3.0/agent-player-installer-1.3.0-win-x64.msi
```

---

## Post-Release Verification

### Download & Install Test

**Test on Fresh VMs:**

#### Windows 11 Fresh VM

- [ ] Download installer from GitHub
- [ ] Verify checksum:
  ```powershell
  Get-FileHash agent-player-installer-1.3.0-win-x64.msi -Algorithm SHA256
  # Compare with checksums.txt
  ```
- [ ] Run installer (as Administrator)
- [ ] Complete 8-step wizard
- [ ] Verify installation:
  - [ ] Services running (check Task Manager)
  - [ ] System tray icon appears
  - [ ] Dashboard accessible: http://localhost:41521
  - [ ] Login works
  - [ ] Create test agent
  - [ ] Test chat functionality

#### Ubuntu 22.04 Fresh VM

- [ ] Download AppImage from GitHub
- [ ] Verify checksum:
  ```bash
  sha256sum -c checksums.txt
  ```
- [ ] Make executable and run:
  ```bash
  chmod +x agent-player-installer-1.3.0-linux-x86_64.AppImage
  ./agent-player-installer-1.3.0-linux-x86_64.AppImage
  ```
- [ ] Complete 8-step wizard
- [ ] Verify installation:
  - [ ] Services running: `systemctl status agent-player`
  - [ ] Dashboard accessible
  - [ ] All features working

#### macOS 14 Fresh VM

- [ ] Download DMG from GitHub
- [ ] Verify checksum:
  ```bash
  shasum -a 256 agent-player-installer-1.3.0-macos-universal.dmg
  ```
- [ ] Open DMG and drag to Applications
- [ ] Run installer
- [ ] Complete 8-step wizard
- [ ] Verify installation:
  - [ ] Services running: `launchctl list | grep agentplayer`
  - [ ] Dashboard accessible
  - [ ] All features working

---

### Update Test

**Test Auto-Updater:**

1. **Install v1.2.0** (previous version)
2. **Publish v1.3.0** to GitHub
3. **Right-click tray icon** → Check for Updates
4. **Verify:**
   - [ ] Update notification appears
   - [ ] Download starts
   - [ ] Installation prompts
   - [ ] Services restart
   - [ ] Version updated in dashboard

---

### Documentation Test

- [ ] INSTALLATION.md links all work
- [ ] DEPLOYMENT.md examples accurate
- [ ] UPGRADING.md migration steps correct
- [ ] TESTING_CHECKLIST.md covers all scenarios

---

## Rollback Plan

If critical issues discovered after release:

### 1. Quick Fix (Preferred)

**For minor bugs:**

- [ ] Fix issue in code
- [ ] Test thoroughly
- [ ] Create v1.3.1 release
- [ ] Update release notes to mention fix

### 2. Release Recall (Critical Issues Only)

**If installer is broken:**

- [ ] **Delete GitHub release** (not just mark as draft)
- [ ] **Delete tag:**
  ```bash
  git tag -d v1.3.0
  git push --delete origin v1.3.0
  ```
- [ ] **Revert commits:**
  ```bash
  git revert <commit-hash>
  ```
- [ ] **Fix issues**
- [ ] **Re-release as v1.3.0** (same version)

### 3. Deprecation Notice

**If major compatibility issue:**

- [ ] Mark release as **Pre-release** (not latest)
- [ ] Add warning banner to README:
  ```markdown
  ⚠️ **IMPORTANT:** v1.3.0 has known issues. Please use v1.2.0 until fixed.
  ```
- [ ] Pin issue to GitHub repository
- [ ] Post announcement in Discord/community

---

## Communication

### Announce Release

**Channels:**

1. **GitHub:**
   - [ ] Create discussion thread
   - [ ] Update README.md
   - [ ] Update project description

2. **Social Media:**
   - [ ] Twitter/X announcement
   - [ ] LinkedIn post
   - [ ] Reddit (r/opensource, r/programming)

3. **Community:**
   - [ ] Discord server announcement
   - [ ] Email newsletter (if applicable)
   - [ ] Blog post (if applicable)

**Announcement Template:**

```
🎉 Girru v1.3.0 is now available!

🚀 What's New:
- One-click installer for Windows, Linux, and macOS
- System tray application
- Auto-updater
- Three deployment modes (Docker/Direct/Server)
- Professional uninstaller

📥 Download now:
https://github.com/Dpro-at/Girru/releases/tag/v1.3.0

📖 Full changelog:
https://github.com/Dpro-at/Girru/blob/main/CHANGELOG.md
```

---

## Final Checklist

**Before Publishing:**

- [ ] All builds successful (Windows/Linux/macOS)
- [ ] All installers signed (Windows/macOS)
- [ ] Checksums generated and verified
- [ ] CHANGELOG.md complete and accurate
- [ ] README.md updated with download links
- [ ] All documentation reviewed
- [ ] Version numbers consistent across all files
- [ ] No secrets or API keys in code
- [ ] Tests passing
- [ ] Fresh VM testing completed (at least one platform)

**After Publishing:**

- [ ] GitHub release created successfully
- [ ] All assets uploaded and accessible
- [ ] Download links in README.md working
- [ ] Announcement posted to community channels
- [ ] Discord/social media announcement
- [ ] Monitor GitHub issues for bug reports

**Ongoing:**

- [ ] Monitor auto-updater working correctly
- [ ] Monitor installation success rate
- [ ] Respond to user issues within 24 hours
- [ ] Prepare v1.3.1 hotfix if needed

---

## Timeline

**Day 30 Schedule:**

- **Hour 1-2:** Build all installers (parallel if possible)
- **Hour 3:** Generate checksums
- **Hour 4-5:** Code signing (Windows + macOS)
- **Hour 5:** Create GitHub release (wait for user permission)
- **Hour 6:** Fresh VM testing (1 platform minimum)
- **Hour 7:** Announcement and monitoring

**Total Time:** ~7 hours

---

## Troubleshooting

### Build Fails

**Rust compilation errors:**
```bash
# Clean and rebuild
cargo clean
cargo update
cargo build --release
```

**Tauri build errors:**
```bash
# Update Tauri CLI
cargo install tauri-cli
# Rebuild
cargo tauri build
```

### Code Signing Fails

**Windows:**
- Verify certificate not expired
- Check timestamp server reachable
- Try alternative timestamp server: http://timestamp.sectigo.com

**macOS:**
- Verify Apple Developer ID valid
- Check Xcode Command Line Tools installed
- Notarization can take 5-30 minutes

### GitHub Release Upload Fails

**Large file issues:**
- GitHub limit: 2 GB per file (we're well under)
- Try GitHub CLI instead of web interface
- Check internet connection stable

---

**Release Complete!** 🎉

Girru v1.3.0 is now live with professional installers for all platforms.
