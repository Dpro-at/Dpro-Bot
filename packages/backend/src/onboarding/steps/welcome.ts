/**
 * Welcome Step
 */

import * as prompts from '@clack/prompts';
import chalk from 'chalk';

export async function welcomeStep(): Promise<void> {
  console.log(chalk.cyan(`
╔═══════════════════════════════════════════╗
║     Welcome to Girru! 👋           ║
╠═══════════════════════════════════════════╣
║                                           ║
║  Your personal AI assistant that works    ║
║  everywhere - WhatsApp, Telegram, Web.    ║
║                                           ║
║  Let's get you set up in 3 minutes!      ║
║                                           ║
╚═══════════════════════════════════════════╝
`));

  const shouldContinue = await prompts.confirm({
    message: 'Ready to start?',
    initialValue: true
  });

  if (!shouldContinue) {
    throw new Error('User cancelled');
  }
}
