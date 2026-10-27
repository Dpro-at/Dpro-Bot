#!/usr/bin/env node
/**
 * Girru CLI
 * Command-line interface for Girru
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import readline from 'readline';

import { OLLAMA_URL, DEFAULT_OLLAMA_MODEL } from '../llm/ollama.js';

const DEFAULT_MODEL = DEFAULT_OLLAMA_MODEL;

const program = new Command();

program
  .name('agent')
  .description('Girru CLI - AI Assistant')
  .version('0.1.0');

// ============================================
// agent serve - Start API server
// ============================================
program
  .command('serve')
  .description('Start the API server')
  .option('-p, --port <port>', 'Port number', '3001')
  .action(async (options) => {
    process.env.PORT = options.port;
    console.log(chalk.blue('Starting Girru Backend...'));
    await import('../api/server.js');
  });

// ============================================
// agent models - List available models
// ============================================
program
  .command('models')
  .description('List available AI models')
  .action(async () => {
    const spinner = ora('Fetching models from Ollama...').start();

    try {
      const res = await fetch(`${OLLAMA_URL}/api/tags`);

      if (!res.ok) {
        spinner.fail('Cannot connect to Ollama');
        console.log(chalk.yellow('\nMake sure Ollama is running: ollama serve'));
        process.exit(1);
      }

      const data = await res.json() as { models: any[] };
      spinner.succeed(`Found ${data.models.length} models\n`);

      console.log(chalk.bold('Available Models:\n'));

      for (const model of data.models) {
        const size = (model.size / (1024 * 1024 * 1024)).toFixed(1);
        console.log(`  ${chalk.green('●')} ${chalk.bold(model.name)}`);
        console.log(`    Size: ${size}GB`);
        if (model.details?.parameter_size) {
          console.log(`    Parameters: ${model.details.parameter_size}`);
        }
        console.log();
      }
    } catch (error) {
      spinner.fail('Failed to connect to Ollama');
      console.log(chalk.red('\nMake sure Ollama is running: ollama serve'));
      process.exit(1);
    }
  });

// ============================================
// agent chat - Interactive chat
// ============================================
program
  .command('chat [message]')
  .description('Start interactive chat or send a single message')
  .option('-m, --model <model>', 'Model to use', DEFAULT_MODEL)
  .action(async (message, options) => {
    const model = options.model;

    // Check Ollama connection
    try {
      const res = await fetch(`${OLLAMA_URL}/api/tags`);
      if (!res.ok) throw new Error('Ollama not available');
    } catch {
      console.log(chalk.red('Cannot connect to Ollama.'));
      console.log(chalk.yellow('Make sure Ollama is running: ollama serve'));
      process.exit(1);
    }

    console.log(chalk.blue(`\nGirru Chat (model: ${model})`));
    console.log(chalk.gray('Type "exit" or Ctrl+C to quit\n'));

    const messages: { role: string; content: string }[] = [];

    // Single message mode
    if (message) {
      await sendMessage(model, [{ role: 'user', content: message }]);
      return;
    }

    // Interactive mode
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const prompt = () => {
      rl.question(chalk.cyan('You: '), async (input) => {
        const text = input.trim();

        if (text.toLowerCase() === 'exit' || text.toLowerCase() === 'quit') {
          console.log(chalk.gray('\nGoodbye!'));
          rl.close();
          process.exit(0);
        }

        if (!text) {
          prompt();
          return;
        }

        messages.push({ role: 'user', content: text });

        process.stdout.write(chalk.green('Agent: '));
        const response = await sendMessage(model, messages, true);
        messages.push({ role: 'assistant', content: response });
        console.log();

        prompt();
      });
    };

    prompt();
  });

// Send message to Ollama and stream response
async function sendMessage(
  model: string,
  messages: { role: string; content: string }[],
  returnContent = false
): Promise<string> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, stream: true })
    });

    if (!res.ok) {
      console.log(chalk.red(`\nError: ${res.statusText}`));
      return '';
    }

    const reader = res.body?.getReader();
    if (!reader) return '';

    const decoder = new TextDecoder();
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(l => l.trim());

      for (const line of lines) {
        try {
          const json = JSON.parse(line);
          if (json.message?.content) {
            process.stdout.write(json.message.content);
            fullContent += json.message.content;
          }
        } catch {
          // Skip
        }
      }
    }

    if (!returnContent) {
      console.log();
    }

    return fullContent;
  } catch (error: any) {
    console.log(chalk.red(`\nError: ${error.message}`));
    return '';
  }
}

// Parse and run
program.parse();
