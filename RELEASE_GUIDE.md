# 🚀 Girru - Automated Release Guide

## Overview

This project uses **fully automated CI/CD** for releases. Just push a version tag and everything happens automatically:

```bash
git tag v1.3.0
git push origin v1.3.0
```

**That's it!** 🎉 GitHub Actions will:
1. ✅ Compress application files → `agent-player-files.zip`
2. ✅ Build Windows installer → `.msi`
3. ✅ Build Linux installer → `.AppImage`
4. ✅ Build macOS installer → `.dmg`
5. ✅ Generate SHA256 checksums → `checksums.txt`
6. ✅ Create GitHub Release with all files
7. ✅ Publish release publicly

**Zero manual work** - professional standard like VSCode, Chrome, Firefox.

---

## 📋 Release Workflow

### Step 1: Prepare Your Code
```bash
# Make sure all changes are committed
git status

# Verify everything works
cd C:\MAMP\htdocs\agent\agent_player
pnpm dev  # Test frontend
cd packages\backend
pnpm dev  # Test backend
```

### Step 2: Update Version Number

Update version in these files:
- `package.json` → `"version": "1.3.0"`
- `packages/backend/package.json` → `"version": "1.3.0"`
- `installer/Cargo.toml` → `version = "1.3.0"`
- `installer/ui/dist/index.html` → `version: '1.3.0'` (in download call)

```bash
# Quick update all files
$version = "1.3.0"
(Get-Content package.json) -replace '"version": ".*"', "`"version`": `"$version`"" | Set-Content package.json
(Get-Content packages/backend/package.json) -replace '"version": ".*"', "`"version`": `"$version`"" | Set-Content packages/backend/package.json
(Get-Content installer/Cargo.toml) -replace 'version = ".*"', "version = `"$version`"" | Set-Content installer/Cargo.toml
```

### Step 3: Create CHANGELOG Entry

Add to `CHANGELOG.md`:
```markdown
## [1.3.0] - 2026-03-21

### Added
- New feature X
- Improvement Y

### Fixed
- Bug fix Z
```

### Step 4: Commit Version Bump
```bash
git add -A
git commit -m "chore: bump version to 1.3.0"
git push origin main
```

### Step 5: Create Release Tag
```bash
# Create annotated tag
git tag -a v1.3.0 -m "Release v1.3.0"

# Push tag to GitHub (this triggers the automation!)
git push origin v1.3.0
```

### Step 6: Watch the Magic Happen ✨

Go to: https://github.com/Dpro-at/Girru/actions

You'll see 5 jobs running in parallel:
1. 🗜️ **Create Application Files ZIP** (Windows runner) - ~2 min
2. 🪟 **Build Windows Installer** (Windows runner) - ~5 min
3. 🐧 **Build Linux AppImage** (Ubuntu runner) - ~8 min
4. 🍎 **Build macOS DMG** (macOS runner) - ~7 min
5. 📦 **Create GitHub Release** (after others complete) - ~1 min

**Total time**: ~10-12 minutes for everything to complete.

### Step 7: Verify Release

Once complete, go to: https://github.com/Dpro-at/Girru/releases/tag/v1.3.0

You should see:
- ✅ `agent-player-installer-1.3.0-win-x64.msi` (~3 MB)
- ✅ `agent-player-installer-1.3.0-linux-x86_64.AppImage` (~80 MB)
- ✅ `agent-player-installer-1.3.0-macos-x64.dmg` (~3 MB)
- ✅ `agent-player-files.zip` (~90 MB)
- ✅ `checksums.txt`

### Step 8: Test the Installer

Download the installer for your platform and test:
```bash
# Windows
.\agent-player-installer-1.3.0-win-x64.msi

# Linux
chmod +x agent-player-installer-1.3.0-linux-x86_64.AppImage
./agent-player-installer-1.3.0-linux-x86_64.AppImage

# macOS
open agent-player-installer-1.3.0-macos-x64.dmg
```

Verify that:
- ✅ Installer downloads `agent-player-files.zip` from GitHub
- ✅ Installation completes successfully
- ✅ Frontend opens at http://localhost:41521
- ✅ Backend runs at http://localhost:41522
- ✅ All features work correctly

---

## 🔧 Manual Release (Fallback)

If CI/CD fails or you need to do it manually:

### 1. Create Release ZIP
```powershell
cd C:\MAMP\htdocs\agent\agent_player
.\scripts\compress-for-release.ps1
```

### 2. Build Windows Installer
```powershell
cd installer
cargo tauri build
```

