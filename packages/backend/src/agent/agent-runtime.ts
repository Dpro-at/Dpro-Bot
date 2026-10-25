/**
 * Agent Runtime - Main Orchestrator
 *
 * Coordinates all agent components:
 * - SmartPromptBuilder (layered prompts)
 * - RequestAnalyzer (intent detection)
 * - SkillsSelector (smart selection)
 * - LLM Integration (Ollama/Anthropic/OpenAI)
 * - Tool Execution
 * - Learning System
 *
 * Innovation: Intelligent orchestration with minimal token usage
 *
 * @author Dpro Bot Team
 * @license MIT
 */

import {
  Message,
  PromptBuildParams,
  SystemPrompt,
  RequestAnalysis,
  SkillSelectionResult,
  PerformanceMetrics,
  AgentConfig,
  Skill,
} from './types.js';
import { SmartPromptBuilder } from './smart-prompt-builder.js';
import { RequestAnalyzer } from './request-analyzer.js';
import { SkillsSelector } from './skills-selector.js';
import { createToolsRegistry, ToolsRegistry } from '../tools/index.js';

export interface AgentResponse {
  content: string;
  toolCalls?: Array<{
    tool: string;
    arguments: Record<string, unknown>;
    result?: unknown;
  }>;
  skillsUsed?: string[];
  analysis: RequestAnalysis;
  systemPrompt: SystemPrompt;
  metrics: PerformanceMetrics;
}

export class AgentRuntime {
  private promptBuilder: SmartPromptBuilder;
  private requestAnalyzer: RequestAnalyzer;
  private skillsSelector: SkillsSelector;
  private toolsRegistry: ToolsRegistry;
  private config: AgentConfig;

  // Available skills (loaded from registry)
  private availableSkills: Skill[] = [];

  constructor(config?: Partial<AgentConfig>) {
    // Initialize components
    this.promptBuilder = new SmartPromptBuilder();
    this.requestAnalyzer = new RequestAnalyzer();
    this.skillsSelector = new SkillsSelector();

    // Initialize Tools Registry with 4 core tools
    this.toolsRegistry = createToolsRegistry({
      workspaceDir: process.cwd(),
      timeout: 30000,
    });

    // Default configuration
    this.config = {
      prompt: {
        maxTokens: 800,
        includeMemory: true,
        includeContext: true,
        adaptiveTone: true,
      },
      skills: {
        maxSelected: 5,
        confidenceThreshold: 0.5,
        enableLearning: true,
      },
      tools: {
        alwaysInclude: ['read_file', 'write_file'],
        contextualEnabled: true,
      },
      performance: {
        enableCaching: true,
        cacheTimeout: 300, // 5 minutes
        enableMetrics: true,
      },
      learning: {
        enabled: true,
        feedbackWeight: 0.8,
        minInteractionsForUpdate: 3,
      },
      ...config,
    };
  }

