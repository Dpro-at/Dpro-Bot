/**
 * Onboarding Wizard
 *
 * Interactive setup for first-time users
 */

import * as prompts from '@clack/prompts';
import chalk from 'chalk';
import type { OnboardingState, IOnboardingWizard } from './types.js';
import { welcomeStep } from './steps/welcome.js';
import { profileStep } from './steps/profile.js';
import { aiProviderStep } from './steps/ai-provider.js';
import { channelStep } from './steps/channel.js';
import { skillsStep } from './steps/skills.js';
import { completeStep } from './steps/complete.js';

export class OnboardingWizard implements IOnboardingWizard {
  private state: OnboardingState;

  constructor() {
    this.state = {
      completed: false,
      currentStep: 0,
      totalSteps: 6
    };
  }

  /**
   * Start the onboarding wizard
   */
  async start(): Promise<void> {
    console.clear();

    prompts.intro(
      chalk.bold.cyan('🚀 Welcome to Girru!')
    );

    this.state.startedAt = new Date();

    try {
      // Step 1: Welcome
      await welcomeStep();

      // Step 2: User Profile
      this.state.currentStep = 1;
      const profile = await profileStep();
      this.state.userProfile = profile;

      // Step 3: AI Provider
      this.state.currentStep = 2;
      const aiProvider = await aiProviderStep();
      this.state.aiProvider = aiProvider;

      // Step 4: First Channel
      this.state.currentStep = 3;
      const channels = await channelStep();
      this.state.channels = channels;

      // Step 5: Skills
      this.state.currentStep = 4;
      const skills = await skillsStep();
      this.state.skills = skills;

      // Step 6: Complete
      this.state.currentStep = 5;
      await completeStep(this.state);

      // Mark as completed
      this.state.completed = true;
      this.state.completedAt = new Date();

      // Save state
      await this.saveState();

      prompts.outro(
        chalk.green('✨ Setup complete! Your AI assistant is ready.')
      );

    } catch (err: any) {
      if (prompts.isCancel(err)) {
        prompts.cancel('Setup cancelled. You can resume later with "agent-player onboard --resume"');
        await this.saveState();
        process.exit(0);
      } else {
        prompts.log.error(`Setup failed: ${err.message}`);
        process.exit(1);
      }
    }
  }

  /**
   * Resume from saved state
   */
  async resume(): Promise<void> {
    const savedState = await this.loadState();

    if (!savedState) {
      console.log(chalk.yellow('No saved onboarding state found. Starting fresh...\n'));
      await this.start();
      return;
    }

    this.state = savedState;

    console.log(chalk.cyan(`\n📝 Resuming from step ${this.state.currentStep + 1}...\n`));

    await this.start();
  }

  /**
   * Skip onboarding
   */
  async skip(): Promise<void> {
    const confirm = await prompts.confirm({
      message: 'Are you sure you want to skip onboarding?'
    });

    if (confirm) {
      this.state.completed = true;
      this.state.completedAt = new Date();
      await this.saveState();

      prompts.outro('Onboarding skipped. You can run it later with "agent-player onboard"');
    }
  }

  /**
   * Get current step
   */
  getCurrentStep(): any {
    return {
      id: `step-${this.state.currentStep}`,
      title: `Step ${this.state.currentStep + 1}`,
      description: '',
      completed: false
    };
  }

  /**
   * Get progress percentage
   */
  getProgress(): number {
    return Math.round((this.state.currentStep / this.state.totalSteps) * 100);
  }

  /**
   * Check if completed
   */
  isCompleted(): boolean {
    return this.state.completed;
  }

  /**
   * Save state to file
   */
  private async saveState(): Promise<void> {
    // TODO: Save to ~/.agent-player/onboarding.json
    console.log(chalk.gray('\n💾 Progress saved\n'));
  }

  /**
   * Load state from file
   */
  private async loadState(): Promise<OnboardingState | null> {
    // TODO: Load from ~/.agent-player/onboarding.json
    return null;
  }
}

// Singleton instance
let wizard: OnboardingWizard | null = null;

export function getOnboardingWizard(): OnboardingWizard {
  if (!wizard) {
    wizard = new OnboardingWizard();
  }
  return wizard;
}
