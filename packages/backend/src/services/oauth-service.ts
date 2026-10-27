/**
 * OAuth Service
 *
 * Handles OAuth 2.0 authentication for email providers:
 * - Gmail (Google OAuth)
 * - Outlook (Microsoft OAuth)
 * - Token exchange
 * - Token refresh
 * - Token revocation
 */

import { google } from 'googleapis';
import { Client } from '@microsoft/microsoft-graph-client';
import { encrypt } from './email-encryption.js';
import { config } from '../config/index.js';

// Gmail OAuth Configuration
const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID || '';
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET || '';
const GMAIL_REDIRECT_URI = config.gmailRedirectUri;

// Outlook OAuth Configuration
const OUTLOOK_CLIENT_ID = process.env.OUTLOOK_CLIENT_ID || '';
const OUTLOOK_CLIENT_SECRET = process.env.OUTLOOK_CLIENT_SECRET || '';
const OUTLOOK_REDIRECT_URI = config.outlookRedirectUri;

export interface OAuthTokens {
    accessToken: string;
    refreshToken?: string;
    expiresAt: Date;
    email?: string;
    name?: string;
}

export class OAuthService {
    /**
     * Get Gmail OAuth authorization URL
     */
    getGmailAuthUrl(state?: string): string {
        if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET) {
            throw new Error('Gmail OAuth not configured. Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in .env');
        }

        const oauth2Client = new google.auth.OAuth2(
            GMAIL_CLIENT_ID,
            GMAIL_CLIENT_SECRET,
            GMAIL_REDIRECT_URI
        );

        const scopes = [
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.send',
            'https://www.googleapis.com/auth/gmail.modify',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile',
        ];

