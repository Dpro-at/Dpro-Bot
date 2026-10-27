# Girru Testing Checklist

Comprehensive testing checklist for Girru v1.3.0 installer across all platforms and deployment modes.

## Table of Contents

- [Pre-Testing Setup](#pre-testing-setup)
- [Windows Testing](#windows-testing)
  - [Windows 11 Fresh Install](#windows-11-fresh-install)
  - [Windows 10 Fresh Install](#windows-10-fresh-install)
- [Linux Testing](#linux-testing)
  - [Ubuntu 22.04 LTS](#ubuntu-2204-lts)
  - [Ubuntu 24.04 LTS](#ubuntu-2404-lts)
- [macOS Testing](#macos-testing)
  - [macOS 14 Sonoma](#macos-14-sonoma)
  - [macOS 15 Sequoia](#macos-15-sequoia)
- [Deployment Mode Testing](#deployment-mode-testing)
  - [Docker Mode](#docker-mode-testing)
  - [Direct Mode](#direct-mode-testing)
  - [Server Mode](#server-mode-testing)
- [Post-Installation Testing](#post-installation-testing)
- [Migration Testing](#migration-testing)
- [Update Testing](#update-testing)
- [Uninstallation Testing](#uninstallation-testing)
- [Performance Testing](#performance-testing)
- [Security Testing](#security-testing)

---

## Pre-Testing Setup

### Test Environment Requirements

**Virtual Machines:**
- VirtualBox 7.0+ or VMware Workstation 17+
- Recommended RAM per VM: 4 GB
- Recommended Disk per VM: 40 GB

**Test Matrix:**

| Platform | Version | Architecture | VM Count |
|----------|---------|--------------|----------|
| Windows 11 | 23H2 | x64 | 1 |
| Windows 10 | 22H2 | x64 | 1 |
| Ubuntu | 22.04 LTS | x86_64 | 1 |
| Ubuntu | 24.04 LTS | x86_64 | 1 |
| macOS | 14 Sonoma | x86_64/ARM64 | 1 |
| macOS | 15 Sequoia | x86_64/ARM64 | 1 |

**Total VMs:** 6

### Download Installers

```bash
# Create test directory
mkdir -p ~/agent-player-testing
cd ~/agent-player-testing

# Download all installers
curl -LO https://github.com/your-org/agent-player/releases/download/v1.3.0/agent-player-installer-1.3.0-win-x64.msi
curl -LO https://github.com/your-org/agent-player/releases/download/v1.3.0/agent-player-installer-1.3.0-linux-x86_64.AppImage
curl -LO https://github.com/your-org/agent-player/releases/download/v1.3.0/agent-player-installer-1.3.0-macos-universal.dmg

# Download checksums
curl -LO https://github.com/your-org/agent-player/releases/download/v1.3.0/checksums.txt

# Verify checksums
sha256sum -c checksums.txt
```

### Test Credentials

**Claude API Key:**
- Use a test API key with low rate limits
- **DO NOT** use production API keys

**Admin Account:**
- Email: `test@agentplayer.local`
- Password: `TestPassword123!`

---

## Windows Testing

### Windows 11 Fresh Install

#### 1. VM Setup

- [ ] Create Windows 11 VM (4 GB RAM, 40 GB disk)
- [ ] Install Windows 11 23H2
- [ ] Complete Windows setup (skip Microsoft account)
- [ ] Create local admin user: `test-user`
- [ ] Install all Windows updates
- [ ] Take VM snapshot: `Windows-11-Clean`

#### 2. Pre-Installation Checks

- [ ] Verify ports 41521 and 41522 are free:
  ```powershell
  Test-NetConnection -ComputerName localhost -Port 41521
  Test-NetConnection -ComputerName localhost -Port 41522
  ```
- [ ] Check disk space: `Get-PSDrive C | Select-Object Free`
- [ ] Verify RAM: `Get-ComputerInfo | Select-Object CsTotalPhysicalMemory`

#### 3. Installer Execution

- [ ] Copy `agent-player-installer-1.3.0-win-x64.msi` to VM
- [ ] Right-click installer → **Run as Administrator**
- [ ] If SmartScreen appears → Click **More info** → **Run anyway**
- [ ] Installer window opens successfully

#### 4. Installation Wizard (8 Steps)

**Step 1: Welcome & License**
- [ ] Welcome screen displays correctly
- [ ] MIT License text is readable
- [ ] "I accept the terms" checkbox works
- [ ] **Next** button enabled after checkbox

**Step 2: System Check**
- [ ] Disk space check: ✅ PASS (shows available space)
- [ ] RAM check: ✅ PASS (shows total RAM)
- [ ] Ports check: ✅ PASS (41521, 41522 available)
- [ ] Docker check: ⚠️ WARNING (Docker not installed - expected)
- [ ] **Next** button enabled

**Step 3: Installation Directory**
- [ ] Default path: `C:\Program Files\AgentPlayer`
- [ ] **Browse** button works
- [ ] Path validation works (rejects invalid paths)
- [ ] **Next** button enabled

**Step 4: Deployment Mode Selection**
- [ ] Three cards displayed: Docker / Direct / Server
- [ ] Docker card shows warning: "Requires Docker Desktop"
- [ ] Direct card selected by default
- [ ] Mode description updates when selecting cards
- [ ] **Next** button enabled after selection

**Step 5: Configuration**
- [ ] Frontend port: `41521` (editable)
- [ ] Backend port: `41522` (editable)
- [ ] Claude API key field (password masked)
- [ ] Auto-start checkbox: ✅ enabled
- [ ] **Next** button disabled until API key entered
- [ ] Enter test API key
- [ ] **Next** button enabled

**Step 6: Admin Account Creation**
- [ ] Full name field validates (min 2 chars)
- [ ] Email field validates (valid email format)
- [ ] Password field requires 12+ chars
- [ ] Password strength indicator works (Weak/Medium/Strong)
- [ ] Confirm password validates match
- [ ] **Next** button disabled until all fields valid
- [ ] Enter credentials: `test@agentplayer.local` / `TestPassword123!`
- [ ] **Next** button enabled

**Step 7: Installation Progress**
- [ ] Progress bar appears (0%)
- [ ] Step list displays:
  1. [ ] Extracting Node.js runtime... (2%)
  2. [ ] Extracting Python environment... (4%)
  3. [ ] Copying application files... (5%)
  4. [ ] Installing npm dependencies... (55%) - **Takes 3-5 min**
  5. [ ] Building production assets... (70%) - **Takes 2-3 min**
  6. [ ] Running database migrations... (80%)
  7. [ ] Configuring system service... (90%)
  8. [ ] Finalizing installation... (100%)
- [ ] Each step shows green checkmark when complete
- [ ] No errors appear during installation
- [ ] Total time: 5-10 minutes
- [ ] **Next** button enabled after 100%

**Step 8: Completion**
- [ ] Success message displayed
- [ ] Frontend URL: `http://localhost:41521`
- [ ] Backend URL: `http://localhost:41522`
- [ ] Admin credentials displayed
- [ ] **Launch Dashboard** button works
- [ ] **Close** button closes installer

#### 5. Service Verification

- [ ] Check Windows Services:
  ```powershell
  Get-Service | Where-Object {$_.Name -like "*AgentPlayer*"}
  ```
- [ ] Verify backend service running: `AgentPlayerBackend`
- [ ] Verify frontend service running: `AgentPlayerFrontend`
- [ ] Services set to **Automatic** startup

#### 6. System Tray Icon

- [ ] System tray icon appears: **Girru**
- [ ] Left-click shows menu:
  - [ ] Open Dashboard
  - [ ] Start Services (grayed out - already running)
  - [ ] Stop Services
  - [ ] Restart Services
  - [ ] View Logs
  - [ ] Check for Updates
  - [ ] About
  - [ ] Quit
- [ ] Click **Open Dashboard** → Browser opens at `http://localhost:41521`

#### 7. Dashboard Access

- [ ] Dashboard loads successfully
- [ ] Login page appears
- [ ] Login with test credentials: `test@agentplayer.local` / `TestPassword123!`
- [ ] Dashboard home displays correctly
- [ ] Sidebar navigation works
- [ ] Version shown in footer: `v1.3.0`

#### 8. Functional Testing

- [ ] **Create Agent:**
  - [ ] Navigate to `/dashboard/agents`
  - [ ] Click **+ New Agent**
  - [ ] Enter name: `Test Agent`
  - [ ] Select model: `Claude Sonnet 4.5`
  - [ ] Click **Create**
  - [ ] Agent appears in list

- [ ] **Test Agent Chat:**
  - [ ] Click agent → **Chat**
  - [ ] Send message: `Hello, can you introduce yourself?`
  - [ ] Response streams correctly
  - [ ] No errors in console

- [ ] **Test Tool Usage:**
  - [ ] Send: `Search the web for Girru documentation`
  - [ ] Tool call appears: `web_fetch`
  - [ ] Tool result displays
  - [ ] Response includes search results

- [ ] **Test File Upload:**
  - [ ] Navigate to `/dashboard/storage`
  - [ ] Click **Upload**
  - [ ] Select test file (e.g., image or PDF)
  - [ ] File uploads successfully
  - [ ] File appears in list

#### 9. Service Control Testing

- [ ] **Stop Services:**
  - [ ] Right-click tray icon → **Stop Services**
  - [ ] Confirmation dialog appears
  - [ ] Click **Yes**
  - [ ] Services stop successfully
  - [ ] Dashboard becomes inaccessible (expected)

- [ ] **Start Services:**
  - [ ] Right-click tray icon → **Start Services**
  - [ ] Services start successfully
  - [ ] Dashboard becomes accessible again
  - [ ] Previous data still present (agent exists)

- [ ] **Restart Services:**
  - [ ] Right-click tray icon → **Restart Services**
  - [ ] Services restart successfully
  - [ ] Dashboard reconnects automatically
  - [ ] No data loss

#### 10. Logs Viewer

- [ ] Right-click tray icon → **View Logs**
- [ ] Logs window opens
- [ ] Select service: **Backend**
- [ ] Logs display correctly (JSON format)
- [ ] Select level: **Error**
- [ ] Logs filter to errors only
- [ ] **Export Logs** button works
- [ ] Logs saved to file successfully

#### 11. Persistence Testing

- [ ] Restart Windows VM
- [ ] Wait for Windows to fully boot
- [ ] Verify services auto-start:
  ```powershell
  Get-Service AgentPlayerBackend
  Get-Service AgentPlayerFrontend
  ```
- [ ] Open browser: `http://localhost:41521`
- [ ] Dashboard loads without manual intervention
- [ ] Previous agent still exists
- [ ] Data persisted correctly

#### 12. Uninstallation Testing

- [ ] Right-click tray icon → **Settings** → **Uninstall**
- [ ] OR: Control Panel → Programs → Uninstall Girru
- [ ] Uninstaller window opens
- [ ] Options displayed:
  - [ ] ✅ Remove application files (checked, disabled)
  - [ ] ⬜ Remove user data (.data directory)
  - [ ] ⬜ Remove configuration files (.env)
  - [ ] ⬜ Remove logs
  - [ ] ⬜ Remove Docker volumes (grayed out - not Docker mode)
- [ ] Select **Remove user data**
- [ ] Space to be freed displayed: `~1.5 GB`
- [ ] **Create Backup** button works
- [ ] Backup created: `C:\Users\test-user\AppData\Local\AgentPlayer\Backups\backup-YYYYMMDD-HHMMSS.zip`
- [ ] Click **Uninstall**
- [ ] Progress bar shows uninstallation steps
- [ ] Success message displayed
- [ ] **Close** button closes uninstaller

#### 13. Post-Uninstall Verification

- [ ] Check installation directory removed:
  ```powershell
  Test-Path "C:\Program Files\AgentPlayer"
  # Should return: False
  ```
- [ ] Check services removed:
  ```powershell
  Get-Service | Where-Object {$_.Name -like "*AgentPlayer*"}
  # Should return: Nothing
  ```
- [ ] Check data removed (if selected):
  ```powershell
  Test-Path "C:\Program Files\AgentPlayer\.data"
  # Should return: False
  ```
- [ ] Check Start Menu shortcuts removed
- [ ] System tray icon removed

---

### Windows 10 Fresh Install

Repeat all steps from [Windows 11](#windows-11-fresh-install) with these differences:

- [ ] Create Windows 10 VM (22H2 build)
- [ ] UI differences noted (if any)
- [ ] All tests pass identically

**Known Differences:**
- Windows 10 SmartScreen behaves slightly differently (more warnings)
- Otherwise identical behavior expected

---

## Linux Testing

### Ubuntu 22.04 LTS

#### 1. VM Setup

- [ ] Create Ubuntu 22.04 VM (4 GB RAM, 40 GB disk)
- [ ] Install Ubuntu 22.04.5 LTS
- [ ] Complete Ubuntu setup (minimal install)
- [ ] Create user: `test-user`
- [ ] Install updates:
  ```bash
  sudo apt update && sudo apt upgrade -y
  ```
- [ ] Take VM snapshot: `Ubuntu-22.04-Clean`

#### 2. Pre-Installation Checks

- [ ] Check disk space:
  ```bash
  df -h /
  # Should show 10+ GB free
  ```
- [ ] Check RAM:
  ```bash
  free -h
  # Should show 4+ GB total
  ```
- [ ] Check ports:
  ```bash
  ss -tuln | grep -E ':(41521|41522)'
  # Should return nothing (ports free)
  ```

#### 3. Download & Prepare Installer

```bash
cd ~/Downloads
wget https://github.com/your-org/agent-player/releases/download/v1.3.0/agent-player-installer-1.3.0-linux-x86_64.AppImage
chmod +x agent-player-installer-1.3.0-linux-x86_64.AppImage
```

- [ ] Download completes successfully
- [ ] File is executable

#### 4. Run Installer

```bash
./agent-player-installer-1.3.0-linux-x86_64.AppImage
```

- [ ] Installer GUI opens
- [ ] No errors in terminal

#### 5. Installation Wizard (Same 8 steps as Windows)

**Differences from Windows:**
- Step 3: Default path: `/opt/agent-player`
- Step 4: Docker warning: "Requires Docker Engine"
- Step 7: Progress steps include:
  - Setting up systemd services
  - Configuring file permissions

- [ ] All 8 steps complete successfully
- [ ] Installation finishes without errors

#### 6. Service Verification

```bash
# Check services
sudo systemctl status agent-player
sudo systemctl status agent-player-frontend

# Verify enabled
sudo systemctl is-enabled agent-player
sudo systemctl is-enabled agent-player-frontend
```

- [ ] Both services running
- [ ] Both services enabled (auto-start)

#### 7. System Tray Icon

- [ ] System tray icon appears (GNOME/KDE/XFCE)
- [ ] Right-click shows menu (same as Windows)
- [ ] **Open Dashboard** works

#### 8. Dashboard Access

```bash
# Or use browser
firefox http://localhost:41521
```

- [ ] Dashboard loads
- [ ] Login works
- [ ] All features functional

#### 9. Functional Testing

- [ ] Create agent
- [ ] Test chat
- [ ] Test tools
- [ ] Upload file
- [ ] All tests pass

#### 10. Service Control

```bash
# Test via CLI
sudo systemctl stop agent-player
sudo systemctl start agent-player
sudo systemctl restart agent-player
```

- [ ] Stop works
- [ ] Start works
- [ ] Restart works
- [ ] OR: Use system tray menu

#### 11. Logs Testing

```bash
# View logs
sudo journalctl -u agent-player -n 100

# Follow logs
sudo journalctl -u agent-player -f
```

- [ ] Logs display correctly
- [ ] OR: Use system tray **View Logs**

#### 12. Persistence Testing

```bash
sudo reboot
```

- [ ] VM reboots
- [ ] Services auto-start
- [ ] Dashboard accessible after boot
- [ ] Data persists

#### 13. Uninstallation

```bash
# Via system tray: Settings → Uninstall
# Or remove via package manager (if packaged)
```

- [ ] Uninstaller runs
- [ ] Options displayed (same as Windows)
- [ ] Uninstall completes
- [ ] Files removed:
  ```bash
  ls /opt/agent-player
  # Should show: No such file or directory
  ```

---

### Ubuntu 24.04 LTS

Repeat all steps from [Ubuntu 22.04](#ubuntu-2204-lts) with:

- [ ] Ubuntu 24.04.1 LTS installed
- [ ] All tests pass identically
- [ ] Note any Ubuntu 24.04-specific issues

---

## macOS Testing

### macOS 14 Sonoma

#### 1. VM Setup (or Real Hardware)

- [ ] macOS 14 Sonoma installed
- [ ] Create user: `test-user`
- [ ] Install Xcode Command Line Tools:
  ```bash
  xcode-select --install
  ```
- [ ] Take snapshot: `macOS-14-Clean`

#### 2. Download Installer

```bash
cd ~/Downloads
curl -LO https://github.com/your-org/agent-player/releases/download/v1.3.0/agent-player-installer-1.3.0-macos-universal.dmg
```

#### 3. Install

- [ ] Double-click `.dmg` file
- [ ] Drag **Girru Installer** to **Applications**
- [ ] Eject DMG
- [ ] Open **Applications** folder
- [ ] Right-click **Girru Installer** → **Open**
- [ ] If Gatekeeper blocks:
  - [ ] **System Settings** → **Privacy & Security**
  - [ ] Scroll down → **Open Anyway**

#### 4. Installation Wizard

- [ ] Same 8 steps as Windows/Linux
- [ ] Default path: `/Applications/Girru.app/Contents/Resources`
- [ ] Services: launchd plists

#### 5. Service Verification

```bash
# Check services
launchctl list | grep agentplayer

# Expected output:
# - com.agentplayer.backend
# - com.agentplayer.frontend
```

#### 6. Dashboard & Testing

- [ ] Open browser: `http://localhost:41521`
- [ ] All functional tests pass (same as Windows)

#### 7. Uninstallation

- [ ] Via system tray OR:
  ```bash
  sudo /Applications/Agent\ Player.app/Contents/Resources/uninstall.sh
  ```
- [ ] Verify removal:
  ```bash
  ls "/Applications/Girru.app"
  # Should show: No such file or directory
  ```

---

### macOS 15 Sequoia

Repeat [macOS 14](#macos-14-sonoma) steps with macOS 15.

---

## Deployment Mode Testing

### Docker Mode Testing

**Prerequisites:**
- Docker Desktop installed (Windows/macOS)
- Docker Engine installed (Linux)

#### Test on Each Platform

- [ ] **Windows 11:**
  - [ ] Install Docker Desktop
  - [ ] Run installer, select **Docker Mode**
  - [ ] Verify containers start:
    ```powershell
    docker ps
    ```
  - [ ] Both containers running: `agent-player-backend-1`, `agent-player-frontend-1`

- [ ] **Ubuntu 22.04:**
  - [ ] Install Docker:
    ```bash
    sudo apt install docker.io docker-compose
    ```
  - [ ] Run installer, select **Docker Mode**
  - [ ] Verify containers:
    ```bash
    docker ps
    ```

- [ ] **macOS 14:**
  - [ ] Install Docker Desktop
  - [ ] Run installer, select **Docker Mode**
  - [ ] Verify containers

#### Docker-Specific Tests

- [ ] **Volume Persistence:**
  ```bash
  docker-compose down
  docker-compose up -d
  # Data should persist
  ```

- [ ] **Logs:**
  ```bash
  docker-compose logs -f backend
  ```

- [ ] **Health Checks:**
  ```bash
  docker ps --format "table {{.Names}}\t{{.Status}}"
  # Should show: healthy
  ```

---

### Direct Mode Testing

Already tested in main platform tests above. Verify:

- [ ] Services install correctly (systemd/launchd/Windows Service)
- [ ] Auto-start works
- [ ] Performance is best (no container overhead)

---

### Server Mode Testing

**Prerequisites:**
- Remote VPS (DigitalOcean, AWS, Linode, etc.)
- SSH access
- Domain name (optional)

#### Test Scenarios

**1. Password Authentication:**
- [ ] Run installer on local machine
- [ ] Select **Server Mode**
- [ ] Enter:
  - Host: `123.45.67.89`
  - Port: `22`
  - Username: `root`
  - Auth: **Password**
  - Password: `your_password`
  - Domain: (leave empty)
- [ ] Deployment completes successfully
- [ ] Access: `http://123.45.67.89:41521`

**2. SSH Key Authentication:**
- [ ] Run installer
- [ ] Select **Server Mode**
- [ ] Enter:
  - Host: `agent.example.com`
  - Username: `ubuntu`
  - Auth: **Private Key**
  - Key Path: `~/.ssh/id_rsa`
  - Domain: `agent.example.com`
- [ ] Deployment completes
- [ ] Access: `https://agent.example.com` (SSL enabled)

**3. Verify Server Deployment:**
```bash
# SSH into server
ssh user@server-ip

# Check services
sudo systemctl status agent-player
sudo systemctl status agent-player-frontend
sudo systemctl status nginx

# Check SSL (if domain provided)
sudo certbot certificates

# Check firewall
sudo ufw status
```

---

## Post-Installation Testing

### Auto-Update Testing

- [ ] Right-click tray icon → **Check for Updates**
- [ ] If no update: "You're running the latest version"
- [ ] Simulate update available (modify version in GitHub)
- [ ] Update notification appears
- [ ] Click **Download**
- [ ] Update downloads successfully
- [ ] Click **Install**
- [ ] Services restart
- [ ] Dashboard shows new version

---

## Migration Testing

### Test Migration from v1.2.x

**Setup:**
- [ ] Install v1.2.x manually (`git clone` + `pnpm install`)
- [ ] Create test data:
  - 5 agents
  - 10 chat messages
  - Upload 3 files
  - Install 2 extensions

**Backup:**
- [ ] Run backup script
- [ ] Verify backup contains all data

**Migrate:**
- [ ] Run v1.3.0 installer (Fresh Install method)
- [ ] Stop new services
- [ ] Restore database
- [ ] Restore files
- [ ] Start services

**Verify:**
- [ ] All 5 agents present
- [ ] All 10 chat messages intact
- [ ] All 3 files accessible
- [ ] All 2 extensions working
- [ ] No errors in logs

---

## Performance Testing

### Metrics to Track

**Installation Time:**
- [ ] Windows: _____ minutes
- [ ] Linux: _____ minutes
- [ ] macOS: _____ minutes

**Memory Usage (Idle):**
- [ ] Backend: _____ MB
- [ ] Frontend: _____ MB
- [ ] Total: _____ MB

**Memory Usage (Under Load):**
- [ ] 10 concurrent chats: _____ MB
- [ ] 100 concurrent requests: _____ MB

**Startup Time:**
- [ ] Services start in < 10 seconds

**Dashboard Load Time:**
- [ ] Initial load: < 2 seconds
- [ ] Subsequent loads: < 1 second

---

## Security Testing

### SSL/TLS Testing (Server Mode)

- [ ] SSL certificate installed correctly:
  ```bash
  openssl s_client -connect agent.example.com:443
  ```
- [ ] Certificate valid (not self-signed)
- [ ] Grade A on SSL Labs test

### Port Security

- [ ] Only necessary ports open:
  ```bash
  nmap -p- your-server-ip
  ```
- [ ] Expected: 22 (SSH), 80 (HTTP), 443 (HTTPS)
- [ ] Ports 41521, 41522 NOT exposed (behind nginx)

### Database Security

- [ ] Database file permissions: `600` (owner read/write only)
- [ ] Database directory permissions: `700`

### API Key Security

- [ ] API key stored in `.env` file
- [ ] `.env` file permissions: `600`
- [ ] API key not logged or exposed

---

## Test Results Summary

**Date:** _____________

**Tester:** _____________

**Version:** v1.3.0

### Platform Test Results

| Platform | Installation | Services | Dashboard | Tools | Result |
|----------|--------------|----------|-----------|-------|--------|
| Windows 11 | ☐ Pass ☐ Fail | ☐ Pass ☐ Fail | ☐ Pass ☐ Fail | ☐ Pass ☐ Fail | ☐ Pass ☐ Fail |
| Windows 10 | ☐ Pass ☐ Fail | ☐ Pass ☐ Fail | ☐ Pass ☐ Fail | ☐ Pass ☐ Fail | ☐ Pass ☐ Fail |
| Ubuntu 22.04 | ☐ Pass ☐ Fail | ☐ Pass ☐ Fail | ☐ Pass ☐ Fail | ☐ Pass ☐ Fail | ☐ Pass ☐ Fail |
| Ubuntu 24.04 | ☐ Pass ☐ Fail | ☐ Pass ☐ Fail | ☐ Pass ☐ Fail | ☐ Pass ☐ Fail | ☐ Pass ☐ Fail |
| macOS 14 | ☐ Pass ☐ Fail | ☐ Pass ☐ Fail | ☐ Pass ☐ Fail | ☐ Pass ☐ Fail | ☐ Pass ☐ Fail |
| macOS 15 | ☐ Pass ☐ Fail | ☐ Pass ☐ Fail | ☐ Pass ☐ Fail | ☐ Pass ☐ Fail | ☐ Pass ☐ Fail |

### Deployment Mode Results

| Mode | Installation | Functionality | Persistence | Result |
|------|--------------|---------------|-------------|--------|
| Docker | ☐ Pass ☐ Fail | ☐ Pass ☐ Fail | ☐ Pass ☐ Fail | ☐ Pass ☐ Fail |
| Direct | ☐ Pass ☐ Fail | ☐ Pass ☐ Fail | ☐ Pass ☐ Fail | ☐ Pass ☐ Fail |
| Server | ☐ Pass ☐ Fail | ☐ Pass ☐ Fail | ☐ Pass ☐ Fail | ☐ Pass ☐ Fail |

### Critical Issues Found

| ID | Platform | Severity | Description | Status |
|----|----------|----------|-------------|--------|
| 1 | _________ | Critical / Major / Minor | _____________ | Open / Fixed |
| 2 | _________ | Critical / Major / Minor | _____________ | Open / Fixed |
| 3 | _________ | Critical / Major / Minor | _____________ | Open / Fixed |

### Recommendations

- ☐ Ready for release
- ☐ Needs bug fixes
- ☐ Needs retesting

**Notes:**
_____________________________________________________________
_____________________________________________________________
_____________________________________________________________

---

**Testing Complete!**

Sign-off: _________________ Date: _____________
