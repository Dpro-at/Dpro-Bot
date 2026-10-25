/**
 * Email Service - Professional SMTP Email System
 * Supports multiple providers: Gmail, Outlook, SendGrid, Mailgun, Custom SMTP
 */

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

interface EmailConfig {
    host: string;
    port: number;
    secure: boolean;
    auth: {
        user: string;
        pass: string;
    };
    from: {
        name: string;
        email: string;
    };
}

interface SendEmailParams {
    to: string;
    subject: string;
    html: string;
    text?: string;
}

class EmailService {
    private transporter: Transporter | null = null;
    private config: EmailConfig | null = null;

    constructor() {
        this.initialize();
    }

    /**
     * Initialize email service with environment variables
     */
    private initialize() {
        const host = process.env.SMTP_HOST;
        const port = process.env.SMTP_PORT;
        const user = process.env.SMTP_USER;
        const pass = process.env.SMTP_PASS;
        const fromName = process.env.SMTP_FROM_NAME || 'Dpro Bot';
        const fromEmail = process.env.SMTP_FROM_EMAIL || user;

        // If SMTP is not configured, skip initialization (will use fallback)
        if (!host || !port || !user || !pass) {
            console.warn('[Email] SMTP not configured. Email functionality disabled.');
            return;
        }

        this.config = {
            host,
            port: parseInt(port),
            secure: parseInt(port) === 465, // true for 465, false for other ports
            auth: {
                user,
                pass,
            },
            from: {
                name: fromName,
                email: fromEmail || user,
            },
        };

        try {
            this.transporter = nodemailer.createTransport({
                host: this.config.host,
                port: this.config.port,
                secure: this.config.secure,
                auth: this.config.auth,
            });

            console.log(`[Email] ✅ SMTP configured: ${this.config.host}:${this.config.port}`);
        } catch (error) {
            console.error('[Email] ❌ Failed to initialize SMTP:', error);
        }
    }

    /**
     * Check if email service is configured and ready
     */
    isConfigured(): boolean {
        return this.transporter !== null && this.config !== null;
    }

    /**
     * Verify SMTP connection
     */
    async verify(): Promise<boolean> {
        if (!this.transporter) {
            return false;
        }

        try {
            await this.transporter.verify();
            console.log('[Email] ✅ SMTP connection verified');
            return true;
        } catch (error) {
            console.error('[Email] ❌ SMTP verification failed:', error);
            return false;
        }
    }

    /**
     * Send email
     */
    async sendEmail(params: SendEmailParams): Promise<boolean> {
        if (!this.transporter || !this.config) {
            console.warn('[Email] Email not sent: SMTP not configured');
            return false;
        }

        try {
            const info = await this.transporter.sendMail({
                from: `"${this.config.from.name}" <${this.config.from.email}>`,
                to: params.to,
                subject: params.subject,
                html: params.html,
                text: params.text,
            });

            console.log(`[Email] ✅ Email sent to ${params.to}: ${info.messageId}`);
            return true;
        } catch (error) {
            console.error('[Email] ❌ Failed to send email:', error);
            return false;
        }
    }

    /**
     * Send team invitation email
     */
    async sendTeamInvitation(params: {
        to: string;
        teamName: string;
        inviterName: string;
        role: string;
        token: string;
    }): Promise<boolean> {
        const frontendUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:41521';
        const inviteLink = `${frontendUrl}/team/accept-invite?token=${params.token}`;

        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Team Invitation</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #1a1a1a;
            margin: 0;
            font-size: 24px;
        }
        .content {
            margin-bottom: 30px;
        }
        .button {
            display: inline-block;
            background: #0066cc;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
            text-align: center;
        }
        .button-container {
            text-align: center;
            margin: 30px 0;
        }
        .role-badge {
            display: inline-block;
            background: #e6f0ff;
            color: #0066cc;
            padding: 4px 12px;
            border-radius: 4px;
            font-size: 14px;
            font-weight: 500;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e5e5;
            font-size: 12px;
            color: #666;
            text-align: center;
        }
        .link-fallback {
            word-break: break-all;
            color: #666;
            font-size: 12px;
            margin-top: 15px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 Team Invitation</h1>
        </div>

        <div class="content">
            <p>Hi there!</p>

            <p><strong>${params.inviterName}</strong> has invited you to join the team <strong>${params.teamName}</strong> on Dpro Bot.</p>

            <p>You've been invited as: <span class="role-badge">${params.role.toUpperCase()}</span></p>

            <p>Click the button below to accept this invitation and join the team:</p>
        </div>

        <div class="button-container">
            <a href="${inviteLink}" class="button">Accept Invitation</a>
        </div>

        <div class="link-fallback">
            <p>Or copy and paste this link into your browser:</p>
            <p>${inviteLink}</p>
        </div>

        <div class="footer">
            <p>This invitation will expire in 7 days.</p>
            <p>If you didn't expect this invitation, you can safely ignore this email.</p>
            <p>&copy; ${new Date().getFullYear()} Dpro Bot. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
        `.trim();

        const text = `
Team Invitation

${params.inviterName} has invited you to join the team "${params.teamName}" on Dpro Bot.

You've been invited as: ${params.role.toUpperCase()}

Accept this invitation by visiting:
${inviteLink}

This invitation will expire in 7 days.

If you didn't expect this invitation, you can safely ignore this email.
        `.trim();

        return this.sendEmail({
            to: params.to,
            subject: `You've been invited to join ${params.teamName}`,
            html,
            text,
        });
    }

    /**
     * Send test email
     */
    async sendTestEmail(to: string): Promise<boolean> {
        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Test Email</title>
</head>
<body style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
    <h2>✅ SMTP Configuration Test</h2>
    <p>This is a test email from Dpro Bot.</p>
    <p>If you received this email, your SMTP configuration is working correctly!</p>
    <p style="color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
        Sent at: ${new Date().toISOString()}
    </p>
</body>
</html>
        `.trim();

        return this.sendEmail({
            to,
            subject: 'Dpro Bot - SMTP Test Email',
            html,
            text: 'This is a test email from Dpro Bot. If you received this, your SMTP configuration is working!',
        });
    }
}

// Export singleton instance
export const emailService = new EmailService();
