import { createPersonalityMock, fictionalPersonalityLibrary } from './personality-mock';
import { personalityRoute } from './personality-contract.js';
import { createChatMock } from './chat-mock';
import { createAgentsMock } from './agents-mock';
import { createBoardMock } from './board-mock';
import { createConversationsMock } from './conversations-mock';
import { createCardMock } from './card-mock';
import { cardRoute } from './agent-card-contract.js';
import { conversationRoute } from './conversation-contract.js';
import { chatBoardRoute } from './chat-board-contract.js';
import { chatSearchRoute } from './chat-search-contract.js';
import { chatExportRoute } from './chat-export-contract.js';
import { chatSecretsRoute, CLEANUP_PATH, SECRETS_PATH } from './chat-secrets-contract.js';
import { allowedRequest } from './session';
import { OWNER_SETUP_PATH } from './owner-setup-contract.js';
import { createMemoryMock } from './memory-mock';
import { createChatMemoryMock } from './chat-memory-mock';
import type { WireTransport } from './session';

/** Explicit offline exercise only. Never wrap this around a failed live transport. */
export function createLoginMock(agents = createAgentsMock(), setup: 'existing-owner' | 'first-run' | 'error' = 'existing-owner', chatMemory = createChatMemoryMock()): WireTransport {
  const memory = createMemoryMock();
  const personality = createPersonalityMock();
  const board = createBoardMock();
  const chat = createChatMock();
  const conversations = createConversationsMock();
  const card = createCardMock();
  let serial = 0;
  let active = '';
  const user = { id: 'mock-owner', email: 'demo@example.invalid', username: 'Offline demo', role: 'owner' };
  let password = 'mock-only';
  return async request => {
    if (!allowedRequest(request.method, request.path, request.body) || Object.keys(request.headers).some(k => k !== 'Authorization' && !(request.path === '/api/chat' && k === 'Idempotency-Key'))) return { status: 400, body: null };
    if (request.signal.aborted) throw new Error('cancelled');
    if (request.path === '/api/setup/status') {
      if (Object.keys(request.headers).length) return { status: 400, body: null };
      if (setup === 'error') return { status: 503, body: null };
      const complete = setup === 'existing-owner';
      return { status: 200, body: { setupComplete: complete, setupRequired: !complete, message: complete ? 'Setup already completed' : 'Setup required' } };
    }
    // INSTALLER-07 offline exercise: any well-formed fictional setup code works once.
    if (request.path === OWNER_SETUP_PATH && request.method === 'POST') {
      if (Object.keys(request.headers).length) return { status: 400, body: null };
      if (setup !== 'first-run') return { status: 403, body: { code: 'setup_complete' } };
      const body = request.body as { email: string; password: string };
      user.email = body.email; password = body.password; setup = 'existing-owner';
      return { status: 200, body: { success: true } };
    }
    if (request.path === '/api/auth/login' && request.method === 'POST') {
      if (setup !== 'existing-owner') return { status: 401, body: null };
      const body = request.body as { email?: string; password?: string };
      if (body.email !== user.email || body.password !== password) return { status: 401, body: null };
      active = `fictional-session-${++serial}`;
      return { status: 200, body: { user, token: active, deviceToken: `fictional-device-${serial}`.padEnd(43, '_') } };
    }
    if (!active || request.headers.Authorization !== `Bearer ${active}`) return { status: 401, body: null };
    if (request.method === 'GET' && request.path === '/api/personality-library') return { status: 200, body: { personalities: fictionalPersonalityLibrary() } };
    if (request.path === '/api/chat') return chat(request);
    if (request.path === '/api/auth/me') return { status: 200, body: { user } };
    if (request.path === '/api/auth/logout') { active = ''; return { status: 200, body: { success: true } }; }
    if (personalityRoute(request.path)) return personality.transport(request);
    if (request.path === '/api/boards' || request.path.startsWith('/api/boards/') || chatBoardRoute(request.path)) return board(request);
    if (chatMemory.handles(request.path)) return chatMemory.transport(request);
    if (conversationRoute(request.path) || chatSearchRoute(request.path) || chatExportRoute(request.path)) return conversations(request);
    // CHAT-SECRETS-01: offline practice has no key store; nothing is saved.
    if (chatSecretsRoute(request.path)) {
      if (request.path === SECRETS_PATH) return { status: 200, body: { secrets: [] } };
      if (request.path === CLEANUP_PATH) return { status: 200, body: { report: { conversations: 0, messages: 0, secrets: 0, applied: (request.body as { apply?: boolean })?.apply === true } } };
      return { status: 404, body: { error: 'Not found', code: 'not_found' } };
    }
    if (cardRoute(request.path)) return card(request);
    if (request.path === '/api/agents' || request.path.startsWith('/api/agents/') || request.path.startsWith('/api/onboarding/team-')) return agents.transport(request);
    if (request.path.startsWith('/api/memory/')) return memory.transport(request);
    // A permission failure exercises protected-content clearing without simulating sign-out.
    return { status: 403, body: null };
  };
}