  /**
   * Process a user message and generate response
   * Main entry point for agent interaction
   */
  async process(params: PromptBuildParams): Promise<AgentResponse> {
    const startTime = Date.now();
    const metrics: Partial<PerformanceMetrics> = {};

    try {
      // Step 1: Analyze the request
      console.log('[Agent] Analyzing request...');
      const analysisStart = Date.now();
      const analysis = await this.requestAnalyzer.analyze(params);
      metrics.requestAnalysisTime = Date.now() - analysisStart;

      console.log('[Agent] Analysis:', this.requestAnalyzer.getAnalysisReport(analysis));

      // Step 2: Select relevant skills
      console.log('[Agent] Selecting skills...');
      const skillsStart = Date.now();
      const skillSelection = await this.skillsSelector.select(
        analysis,
        this.availableSkills
      );
      metrics.skillSelectionTime = Date.now() - skillsStart;

      console.log('[Agent] Selected skills:', skillSelection.reasoning);

      // Step 3: Build smart prompt
      console.log('[Agent] Building prompt...');
      const promptStart = Date.now();
      const systemPrompt = await this.promptBuilder.build(params);
      metrics.promptBuildTime = Date.now() - promptStart;

      console.log('[Agent] Prompt built:', systemPrompt.metadata);

      // Step 4: Prepare messages for LLM
      const messages = this.prepareMessages(params, systemPrompt);

      // Step 5: Call LLM
      console.log('[Agent] Calling LLM...');
      const llmStart = Date.now();
      const response = await this.callLLM(messages, analysis);
      const llmTime = Date.now() - llmStart;

      console.log('[Agent] LLM response received in', llmTime, 'ms');

      // Step 6: Process tool calls if any
      const skillsUsed: string[] = [];
      let finalContent = response.content;

      if (response.toolCalls && response.toolCalls.length > 0) {
        console.log('[Agent] 🔧 Executing', response.toolCalls.length, 'tool(s)...');

        // Execute each tool call
        for (const toolCall of response.toolCalls) {
          console.log('[Agent] Tool call:', toolCall.tool, toolCall.arguments);

          try {
            // Execute the tool
            const toolResult = await this.toolsRegistry.execute(
              toolCall.tool,
              toolCall.arguments
            );

            // Store result
            toolCall.result = toolResult;

            // Track which skills were used (tools often correspond to skills)
            if (toolCall.tool === 'exec') {
              // Extract skill from command if possible
              skillsUsed.push('exec-tool');
            }

            console.log('[Agent] ✅ Tool executed:', toolCall.tool);
          } catch (error: any) {
            console.error('[Agent] ❌ Tool execution error:', error);
            toolCall.result = {
              content: [{ type: 'text', text: `Error: ${error.message}` }],
              error: error.message,
            };
          }
        }

        // If tools were executed, we might need to continue the conversation
        // For now, we'll just return the original response + tool results
        finalContent = this.formatResponseWithTools(response.content, response.toolCalls);
      }

      // Calculate final metrics
      const totalTime = Date.now() - startTime;
      metrics.totalTokens = systemPrompt.metadata.tokenCount;

      const finalMetrics: PerformanceMetrics = {
        promptBuildTime: metrics.promptBuildTime!,
        requestAnalysisTime: metrics.requestAnalysisTime!,
        skillSelectionTime: metrics.skillSelectionTime!,
        toolSelectionTime: 0, // TODO
        totalTokens: metrics.totalTokens!,
        cacheHits: 0, // TODO
        cacheMisses: 0, // TODO
      };

      console.log('[Agent] Total processing time:', totalTime, 'ms');
      console.log('[Agent] Performance:', finalMetrics);

      return {
        content: finalContent,
        toolCalls: response.toolCalls,
        skillsUsed,
        analysis,
        systemPrompt,
        metrics: finalMetrics,
      };
    } catch (error) {
      console.error('[Agent] Error processing request:', error);
      throw error;
    }
  }

  /**
   * Prepare messages array for LLM
   * Includes system prompt and conversation history
   */
  private prepareMessages(
    params: PromptBuildParams,
    systemPrompt: SystemPrompt
  ): Message[] {
    const messages: Message[] = [];

    // Add system prompt
    messages.push({
      role: 'system',
      content: systemPrompt.full,
    });

    // Add conversation history (last N messages)
    const maxHistory = 10;
    const recentHistory = params.history.slice(-maxHistory);
    messages.push(...recentHistory);

    // Add current user message
    messages.push({
      role: 'user',
      content: params.message,
    });

    return messages;
  }

