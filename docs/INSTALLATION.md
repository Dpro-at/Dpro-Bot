# Dpro Bot Installation Guide

Complete installation guide for all platforms and deployment modes.

## Table of Contents

- [System Requirements](#system-requirements)
- [Download](#download)
- [Installation Methods](#installation-methods)
  - [Windows Installation](#windows-installation)
  - [Linux Installation](#linux-installation)
  - [macOS Installation](#macos-installation)
- [Deployment Modes](#deployment-modes)
  - [Docker Mode](#docker-mode-recommended)
  - [Direct Mode](#direct-mode)
  - [Server Mode](#server-mode)
- [Post-Installation](#post-installation)
- [Troubleshooting](#troubleshooting)

---

## System Requirements

### Minimum Requirements

- **Disk Space:** 2 GB free (minimum), 5 GB recommended
- **RAM:** 4 GB minimum, 8 GB recommended
- **CPU:** 2 cores minimum, 4 cores recommended
- **Network:** Active internet connection for initial setup

### Platform-Specific Requirements

#### Windows
- Windows 10 (1903 or later) or Windows 11
- Administrator privileges for installation
- Ports 41521 (frontend) and 41522 (backend) available

#### Linux
- Ubuntu 22.04 LTS, 24.04 LTS, or equivalent
- Debian 11+, Fedora 38+, or other modern distributions
- Root/sudo access for system service installation
- systemd for service management

#### macOS
- macOS 14 Sonoma or later
- Administrator privileges
- Xcode Command Line Tools (installed automatically if needed)

### Optional Requirements

- **Docker Mode:** Docker Desktop (Windows/macOS) or Docker Engine (Linux)
- **Server Mode:** SSH access to remote server, domain name (optional)

---

## Download

Download the latest installer for your platform:

### Official Releases

Visit the [GitHub Releases](https://github.com/your-org/agent-player/releases) page:

- **Windows:** `agent-player-installer-1.3.0-win-x64.msi` (90 MB)
- **Linux:** `agent-player-installer-1.3.0-linux-x86_64.AppImage` (95 MB)
- **macOS:** `agent-player-installer-1.3.0-macos-universal.dmg` (92 MB)

### Verify Download (Recommended)

```bash
# Download checksums file
curl -LO https://github.com/your-org/agent-player/releases/download/v1.3.0/checksums.txt

# Verify (Windows PowerShell)
Get-FileHash agent-player-installer-1.3.0-win-x64.msi -Algorithm SHA256

# Verify (Linux/macOS)
sha256sum -c checksums.txt
```

---

## Installation Methods

### Windows Installation

#### Step 1: Download the Installer

Download `agent-player-installer-1.3.0-win-x64.msi` from the releases page.

#### Step 2: Run the Installer

1. **Right-click** the `.msi` file → **Run as Administrator**
2. If Windows SmartScreen appears, click **More info** → **Run anyway**
3. The installer wizard will start

#### Step 3: Follow the 8-Step Wizard

**Step 1: Welcome & License**
- Read and accept the MIT License
- Click **Next**

**Step 2: System Check**
- The installer will automatically check:
  - ✅ Disk space (2 GB free)
  - ✅ RAM (4 GB minimum)
  - ✅ Ports availability (41521, 41522)
  - ✅ Docker (if Docker mode is selected)
- If any checks fail, you'll see warnings with suggestions
- Click **Next** to continue

**Step 3: Installation Directory**
- Default: `C:\Program Files\AgentPlayer`
- To change: Click **Browse** and select a different folder
- Click **Next**

**Step 4: Deployment Mode Selection** ⭐ **IMPORTANT**

Choose one of three deployment modes:

**🐳 Docker (Recommended for Production)**
- Isolated containerized environment
- Easy updates and rollback
- **Requires:** Docker Desktop installed
- **Best for:** Production deployments, isolated testing

**💻 Direct (Best Performance)**
- Runs directly on Windows as a service
- Fastest performance, lowest overhead
- **Requires:** Administrator privileges
- **Best for:** Development, personal use, maximum performance

**🌐 Server (Remote Deployment)**
- Deploy to a remote VPS/cloud server
- Automatic nginx + SSL setup
- **Requires:** SSH access to server
- **Best for:** Hosting on DigitalOcean, AWS, Linode, etc.

Click **Next** after selecting

**Step 5: Configuration**
- **Frontend Port:** 41521 (default) - Change if needed
- **Backend Port:** 41522 (default) - Change if needed
- **Claude API Key:** Enter your Anthropic API key (required)
  - Get one at: https://console.anthropic.com/
- **Auto-start on Boot:** ✅ Enabled (recommended)
- Click **Next**

**Step 6: Admin Account Creation**
- **Full Name:** Your name
- **Email Address:** admin@example.com
- **Password:** At least 12 characters
- **Confirm Password:** Re-enter password
- Click **Next**

**Step 7: Installation Progress**
- The installer will:
  1. Extract Node.js runtime (~2%)
  2. Extract Python environment (~2%)
  3. Copy application files (~1%)
  4. Install npm dependencies (~50%) - **Takes 3-5 minutes**
  5. Build production assets (~15%) - **Takes 2-3 minutes**
  6. Run database migrations (~10%)
  7. Configure system service (~10%)
  8. Complete (~10%)

**Total time:** 5-10 minutes depending on internet speed

**Step 8: Completion**
- ✅ Installation completed successfully!
- **Frontend URL:** http://localhost:41521
- **Backend URL:** http://localhost:41522
- **Admin Email:** (your email)
- **Admin Password:** (your password)
- Click **Launch Dashboard** to open in browser
- Click **Close** to exit installer

#### Step 4: Access the Dashboard

1. Open your browser
2. Navigate to: http://localhost:41521
3. Login with your admin credentials
4. Start creating AI agents! 🎉

#### System Tray Icon

After installation, you'll see an **Dpro Bot** icon in your system tray:

- **Left-click:** Show menu
- **Right-click:** Quick actions

**Menu Options:**
- Open Dashboard
- Start Services
- Stop Services
- Restart Services
- View Logs
- Check for Updates
- About
- Quit

---

### Linux Installation

#### Step 1: Download the AppImage

```bash
cd ~/Downloads
curl -LO https://github.com/your-org/agent-player/releases/download/v1.3.0/agent-player-installer-1.3.0-linux-x86_64.AppImage
```

#### Step 2: Make Executable

```bash
chmod +x agent-player-installer-1.3.0-linux-x86_64.AppImage
```

#### Step 3: Run the Installer

```bash
./agent-player-installer-1.3.0-linux-x86_64.AppImage
```

#### Step 4: Follow the 8-Step Wizard

Same as Windows (see above), with these Linux-specific defaults:

- **Installation Directory:** `/opt/agent-player`
- **Service Manager:** systemd
- **Service Names:**
  - `agent-player.service` (backend)
  - `agent-player-frontend.service` (frontend)

#### Step 5: Verify Services

```bash
# Check backend status
sudo systemctl status agent-player

# Check frontend status
sudo systemctl status agent-player-frontend

# View logs
sudo journalctl -u agent-player -f
```

#### Step 6: Access the Dashboard

Open browser: http://localhost:41521

---

### macOS Installation

#### Step 1: Download the DMG

Download `agent-player-installer-1.3.0-macos-universal.dmg` from releases.

#### Step 2: Open the DMG

1. Double-click the `.dmg` file
2. Drag **Dpro Bot Installer** to **Applications** folder
3. Eject the DMG

#### Step 3: Run the Installer

1. Open **Applications**
2. Right-click **Dpro Bot Installer** → **Open**
3. If macOS Gatekeeper blocks it:
   - **System Settings** → **Privacy & Security**
   - Scroll down → Click **Open Anyway**
4. Follow the 8-step wizard (same as Windows)

#### macOS-Specific Defaults

- **Installation Directory:** `/Applications/Dpro Bot.app/Contents/Resources`
- **Service Manager:** launchd
- **Service Names:**
  - `com.agentplayer.backend.plist`
  - `com.agentplayer.frontend.plist`

#### Verify Services

```bash
# Check backend status
launchctl list | grep agentplayer

# View logs
tail -f /opt/agent-player/logs/backend.log
```

---

## Deployment Modes

### Docker Mode (Recommended)

**What Gets Installed:**
- `docker-compose.yml` - Container orchestration
- `Dockerfile.frontend` - Next.js container
- `Dockerfile.backend` - Fastify + Python container
- Persistent volumes for data and public files

**Advantages:**
- ✅ Isolated environment
- ✅ Easy updates (pull new images)
- ✅ Rollback capability
- ✅ Production-ready

**Requirements:**
- Docker Desktop (Windows/macOS)
- Docker Engine + Docker Compose (Linux)

**Commands:**

```bash
# Start containers
cd C:\Program Files\AgentPlayer  # Windows
cd /opt/agent-player              # Linux
docker-compose up -d

# Stop containers
docker-compose stop

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Restart containers
docker-compose restart
```

**Data Persistence:**
- Database: `agent-player-data` volume
- Files: `agent-player-public` volume

---

### Direct Mode

**What Gets Installed:**
- Node.js 20 LTS portable runtime
- Python 3.12 embedded distribution
- Dpro Bot source code (production build)
- System service (Windows Service / systemd / launchd)

**Advantages:**
- ✅ Fastest performance
- ✅ No container overhead
- ✅ Native OS integration
- ✅ Lowest memory usage

**Service Management:**

**Windows:**
```powershell
# Start services
sc start AgentPlayerBackend
sc start AgentPlayerFrontend

# Stop services
sc stop AgentPlayerBackend
sc stop AgentPlayerFrontend

# Check status
sc query AgentPlayerBackend
```

**Linux:**
```bash
# Start services
sudo systemctl start agent-player
sudo systemctl start agent-player-frontend

# Stop services
sudo systemctl stop agent-player
sudo systemctl stop agent-player-frontend

# Enable auto-start
sudo systemctl enable agent-player
sudo systemctl enable agent-player-frontend
```

**macOS:**
```bash
# Start services
sudo launchctl load /Library/LaunchDaemons/com.agentplayer.backend.plist
sudo launchctl load /Library/LaunchDaemons/com.agentplayer.frontend.plist

# Stop services
sudo launchctl unload /Library/LaunchDaemons/com.agentplayer.backend.plist
sudo launchctl unload /Library/LaunchDaemons/com.agentplayer.frontend.plist
```

---

### Server Mode

Deploy Dpro Bot to a remote VPS/cloud server with automatic nginx + SSL setup.

**Requirements:**
- Remote server running Ubuntu 22.04+ or Debian 11+
- SSH access (password or private key)
- Domain name (optional, for SSL)
- Firewall ports: 80, 443, 41521, 41522

**During Installation:**

**Step 4: Deployment Mode**
- Select **🌐 Server (Remote Deployment)**

**Server Configuration:**
- **Host:** your-server.com or IP address (e.g., 45.76.123.45)
- **Port:** 22 (default SSH port)
- **Username:** root or ubuntu
- **Authentication:**
  - **Password:** Enter SSH password
  - **OR Private Key:** Browse to `~/.ssh/id_rsa`
- **Installation Path:** `/var/www/agent-player` (default)
- **Domain (Optional):** agent.yourdomain.com
  - If provided: Automatic Let's Encrypt SSL setup
  - If empty: HTTP only (not recommended for production)

**What Gets Installed on Server:**
1. Node.js 20 LTS
2. Python 3.12
3. nginx (reverse proxy)
4. Dpro Bot application
5. systemd services
6. SSL certificate (if domain provided)
7. ufw firewall rules

**Access After Installation:**
- With domain: https://agent.yourdomain.com
- Without domain: http://your-server-ip:41521

**Server Management:**

```bash
# SSH into server
ssh root@your-server.com

# Check services
sudo systemctl status agent-player
sudo systemctl status agent-player-frontend
sudo systemctl status nginx

# View logs
sudo journalctl -u agent-player -f

# Restart services
sudo systemctl restart agent-player
```

---

## Post-Installation

### First Login

1. Open browser: http://localhost:41521
2. Login with admin credentials created during installation
3. You'll see the **Getting Started** wizard

### Default Credentials

If you skipped admin account creation, default credentials are:
- **Email:** owner@localhost
- **Password:** admin123

**⚠️ IMPORTANT:** Change this password immediately!

### System Tray Application

The Dpro Bot system tray application runs in the background:

**Features:**
- ✅ Quick access to dashboard
- ✅ Start/Stop/Restart services
- ✅ View logs in real-time
- ✅ Check for updates
- ✅ About information

**To disable system tray:**
- Right-click tray icon → **Settings** → Uncheck **Show tray icon**

### Auto-Updates

Dpro Bot checks for updates automatically:

- **Check interval:** Every 24 hours
- **Update source:** GitHub Releases
- **Notification:** System tray notification when update available

**Manual update check:**
1. Right-click tray icon
2. Click **Check for Updates**
3. If update available: **Download** → **Install**

**Auto-update settings:**
- Tray icon → **Settings** → **Auto-Update**
  - ✅ Check for updates automatically
  - ✅ Download updates in background
  - ⬜ Install updates automatically (requires restart)

---

## Troubleshooting

### Installation Issues

#### "Port 41521 or 41522 is already in use"

**Solution:**
1. Find process using the port:
   ```bash
   # Windows
   netstat -ano | findstr :41521

   # Linux/macOS
   lsof -i :41521
   ```
2. Stop the process or change ports during installation

#### "Docker is not installed" (Docker mode only)

**Solution:**
1. Download Docker Desktop:
   - Windows/macOS: https://www.docker.com/products/docker-desktop
   - Linux: `sudo apt install docker.io docker-compose`
2. Start Docker
3. Re-run installer

#### "Insufficient disk space"

**Solution:**
1. Free up at least 2 GB of disk space
2. Or select a different installation directory with more space

#### "Permission denied" (Linux/macOS)

**Solution:**
```bash
# Run installer with sudo
sudo ./agent-player-installer-1.3.0-linux-x86_64.AppImage
```

### Runtime Issues

#### Services won't start

**Windows:**
```powershell
# Check Windows Event Viewer
eventvwr.msc
# Navigate to: Windows Logs → Application
# Look for "AgentPlayer" errors
```

**Linux:**
```bash
# Check service status
sudo systemctl status agent-player

# View detailed logs
sudo journalctl -u agent-player -n 100 --no-pager
```

**macOS:**
```bash
# Check launchd logs
sudo tail -f /var/log/system.log | grep agentplayer
```

#### Cannot access dashboard

1. **Check services are running:**
   - Windows: `sc query AgentPlayerBackend`
   - Linux: `sudo systemctl status agent-player`
   - macOS: `launchctl list | grep agentplayer`

2. **Check firewall:**
   - Windows: Allow ports 41521, 41522 in Windows Firewall
   - Linux: `sudo ufw allow 41521` and `sudo ufw allow 41522`
   - macOS: System Settings → Network → Firewall → Allow Dpro Bot

3. **Check logs:**
   - Navigate to installation directory → `logs/` folder
   - Open `backend.log` and `frontend.log`

#### Database errors

**Symptom:** "Database is locked" or "Database not found"

**Solution:**
```bash
# Stop services
# Windows: sc stop AgentPlayerBackend
# Linux: sudo systemctl stop agent-player

# Check database permissions
# Windows: Right-click .data folder → Properties → Security
# Linux: sudo chown -R agentplayer:agentplayer /opt/agent-player/.data

# Restart services
```

### Uninstallation Issues

See [Uninstallation Guide](./UNINSTALLATION.md) for detailed instructions.

---

## Getting Help

### Community Support

- **GitHub Issues:** https://github.com/your-org/agent-player/issues
- **Documentation:** https://docs.agentplayer.com
- **Discord Community:** https://discord.gg/agentplayer

### Professional Support

For enterprise deployments and professional support:
- Email: support@agentplayer.com
- Enterprise Plans: https://agentplayer.com/enterprise

---

## Next Steps

After installation, check out:

1. **[Deployment Guide](./DEPLOYMENT.md)** - Advanced deployment options
2. **[Upgrading Guide](./UPGRADING.md)** - Upgrade from manual installation
3. **[Configuration Guide](./CONFIGURATION.md)** - Advanced configuration
4. **[Quick Start Guide](./QUICK_START.md)** - Create your first AI agent

---

**Installation complete! 🎉**

Start building intelligent AI agents with Dpro Bot.