        const url = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
            state: state || '',
            prompt: 'consent', // Force consent screen to always get refresh token
        });

        console.log('🔐 [OAuth] Generated Gmail auth URL');
        return url;
    }

    /**
     * Exchange Gmail authorization code for tokens
     */
    async exchangeGmailCode(code: string): Promise<OAuthTokens> {
        if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET) {
            throw new Error('Gmail OAuth not configured');
        }

        try {
            const oauth2Client = new google.auth.OAuth2(
                GMAIL_CLIENT_ID,
                GMAIL_CLIENT_SECRET,
                GMAIL_REDIRECT_URI
            );

            const { tokens } = await oauth2Client.getToken(code);

            if (!tokens.access_token) {
                throw new Error('No access token received');
            }

            // Get user info
            oauth2Client.setCredentials(tokens);
            const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
            const userInfo = await oauth2.userinfo.get();

            const expiresAt = new Date();
            if (tokens.expiry_date) {
                expiresAt.setTime(tokens.expiry_date);
            } else {
                expiresAt.setTime(Date.now() + 3600 * 1000); // 1 hour default
            }

            console.log(`✅ [OAuth] Gmail tokens exchanged for ${userInfo.data.email}`);

            return {
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token ?? undefined,
                expiresAt,
                email: userInfo.data.email || undefined,
                name: userInfo.data.name || undefined,
            };
        } catch (error: any) {
            console.error('❌ [OAuth] Gmail token exchange failed:', error.message);
            throw new Error(`Gmail OAuth failed: ${error.message}`);
        }
    }

    /**
     * Refresh Gmail access token
     */
    async refreshGmailToken(refreshToken: string): Promise<OAuthTokens> {
        if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET) {
            throw new Error('Gmail OAuth not configured');
        }

        try {
            const oauth2Client = new google.auth.OAuth2(
                GMAIL_CLIENT_ID,
                GMAIL_CLIENT_SECRET,
                GMAIL_REDIRECT_URI
            );

            oauth2Client.setCredentials({ refresh_token: refreshToken });

            const { credentials } = await oauth2Client.refreshAccessToken();

            if (!credentials.access_token) {
                throw new Error('No access token received');
            }

            const expiresAt = new Date();
            if (credentials.expiry_date) {
                expiresAt.setTime(credentials.expiry_date);
            } else {
                expiresAt.setTime(Date.now() + 3600 * 1000);
            }

            console.log('✅ [OAuth] Gmail token refreshed');

            return {
                accessToken: credentials.access_token,
                refreshToken: credentials.refresh_token || refreshToken,
                expiresAt,
            };
        } catch (error: any) {
            console.error('❌ [OAuth] Gmail token refresh failed:', error.message);
            throw new Error(`Failed to refresh Gmail token: ${error.message}`);
        }
    }

    /**
     * Revoke Gmail tokens
     */
    async revokeGmailToken(accessToken: string): Promise<void> {
        try {
            const oauth2Client = new google.auth.OAuth2(
                GMAIL_CLIENT_ID,
                GMAIL_CLIENT_SECRET,
                GMAIL_REDIRECT_URI
            );

            await oauth2Client.revokeToken(accessToken);
            console.log('✅ [OAuth] Gmail token revoked');
        } catch (error: any) {
            console.error('❌ [OAuth] Gmail token revocation failed:', error.message);
            throw new Error(`Failed to revoke Gmail token: ${error.message}`);
        }
    }

    /**
     * Get Outlook OAuth authorization URL
     */
    getOutlookAuthUrl(state?: string): string {
        if (!OUTLOOK_CLIENT_ID || !OUTLOOK_CLIENT_SECRET) {
            throw new Error('Outlook OAuth not configured. Set OUTLOOK_CLIENT_ID and OUTLOOK_CLIENT_SECRET in .env');
        }

        const scopes = [
            'https://graph.microsoft.com/Mail.Read',
            'https://graph.microsoft.com/Mail.Send',
            'https://graph.microsoft.com/Mail.ReadWrite',
            'https://graph.microsoft.com/User.Read',
            'offline_access',
        ];

        const params = new URLSearchParams({
            client_id: OUTLOOK_CLIENT_ID,
            response_type: 'code',
            redirect_uri: OUTLOOK_REDIRECT_URI,
            scope: scopes.join(' '),
            state: state || '',
            response_mode: 'query',
        });

        const url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;

        console.log('🔐 [OAuth] Generated Outlook auth URL');
        return url;
    }

    /**
     * Exchange Outlook authorization code for tokens
     */
    async exchangeOutlookCode(code: string): Promise<OAuthTokens> {
        if (!OUTLOOK_CLIENT_ID || !OUTLOOK_CLIENT_SECRET) {
            throw new Error('Outlook OAuth not configured');
        }

        try {
            const params = new URLSearchParams({
                client_id: OUTLOOK_CLIENT_ID,
                client_secret: OUTLOOK_CLIENT_SECRET,
                code,
                redirect_uri: OUTLOOK_REDIRECT_URI,
                grant_type: 'authorization_code',
            });

            const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params.toString(),
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Token exchange failed: ${error}`);
            }

            const tokens = await response.json();

            if (!tokens.access_token) {
                throw new Error('No access token received');
            }

            // Get user info from Microsoft Graph
            const client = Client.init({
                authProvider: (done) => {
                    done(null, tokens.access_token);
                },
            });

            const user = await client.api('/me').get();

            const expiresAt = new Date();
            expiresAt.setTime(Date.now() + tokens.expires_in * 1000);

            console.log(`✅ [OAuth] Outlook tokens exchanged for ${user.mail || user.userPrincipalName}`);

            return {
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token ?? undefined,
                expiresAt,
                email: user.mail || user.userPrincipalName,
                name: user.displayName,
            };
        } catch (error: any) {
            console.error('❌ [OAuth] Outlook token exchange failed:', error.message);
            throw new Error(`Outlook OAuth failed: ${error.message}`);
        }
    }

    /**
     * Refresh Outlook access token
     */
    async refreshOutlookToken(refreshToken: string): Promise<OAuthTokens> {
        if (!OUTLOOK_CLIENT_ID || !OUTLOOK_CLIENT_SECRET) {
            throw new Error('Outlook OAuth not configured');
        }

        try {
            const params = new URLSearchParams({
                client_id: OUTLOOK_CLIENT_ID,
                client_secret: OUTLOOK_CLIENT_SECRET,
                refresh_token: refreshToken,
                grant_type: 'refresh_token',
            });

            const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params.toString(),
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Token refresh failed: ${error}`);
            }

            const tokens = await response.json();

            if (!tokens.access_token) {
                throw new Error('No access token received');
            }

            const expiresAt = new Date();
            expiresAt.setTime(Date.now() + tokens.expires_in * 1000);

            console.log('✅ [OAuth] Outlook token refreshed');

            return {
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token || refreshToken,
                expiresAt,
            };
        } catch (error: any) {
            console.error('❌ [OAuth] Outlook token refresh failed:', error.message);
            throw new Error(`Failed to refresh Outlook token: ${error.message}`);
        }
    }

    /**
     * Check if OAuth is configured for a provider
     */
    isGmailConfigured(): boolean {
        return !!(GMAIL_CLIENT_ID && GMAIL_CLIENT_SECRET);
    }

    isOutlookConfigured(): boolean {
        return !!(OUTLOOK_CLIENT_ID && OUTLOOK_CLIENT_SECRET);
    }
}

// Export singleton instance
export const oauthService = new OAuthService();
