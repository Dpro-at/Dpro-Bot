/**
 * Database Seeding Script
 * Creates initial data for development (no user accounts)
 */

import { getDatabase, getRepositories } from './index.js';

export async function seedDatabase() {
  console.log('[Seed] Starting database seeding...');

  const repos = getRepositories();

  try {
    // SECURITY (S0-Q.2): no accounts with fixed passwords are seeded any more.
    // The owner is created through the setup wizard.

    // Welcome chat for the first owner, once
    const db = getDatabase();
    const ownerRow = db.prepare(
      "SELECT id FROM users WHERE role IN ('owner', 'admin') AND id NOT IN ('mock-user', '1') ORDER BY created_at LIMIT 1"
    ).get() as { id: string } | undefined;
    const ownerUser = ownerRow ? { id: ownerRow.id } : null;
    if (ownerUser) {
      const sessions = repos.sessions.findUserSessions(ownerUser.id);
      if (sessions.length === 0) {
        const session = repos.sessions.createSession({
          user_id: ownerUser.id,
          title: 'Welcome Chat',
          model: 'claude-sonnet-4-5-20250929',
          system_prompt: 'You are a helpful AI assistant.'
        });

        repos.sessions.createMessage({
          session_id: session.id,
          role: 'assistant',
          content: 'Welcome to Girru! How can I help you today?'
        });

        console.log('[Seed] ✅ Created welcome chat session');
      }
    }

    console.log('[Seed] ✅ Database seeding completed!\n');
  } catch (error) {
    console.error('[Seed] ❌ Error seeding database:', error);
    throw error;
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const { initializeDatabase } = await import('./index.js');
  await initializeDatabase();
  await seedDatabase();
  process.exit(0);
}
