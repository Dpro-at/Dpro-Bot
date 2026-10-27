/**
 * Email Configuration API Routes
 * Test and verify SMTP settings
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';
import { getUserIdFromRequest } from '../../auth/jwt.js';
import { emailService } from '../../services/email-service.js';

interface SendTestEmailBody {
    to: string;
}

export async function registerEmailRoutes(fastify: FastifyInstance) {
    // Get email configuration status
    fastify.get('/api/email/status', async (request: FastifyRequest, reply) => {
        try {
            getUserIdFromRequest(request); // Require authentication
        } catch {
            return reply.code(401).send({ error: 'Unauthorized' });
        }

        const isConfigured = emailService.isConfigured();

        return {
            configured: isConfigured,
            message: isConfigured
                ? 'Email service is configured and ready'
                : 'Email service is not configured. Set SMTP environment variables.',
        };
    });

    // Verify SMTP connection
    fastify.post('/api/email/verify', async (request: FastifyRequest, reply) => {
        try {
            getUserIdFromRequest(request); // Require authentication
        } catch {
            return reply.code(401).send({ error: 'Unauthorized' });
        }

        if (!emailService.isConfigured()) {
            return reply.code(400).send({
                error: 'Email service not configured',
                message: 'Please configure SMTP settings in environment variables',
            });
        }

        const verified = await emailService.verify();

        return {
            success: verified,
            message: verified
                ? 'SMTP connection verified successfully'
                : 'SMTP connection failed. Check your configuration.',
        };
    });

    // Send test email
    fastify.post<{ Body: SendTestEmailBody }>('/api/email/test', async (request, reply) => {
        try {
            getUserIdFromRequest(request); // Require authentication
        } catch {
            return reply.code(401).send({ error: 'Unauthorized' });
        }

        const { to } = request.body;

        if (!to) {
            return reply.code(400).send({ error: 'Email address is required' });
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(to)) {
            return reply.code(400).send({ error: 'Invalid email address' });
        }

        if (!emailService.isConfigured()) {
            return reply.code(400).send({
                error: 'Email service not configured',
                message: 'Please configure SMTP settings in environment variables',
            });
        }

        const sent = await emailService.sendTestEmail(to);

        if (sent) {
            return {
                success: true,
                message: `Test email sent to ${to}`,
            };
        } else {
            return reply.code(500).send({
                error: 'Failed to send test email',
                message: 'Check server logs for details',
            });
        }
    });
}
