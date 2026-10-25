# SMTP Email Configuration Guide

## Quick Start

Add these environment variables to `packages/backend/.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM_NAME=Dpro Bot
SMTP_FROM_EMAIL=your-email@gmail.com
FRONTEND_URL=http://localhost:41521
```

## Provider-Specific Setup

### Gmail (Recommended for Testing)

1. **Enable 2-Factor Authentication** on your Google Account
2. **Generate App Password**:
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and your device
   - Copy the 16-character password
3. **Configure**:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=xxxx xxxx xxxx xxxx  # App Password (spaces don't matter)
   SMTP_FROM_EMAIL=your-email@gmail.com
   ```

**Important**: Use App Password, NOT your regular Gmail password!

### Outlook / Office 365

```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
```

### Yahoo Mail

```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_USER=your-email@yahoo.com
SMTP_PASS=your-app-password  # Generate at Yahoo Account Security
```

### SendGrid (Transactional Email Service)

1. Sign up at https://sendgrid.com (Free: 100 emails/day)
2. Create API Key in Settings → API Keys
3. Configure:
   ```env
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_USER=apikey  # Literally "apikey"
   SMTP_PASS=SG.xxxxx...  # Your API Key
   SMTP_FROM_EMAIL=verified-sender@yourdomain.com
   ```

### Mailgun

1. Sign up at https://mailgun.com
2. Verify your domain or use sandbox domain for testing
3. Configure:
   ```env
   SMTP_HOST=smtp.mailgun.org
   SMTP_PORT=587
   SMTP_USER=postmaster@your-domain.mailgun.org
   SMTP_PASS=your-smtp-password  # From Mailgun dashboard
   ```

### Custom SMTP Server

```env
SMTP_HOST=mail.your-domain.com
SMTP_PORT=587  # or 465 for SSL
SMTP_USER=noreply@your-domain.com
SMTP_PASS=your-password
SMTP_FROM_EMAIL=noreply@your-domain.com
```

## Port Reference

- **587** (TLS/STARTTLS): Most common, works with most providers
- **465** (SSL): Older standard, still widely supported
- **25**: Usually blocked by ISPs, not recommended

The system auto-detects SSL based on port (465 = SSL, others = TLS).

## Testing Email Configuration

### Via API (Recommended)

1. Start backend: `pnpm dev`
2. Test endpoints:

```bash
# Check status
curl http://localhost:41522/api/email/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Verify SMTP connection
curl -X POST http://localhost:41522/api/email/verify \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Send test email
curl -X POST http://localhost:41522/api/email/test \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"to":"test@example.com"}'
```

### Via Frontend

Navigate to **Settings → Email** in the dashboard to test SMTP configuration.

## Email Features

Currently implemented:
- ✅ **Team Invitations**: Automatic emails when users are invited to teams
- ✅ **Test Email**: Verify SMTP configuration works

Coming soon:
- 📧 Notification emails
- 📧 Password reset emails
- 📧 Welcome emails
- 📧 Activity digests

## Troubleshooting

### "Authentication failed"
- Gmail: Make sure you're using App Password, not regular password
- Check username is correct (usually full email address)
- Verify 2FA is enabled (required for App Passwords)

### "Connection timeout"
- Check SMTP_HOST and SMTP_PORT are correct
- Verify firewall isn't blocking outbound SMTP connections
- Try port 587 instead of 465 (or vice versa)

### "Email not configured"
- Verify all required env vars are set: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
- Restart backend after changing .env file
- Check backend logs for initialization message

### Emails not arriving
- Check spam/junk folder
- Verify SMTP_FROM_EMAIL is valid for your provider
- Some providers require sender address verification
- Check backend logs for send errors

## Security Best Practices

1. **Never commit .env files** to git (already in .gitignore)
2. **Use App Passwords** instead of real passwords when possible
3. **Use dedicated email** for system notifications (e.g., noreply@domain.com)
4. **Production**: Use transactional email service (SendGrid, Mailgun) instead of personal Gmail
5. **Rotate credentials** periodically

## Production Recommendations

For production deployments:

1. **Use SendGrid or Mailgun** instead of Gmail/Outlook
   - Better deliverability
   - Higher sending limits
   - Better analytics
   - More reliable

2. **Verify sender domain** (SPF, DKIM, DMARC)
   - Improves email deliverability
   - Prevents emails going to spam
   - Most providers guide you through this

3. **Monitor email logs**
   - Track send failures
   - Monitor bounce rates
   - Set up alerts

4. **Implement rate limiting**
   - Prevent abuse
   - Stay within provider limits
   - Already built into backend

## Support

For issues or questions:
- Check backend logs: `packages/backend/logs/`
- Enable debug mode: `DEBUG=nodemailer:* pnpm dev`
- Review provider-specific documentation
