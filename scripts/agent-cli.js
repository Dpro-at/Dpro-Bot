#!/usr/bin/env node

/**
 * Dpro Bot CLI
 * Command-line interface for Dpro Bot
 */

const BACKEND_URL = 'http://localhost:41522';

// Colors for terminal
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function fetchAPI(endpoint, options = {}) {
  try {
    const response = await fetch(`${BACKEND_URL}${endpoint}`, options);
    return await response.json();
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    return null;
  }
}

async function getPrimaryAgent() {
  const data = await fetchAPI('/api/agents');
  if (data && data.agents) {
    const primary = data.agents.find(a => a.isPrimary);
    return primary || data.agents[0];
  }
  return null;
}

// Commands
const commands = {
  async skills() {
    log('📚 Fetching local skills...', 'cyan');
    const data = await fetchAPI('/api/skills');
    if (data && data.success) {
      const total = data.stats?.total || data.skills.length;
      log(`\n✅ Found ${total} skills:\n`, 'green');
      data.skills.forEach((skill, i) => {
        log(`${i + 1}. ${skill.name}`, 'blue');
        log(`   ${skill.description}`, 'reset');
        log(`   Triggers: ${skill.triggers?.join(', ') || 'none'}`, 'yellow');
        console.log();
      });
    }
  },

  async agents() {
    log('🤖 Fetching agents...', 'cyan');
    const data = await fetchAPI('/api/agents');
    if (data && data.agents) {
      log(`\n✅ Found ${data.agents.length} agents:\n`, 'green');
      data.agents.forEach((agent, i) => {
        log(`${i + 1}. ${agent.emoji} ${agent.name}`, 'blue');
        log(`   ID: ${agent.id}`, 'reset');
        log(`   Model: ${agent.model}`, 'yellow');
        log(`   Primary: ${agent.isPrimary ? 'Yes' : 'No'}`, 'reset');
        console.log();
      });
    }
  },

  async chat(message) {
    if (!message) {
      log('❌ Please provide a message', 'red');
      log('Usage: node agent-cli.js chat "your message here"', 'yellow');
      return;
    }

    log('💬 Fetching primary agent...', 'cyan');
    const agent = await getPrimaryAgent();
    if (!agent) {
      log('❌ No agents found. Please create an agent first.', 'red');
      return;
    }

    log(`💬 Using agent: ${agent.emoji} ${agent.name} (${agent.model})`, 'cyan');
    log('💬 Sending message...', 'cyan');

    try {
      const response = await fetch(`${BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: message }],
          model: agent.model,
          provider: agent.provider,
        }),
      });

      const text = await response.text();

      // Parse SSE stream
      const lines = text.split('\n');
      let fullResponse = '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.substring(6);
          if (jsonStr === '[DONE]') break;
          try {
            const data = JSON.parse(jsonStr);
            if (data.content) {
              fullResponse += data.content;
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }

      if (fullResponse) {
        log('\n✅ Response:', 'green');
        console.log(fullResponse);
      } else {
        log('\n⚠️  No response received', 'yellow');
      }
    } catch (error) {
      log(`❌ Error: ${error.message}`, 'red');
    }
  },

  async notify(title, message) {
    if (!title || !message) {
      log('❌ Please provide title and message', 'red');
      log('Usage: node agent-cli.js notify "Title" "Message"', 'yellow');
      return;
    }

    log('📬 Sending notification...', 'cyan');
    const data = await fetchAPI('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: '1',
        title,
        message,
        type: 'info',
        channels: ['in_app'],
      }),
    });

    if (data && data.success) {
      log('✅ Notification sent!', 'green');
    }
  },

  async marketplace() {
    log('🛒 Fetching marketplace skills...', 'cyan');
    const data = await fetchAPI('/api/skills/marketplace/available');
    if (data && data.success) {
      log(`\n✅ Found ${data.count} skills:\n`, 'green');
      data.skills.forEach((skill, i) => {
        log(`${i + 1}. ${skill.name}`, 'blue');
        log(`   Category: ${skill.category}`, 'yellow');
        log(`   Path: ${skill.path}`, 'reset');
        console.log();
      });
    } else if (data && data.error) {
      log(`❌ ${data.error}`, 'red');
    }
  },

  help() {
    log('\n📖 Dpro Bot CLI - Available Commands:\n', 'cyan');
    log('  skills              - List all local skills', 'green');
    log('  agents              - List all agents', 'green');
    log('  marketplace         - Browse skills marketplace', 'green');
    log('  chat <message>      - Send a chat message', 'green');
    log('  notify <title> <msg> - Send a notification', 'green');
    log('  help                - Show this help message', 'green');
    log('\nExamples:', 'yellow');
    log('  node agent-cli.js skills', 'reset');
    log('  node agent-cli.js chat "Hello, how are you?"', 'reset');
    log('  node agent-cli.js notify "Test" "This is a test"', 'reset');
    console.log();
  },
};

// Main
async function main() {
  const [, , command, ...args] = process.argv;

  if (!command || !commands[command]) {
    commands.help();
    return;
  }

  await commands[command](...args);
}

main();
