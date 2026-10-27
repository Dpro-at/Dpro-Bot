/**
 * Complete Step
 */

import * as prompts from '@clack/prompts';
import chalk from 'chalk';
import type { OnboardingState } from '../types.js';

export async function completeStep(state: OnboardingState): Promise<void> {
  prompts.log.step(chalk.cyan('🎉 Step 5: Complete'));

  console.log(chalk.cyan(`
╔═══════════════════════════════════════════╗
║          Setup Complete! 🎉               ║
╠═══════════════════════════════════════════╣
║                                           ║
║  Your AI assistant is ready to use!      ║
║                                           ║
║  Try these commands:                      ║
║  • "What's the weather in London?"        ║
║  • "Search for TypeScript tutorials"      ║
║  • "Take a note: Buy groceries"           ║
║                                           ║
║  Access your agent:                       ║
║  📱 Send a message on WhatsApp            ║
║  🌐 Visit: http://localhost:3000          ║
║  💻 Run: agent-player chat                ║
║                                           ║
╚═══════════════════════════════════════════╝
`));

  // Summary
  console.log(chalk.bold('\n📊 Setup Summary:\n'));

  if (state.userProfile) {
    console.log(chalk.gray(`  Name: ${state.userProfile.name}`));
    console.log(chalk.gray(`  Language: ${state.userProfile.language}`));
  }

  if (state.aiProvider) {
    console.log(chalk.gray(`  AI Provider: ${state.aiProvider.provider}`));
    console.log(chalk.gray(`  Configured: ${state.aiProvider.configured ? '✓' : '✗'}`));
  }

  if (state.channels && state.channels.selected.length > 0) {
    console.log(chalk.gray(`  Channels: ${state.channels.selected.join(', ')}`));
  }

  if (state.skills && state.skills.installed.length > 0) {
    console.log(chalk.gray(`  Skills: ${state.skills.installed.length} installed`));
  }

  console.log();

  // Next steps
  const nextAction = await prompts.select({
    message: 'What would you like to do next?',
    options: [
      {
        value: 'start',
        label: 'Start Girru',
        hint: 'Recommended'
      },
      {
        value: 'dashboard',
        label: 'Open Dashboard',
        hint: 'Web interface'
      },
      {
        value: 'exit',
        label: 'Exit',
        hint: 'Start later'
      }
    ],
    initialValue: 'start'
  });

  if (prompts.isCancel(nextAction)) {
    return;
  }

  switch (nextAction) {
    case 'start':
      prompts.log.info('\nStarting Girru...');
      prompts.log.info('Run: agent-player start');
      break;

    case 'dashboard':
      prompts.log.info('\nOpening dashboard at http://localhost:3000');
      break;

    case 'exit':
      prompts.log.info('\nYou can start Girru anytime with: agent-player start');
      break;
  }
}