Output: `installer\target\release\bundle\msi\Girru_1.3.0_x64_en-US.msi`

### 3. Build Linux/macOS (requires VM or Docker)
```bash
# Ubuntu for AppImage
cargo tauri build

# macOS for DMG
cargo tauri build
```

### 4. Generate Checksums
```powershell
cd C:\MAMP\htdocs\agent\agent_player

# Windows
Get-FileHash *.msi, *.zip -Algorithm SHA256 | Format-Table Hash, Path > checksums.txt

# Linux/macOS
sha256sum *.msi *.AppImage *.dmg *.zip > checksums.txt
```

### 5. Create GitHub Release Manually
1. Go to: https://github.com/Dpro-at/Girru/releases/new
2. Tag: `v1.3.0`
3. Title: `Girru v1.3.0`
4. Description: Copy from release-notes template
5. Upload files:
   - `agent-player-installer-1.3.0-win-x64.msi`
   - `agent-player-installer-1.3.0-linux-x86_64.AppImage`
   - `agent-player-installer-1.3.0-macos-x64.dmg`
   - `agent-player-files.zip`
   - `checksums.txt`
6. Click "Publish release"

---

## 🐛 Troubleshooting

### CI/CD Job Fails

**Check logs:**
```
https://github.com/Dpro-at/Girru/actions
```

**Common issues:**

1. **Cargo build fails** - Missing dependencies
   - Solution: Update `Cargo.toml` dependencies
   - Run `cargo update` locally first

2. **Compress fails** - Path issues
   - Solution: Check exclude patterns in workflow
   - Test `compress-for-release.ps1` locally

3. **Upload fails** - File not found
   - Solution: Check artifact paths in workflow
   - Verify build output locations

4. **Permission denied** - GitHub token issue
   - Solution: Workflow has `permissions: contents: write`
   - Check repo settings → Actions → Permissions

### Tag Already Exists

If you need to recreate a tag:
```bash
# Delete local tag
git tag -d v1.3.0

# Delete remote tag
git push origin :refs/tags/v1.3.0

# Recreate tag
git tag -a v1.3.0 -m "Release v1.3.0"
git push origin v1.3.0
```

### Release Download Fails

If installer can't download `agent-player-files.zip`:
1. Check URL: `https://github.com/Dpro-at/Girru/releases/download/v1.3.0/agent-player-files.zip`
2. Verify file exists in release
3. Check GitHub is accessible (not blocked by firewall)
4. Try increasing timeout in `bundler.rs` (currently 5 minutes)

---

## 📊 Release Checklist

Before creating a release:

- [ ] All tests pass locally
- [ ] Version number updated in all files
- [ ] CHANGELOG.md updated with release notes
- [ ] Committed and pushed to main branch
- [ ] Created and pushed version tag
- [ ] CI/CD workflow completed successfully
- [ ] Release created on GitHub with all files
- [ ] Downloaded and tested installer on at least one platform
- [ ] Verified installer downloads from GitHub correctly
- [ ] Verified installation completes successfully
- [ ] Verified application runs correctly after installation

---

## 🎯 Quick Reference

```bash
# Create new release (full process)
git checkout main
git pull origin main

# Update version in files (use script or manually)
$version = "1.3.0"
# ... update package.json, Cargo.toml, etc.

git add -A
git commit -m "chore: bump version to $version"
git push origin main

git tag -a v$version -m "Release v$version"
git push origin v$version

# Watch: https://github.com/Dpro-at/Girru/actions
# Result: https://github.com/Dpro-at/Girru/releases/tag/v$version
```

---

## 🚀 Future Enhancements

### Phase 1: Code Signing ✅ Planned
- [ ] Windows: Authenticode certificate
- [ ] macOS: Apple Developer ID
- [ ] Linux: GPG signatures

### Phase 2: Auto-Update Testing ✅ Planned
- [ ] Automated installer testing
- [ ] Smoke tests after installation
- [ ] Integration with auto-updater

### Phase 3: Nightly Builds ✅ Planned
- [ ] Daily builds from main branch
- [ ] Pre-release channel for testing
- [ ] Beta testing program

---

## 📚 Additional Resources

- **GitHub Actions Docs**: https://docs.github.com/en/actions
- **Tauri Build Docs**: https://v2.tauri.app/guides/building/
- **Semantic Versioning**: https://semver.org/
- **Conventional Commits**: https://www.conventionalcommits.org/

---

**Last Updated**: 2026-03-21
**Version**: 1.3.0
**Status**: Fully Automated ✅
