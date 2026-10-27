# Security Policy

## Supported Versions

We currently support the following versions with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.3.x   | :white_check_mark: |
| 1.2.x   | :x:                |
| < 1.2   | :x:                |

**Note:** Only the latest version receives security updates. Please upgrade to the latest version to ensure you have all security patches.

---

## Reporting a Vulnerability

**DO NOT** open a public issue for security vulnerabilities.

### How to Report

Please report security vulnerabilities via **GitHub Security Advisories**:

1. Go to: https://github.com/Dpro-at/Girru/security/advisories
2. Click "Report a vulnerability"
3. Fill in the details:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

**Alternative:** Email security reports to the maintainers (check GitHub profiles for contact info)

### What to Include

- **Clear description** of the vulnerability
- **Steps to reproduce** the issue
- **Potential impact** (what could an attacker do?)
- **Affected versions** (if known)
- **Suggested fix** (optional but appreciated)
- **Your contact information** (for follow-up)

### Response Timeline

- **24-48 hours**: Initial acknowledgment
- **7 days**: Preliminary assessment and severity rating
- **30 days**: Fix developed and tested
- **Coordinated disclosure**: Public announcement after fix is released

---

## Security Features

Girru implements multiple security layers:

### 1. Authentication & Authorization

- ✅ **JWT-based authentication** with secure token generation
- ✅ **Token versioning** - Tokens invalidated on password change
- ✅ **Account lockout** - 5 failed attempts → 15-minute lockout
- ✅ **Session management** - Configurable token expiration

### 2. Data Protection

- ✅ **Encrypted credentials** - AES-256-GCM encryption
- ✅ **SQLite database** - Local-only, not exposed to network
- ✅ **File access control** - User-scoped file permissions
- ✅ **Input validation** - Zod schemas for all API inputs

### 3. Network Security

- ✅ **CSRF protection** - Token-based CSRF prevention
- ✅ **Rate limiting** - API request throttling
- ✅ **CORS configuration** - Restricted origins
- ✅ **HTTPS enforcement** - Production requires HTTPS

### 4. Audit & Monitoring

- ✅ **Comprehensive audit logging** - All security events tracked
- ✅ **Audit log retention** - 90-day default (configurable)
- ✅ **Event types tracked**:
  - Authentication attempts (success/failure)
  - Data access (read/write/delete)
  - Security events (lockouts, token refresh)
  - Extension actions (install/enable/disable)

### 5. Code Security

- ✅ **Parameterized queries** - No SQL injection
- ✅ **XSS prevention** - React auto-escapes output
- ✅ **Content Security Policy** - Restricts script sources
- ✅ **Dependency scanning** - Automated vulnerability checks

### 6. Extension Security

- ✅ **Sandboxed execution** - Extensions isolated
- ✅ **Permission system** - Explicit capability grants
- ✅ **Source tracking** - All actions tagged with extension ID
- ✅ **Emergency shutdown** - `EXTENSIONS_DISABLED=true` kills all extensions

---

## Security Best Practices for Users

### Installation

1. **Use official sources only**
   - Clone from: https://github.com/Dpro-at/Girru
   - Don't use unofficial forks or mirrors

2. **Verify integrity**
   ```bash
   # Check git commit signatures
   git log --show-signature
   ```

3. **Secure your environment**
   ```bash
   # Strong JWT secret (32+ characters)
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

   # Set in .env
   JWT_SECRET=<generated-secret>
   ```

### API Keys

1. **Store securely**
   - Add API keys ONLY to `.env` (gitignored)
   - NEVER commit `.env` to version control
   - NEVER hardcode keys in source code

2. **Use environment variables**
   ```bash
   # .env file
   ANTHROPIC_API_KEY=sk-ant-...
   OPENAI_API_KEY=sk-...
   ```

3. **Rotate regularly**
   - Rotate API keys every 90 days
   - Rotate immediately if compromised

### Database

1. **Protect database file**
   ```bash
   # Set proper permissions (Linux/macOS)
   chmod 600 packages/backend/.data/database.db
   ```

2. **Regular backups**
   - Use `/dashboard/database` for backups
   - Store backups securely (encrypted)
   - Test restore process regularly

3. **Sensitive data**
   - Credentials encrypted at rest (AES-256-GCM)
   - User data isolated per user ID
   - Audit logs track all access

### Production Deployment

1. **Use HTTPS**
   - NEVER run in production over HTTP
   - Use valid SSL/TLS certificates
   - Enable HSTS headers

2. **Set NODE_ENV**
   ```bash
   NODE_ENV=production
   ```

3. **Restrict access**
   - Use firewall rules
   - Limit network exposure
   - VPN for admin access (recommended)

4. **Monitor logs**
   ```bash
   # Check audit logs regularly
   SELECT * FROM audit_logs
   WHERE event_type = 'auth_failed'
   ORDER BY created_at DESC
   LIMIT 100;
   ```

---

## Known Security Considerations

### Local-Only Design

Girru is designed for **local deployment**:
- ✅ Frontend: `localhost:41521`
- ✅ Backend: `localhost:41522`
- ✅ Database: SQLite (file-based)

**Production Deployment:**
- Use reverse proxy (nginx/Caddy)
- Enable HTTPS/TLS
- Implement network-level security
- Consider authentication proxy

### AI Provider APIs

Girru sends messages to external AI providers:
- Anthropic Claude API
- OpenAI API (optional)
- Google Gemini API (optional)

**What is sent:**
- User messages (text only)
- Conversation context
- Tool call results

**What is NOT sent:**
- Database contents
- File contents (unless explicitly requested)
- Credentials or API keys
- Other users' data

### WebRTC Calls

Camera/video calls use peer-to-peer WebRTC:
- ✅ Signaling via backend (REST polling)
- ✅ Media stays peer-to-peer (not through server)
- ✅ STUN server: `stun:stun.l.google.com:19302`

**For internet calls:**
- Add TURN server (not included by default)
- Configure in camera settings

---

## Security Update Process

### Update Notifications

Security updates announced via:
1. GitHub Security Advisories
2. Release notes (with `[SECURITY]` tag)
3. CHANGELOG.md updates

### Applying Updates

```bash
# Pull latest changes
git pull origin main

# Update dependencies
pnpm install

# Restart services
pnpm dev  # Development
# or
pm2 restart agent-player  # Production
```

### Emergency Patches

Critical vulnerabilities receive:
- Immediate patch release
- Detailed security advisory
- Upgrade instructions

---

## Vulnerability Disclosure Policy

We follow **coordinated disclosure**:

1. **Report received** → Acknowledged within 48h
2. **Validated** → Severity assessed within 7 days
3. **Fix developed** → Tested and verified
4. **Release prepared** → Patch version created
5. **Public disclosure** → After fix is available

**Timeline:** Typically 30-90 days depending on severity

**Credit:** Reporters credited in:
- Security advisory
- Release notes
- SECURITY.md (with permission)

---

## Security Hall of Fame

Thank you to security researchers who have helped improve Girru:

<!-- Add researchers here after coordinated disclosure -->

---

## Questions?

For non-security questions, open a GitHub issue.

For security concerns, use GitHub Security Advisories or email maintainers.

**Stay secure! 🔒**
