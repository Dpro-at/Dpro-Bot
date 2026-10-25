/**
 * IMAP Service
 *
 * Handles IMAP connections and email operations:
 * - Connect to IMAP servers
 * - List folders
 * - Fetch emails
 * - Download attachments
 * - Mark as read/unread
 * - Move/delete emails
 */

import imaps from 'imap-simple';
import { simpleParser, ParsedMail, Attachment, AddressObject } from 'mailparser';

/** Flatten a parsed address header to plain { address, name } pairs, skipping empty addresses. */
function addressList(header: AddressObject | AddressObject[] | undefined): { address: string; name?: string }[] {
    return (Array.isArray(header) ? header : header ? [header] : [])
        .flatMap((group) => group.value)
        .filter((entry) => !!entry.address)
        .map((entry) => ({ address: entry.address as string, name: entry.name || undefined }));
}
import { decryptAccountCredentials } from './email-encryption.js';
import type { Config } from 'imap-simple';

export interface IMAPAccount {
    id: string;
    email: string;
    imap_host: string;
    imap_port: number;
    imap_user: string;
    imap_pass_encrypted: string;
    imap_tls: number;
    oauth_access_token?: string | null;
}

export interface EmailFolder {
    name: string;
    path: string;
    delimiter: string;
    flags: string[];
    children?: EmailFolder[];
}

export interface EmailMessage {
    uid: number;
    flags: string[];
    messageId: string;
    from: { address: string; name?: string }[];
    to: { address: string; name?: string }[];
    cc?: { address: string; name?: string }[];
    bcc?: { address: string; name?: string }[];
    subject?: string;
    date: Date;
    textPlain?: string;
    textHtml?: string;
    attachments: EmailAttachment[];
    hasAttachments: boolean;
    size: number;
}

export interface EmailAttachment {
    filename: string;
    contentType: string;
    size: number;
    partId: string;
}

export class IMAPService {
    /**
     * Create IMAP connection config
     */
    private createConfig(account: IMAPAccount): Config {
        const credentials = decryptAccountCredentials({
            imap_pass_encrypted: account.imap_pass_encrypted,
            smtp_pass_encrypted: '', // Not needed for IMAP
            oauth_access_token: account.oauth_access_token,
            oauth_refresh_token: null,
        });

        const config: Config = {
            imap: {
                user: account.imap_user,
                password: credentials.imapPassword,
                host: account.imap_host,
                port: account.imap_port,
                tls: account.imap_tls === 1,
                authTimeout: 10000,
                tlsOptions: {
                    rejectUnauthorized: false, // Allow self-signed certificates
                },
            },
        };

        // If OAuth token exists, use XOAUTH2 authentication
        if (credentials.oauthAccessToken) {
            config.imap.xoauth2 = credentials.oauthAccessToken;
        }

        return config;
    }

    /**
     * Connect to IMAP server
     */
    async connect(account: IMAPAccount): Promise<any> {
        try {
            const config = this.createConfig(account);
            const connection = await imaps.connect(config);
            console.log(`✅ [IMAP] Connected to ${account.email}`);
            return connection;
        } catch (error: any) {
            console.error(`❌ [IMAP] Connection failed for ${account.email}:`, error.message);
            throw new Error(`IMAP connection failed: ${error.message}`);
        }
    }

    /**
     * List all folders
     */
    async listFolders(connection: any): Promise<EmailFolder[]> {
        try {
            const boxes = await connection.getBoxes();
            const folders: EmailFolder[] = [];

            const parseBoxes = (boxes: any, parentPath = ''): EmailFolder[] => {
                const result: EmailFolder[] = [];

                for (const [name, box] of Object.entries(boxes)) {
                    const folder: EmailFolder = {
                        name,
                        path: parentPath ? `${parentPath}${box.delimiter}${name}` : name,
                        delimiter: box.delimiter,
                        flags: box.attribs || [],
                        children: box.children ? parseBoxes(box.children, name) : undefined,
                    };
                    result.push(folder);
                }

                return result;
            };

            return parseBoxes(boxes);
        } catch (error: any) {
            console.error('❌ [IMAP] Failed to list folders:', error.message);
            throw new Error(`Failed to list folders: ${error.message}`);
        }
    }