  /**
   * Call LLM (Ollama/Anthropic/OpenAI)
   * Returns generated response
   */
  private async callLLM(
    messages: Message[],
    analysis: RequestAnalysis
  ): Promise<{ content: string; toolCalls?: any[] }> {
    // For now, return mock response
    // In production, this would call actual LLM API

    // Determine which model to use based on complexity
    const model = this.selectModel(analysis.complexity);

    console.log('[Agent] Using model:', model);

    // TODO: Implement actual LLM call
    // const response = await fetch('http://localhost:11434/v1/chat/completions', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     model,
    //     messages,
    //     stream: false,
    //   }),
    // });

    // Mock response for now
    return {
      content: `I understand you want to: ${messages[messages.length - 1].content}. ` +
               `Based on my analysis, this is a ${analysis.complexity} ${analysis.intent} in ${analysis.language}. ` +
               `Let me help you with that.`,
    };
  }

  /**
   * Select appropriate model based on request complexity
   */
  private selectModel(complexity: 'simple' | 'medium' | 'complex'): string {
    // Simple requests: fast model
    if (complexity === 'simple') {
      return process.env.LOCAL_MODEL_NAME || 'qwen2.5:latest';
    }

    // Complex requests: powerful model
    if (complexity === 'complex') {
      return 'claude-sonnet-4-5-20250929'; // or GPT-4
    }

    // Medium: balanced
    return process.env.LOCAL_MODEL_NAME || 'qwen2.5:latest';
  }

  /**
   * Stream LLM response (for real-time UI updates)
   */
  async *processStream(params: PromptBuildParams): AsyncGenerator<string, void, unknown> {
    // Similar to process() but yields chunks as they arrive

    // For now, simulate streaming
    const response = await this.process(params);
    const words = response.content.split(' ');

    for (const word of words) {
      yield word + ' ';
      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  /**
   * Load available skills from registry
   * Called on startup and when skills are updated
   */
  async loadSkills(skills: Skill[]): Promise<void> {
    this.availableSkills = skills;
    console.log(`[Agent] Loaded ${skills.length} skills`);
  }

  /**
   * Reload configuration
   */
  updateConfig(config: Partial<AgentConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };
    console.log('[Agent] Configuration updated');
  }

  /**
   * Get current configuration
   */
  getConfig(): AgentConfig {
    return { ...this.config };
  }

  /**
   * Record feedback for learning
   */
  async recordFeedback(feedback: {
    interactionId: string;
    skillUsed?: string;
    success: boolean;
    userFeedback?: 'positive' | 'negative' | 'neutral';
  }): Promise<void> {
    if (!this.config.learning.enabled) return;

    await this.skillsSelector.recordFeedback({
      ...feedback,
      timestamp: new Date(),
    });

    console.log('[Agent] Feedback recorded:', feedback);
  }

  /**
   * Get learning statistics
   */
  getLearningStats() {
    return this.skillsSelector.getStatistics();
  }

  /**
   * Export learning data for backup
   */
  exportLearning() {
    return this.skillsSelector.exportLearningData();
  }

  /**
   * Import learning data from backup
   */
  importLearning(data: Record<string, Record<string, number>>) {
    this.skillsSelector.importLearningData(data);
    console.log('[Agent] Learning data imported');
  }

  /**
   * Format response with tool results
   */
  private formatResponseWithTools(content: string, toolCalls: any[]): string {
    let formatted = content;

    // Append tool results to response
    for (const toolCall of toolCalls) {
      if (toolCall.result && toolCall.result.content) {
        const resultText = toolCall.result.content
          .map((c: any) => c.text)
          .join('\n');

        formatted += `\n\n**Tool: ${toolCall.tool}**\n${resultText}`;
      }
    }

    return formatted;
  }

  /**
   * Get available tools (for API/UI)
   */
  getAvailableTools() {
    return this.toolsRegistry.getToolsForAPI();
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    components: Record<string, boolean>;
    skillsLoaded: number;
    toolsLoaded: number;
  }> {
    return {
      status: 'healthy',
      components: {
        promptBuilder: true,
        requestAnalyzer: true,
        skillsSelector: true,
        toolsRegistry: true,
        llm: true, // TODO: actual LLM health check
      },
      skillsLoaded: this.availableSkills.length,
      toolsLoaded: this.toolsRegistry.getAll().length,
    };
  }
}