    /**
     * Fetch emails from a folder
     */
    async fetchEmails(
        connection: any,
        folderPath: string,
        options: {
            limit?: number;
            offset?: number;
            since?: Date;
            unseen?: boolean;
        } = {}
    ): Promise<EmailMessage[]> {
        try {
            await connection.openBox(folderPath);

            // Build search criteria
            const searchCriteria: any[] = ['ALL'];
            if (options.since) {
                searchCriteria.push(['SINCE', options.since]);
            }
            if (options.unseen) {
                searchCriteria.push('UNSEEN');
            }

            // Fetch options
            const fetchOptions = {
                bodies: ['HEADER', 'TEXT', ''],
                struct: true,
                markSeen: false,
            };

            const messages = await connection.search(searchCriteria, fetchOptions);

            // Parse messages
            const emails: EmailMessage[] = [];

            for (const item of messages) {
                try {
                    const allParts = item.parts.find((part: any) => part.which === '');
                    if (!allParts || !allParts.body) continue;

                    const parsed: ParsedMail = await simpleParser(allParts.body);

                    // Extract attachments info
                    const attachments: EmailAttachment[] = (parsed.attachments || []).map((att: Attachment, idx: number) => ({
                        filename: att.filename || `attachment-${idx}`,
                        contentType: att.contentType || 'application/octet-stream',
                        size: att.size || 0,
                        partId: att.contentId || `${idx}`,
                    }));

                    const email: EmailMessage = {
                        uid: item.attributes.uid,
                        flags: item.attributes.flags || [],
                        messageId: parsed.messageId || `${item.attributes.uid}@${folderPath}`,
                        from: addressList(parsed.from),
                        to: addressList(parsed.to),
                        cc: parsed.cc ? addressList(parsed.cc) : undefined,
                        bcc: parsed.bcc ? addressList(parsed.bcc) : undefined,
                        subject: parsed.subject,
                        date: parsed.date || new Date(),
                        textPlain: parsed.text,
                        textHtml: parsed.html !== false ? parsed.html as string : undefined,
                        attachments,
                        hasAttachments: attachments.length > 0,
                        size: allParts.body.length || 0,
                    };

                    emails.push(email);
                } catch (parseError) {
                    console.error('❌ [IMAP] Failed to parse email:', parseError);
                    continue;
                }
            }

            console.log(`✅ [IMAP] Fetched ${emails.length} emails from ${folderPath}`);
            return emails;
        } catch (error: any) {
            console.error(`❌ [IMAP] Failed to fetch emails from ${folderPath}:`, error.message);
            throw new Error(`Failed to fetch emails: ${error.message}`);
        }
    }

    /**
     * Mark email as read/unread
     */
    async markAsRead(connection: any, folderPath: string, uid: number, read: boolean): Promise<void> {
        try {
            await connection.openBox(folderPath);

            if (read) {
                await connection.addFlags(uid, '\\Seen');
            } else {
                await connection.delFlags(uid, '\\Seen');
            }

            console.log(`✅ [IMAP] Marked email ${uid} as ${read ? 'read' : 'unread'}`);
        } catch (error: any) {
            console.error(`❌ [IMAP] Failed to mark email as ${read ? 'read' : 'unread'}:`, error.message);
            throw new Error(`Failed to mark email: ${error.message}`);
        }
    }

    /**
     * Move email to another folder
     */
    async moveEmail(connection: any, fromFolder: string, toFolder: string, uid: number): Promise<void> {
        try {
            await connection.openBox(fromFolder);
            await connection.moveMessage(uid, toFolder);
            console.log(`✅ [IMAP] Moved email ${uid} from ${fromFolder} to ${toFolder}`);
        } catch (error: any) {
            console.error(`❌ [IMAP] Failed to move email:`, error.message);
            throw new Error(`Failed to move email: ${error.message}`);
        }
    }

    /**
     * Delete email (move to Trash or permanently delete)
     */
    async deleteEmail(connection: any, folderPath: string, uid: number, permanent = false): Promise<void> {
        try {
            await connection.openBox(folderPath);

            if (permanent) {
                await connection.addFlags(uid, '\\Deleted');
                await connection.imap.expunge();
                console.log(`✅ [IMAP] Permanently deleted email ${uid}`);
            } else {
                // Move to Trash folder
                await connection.moveMessage(uid, 'Trash');
                console.log(`✅ [IMAP] Moved email ${uid} to Trash`);
            }
        } catch (error: any) {
            console.error(`❌ [IMAP] Failed to delete email:`, error.message);
            throw new Error(`Failed to delete email: ${error.message}`);
        }
    }

    /**
     * Download attachment
     */
    async downloadAttachment(connection: any, folderPath: string, uid: number, partId: string): Promise<Buffer> {
        try {
            await connection.openBox(folderPath);

            const messages = await connection.search([['UID', uid]], {
                bodies: [partId],
                struct: true,
            });

            if (messages.length === 0) {
                throw new Error('Email not found');
            }

            const part = messages[0].parts.find((p: any) => p.which === partId);
            if (!part) {
                throw new Error('Attachment part not found');
            }

            console.log(`✅ [IMAP] Downloaded attachment from email ${uid}`);
            return Buffer.from(part.body);
        } catch (error: any) {
            console.error(`❌ [IMAP] Failed to download attachment:`, error.message);
            throw new Error(`Failed to download attachment: ${error.message}`);
        }
    }

    /**
     * Close connection
     */
    async disconnect(connection: any): Promise<void> {
        try {
            await connection.end();
            console.log('✅ [IMAP] Connection closed');
        } catch (error: any) {
            console.error('❌ [IMAP] Failed to close connection:', error.message);
        }
    }

    /**
     * Test connection
     */
    async testConnection(account: IMAPAccount): Promise<boolean> {
        let connection;
        try {
            connection = await this.connect(account);
            await this.listFolders(connection);
            return true;
        } catch (error) {
            return false;
        } finally {
            if (connection) {
                await this.disconnect(connection);
            }
        }
    }
}

// Export singleton instance
export const imapService = new IMAPService();
