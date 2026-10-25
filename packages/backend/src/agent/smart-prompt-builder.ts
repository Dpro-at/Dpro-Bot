/**
 * Smart Prompt Builder - Layered Architecture
 *
 * Layered architecture: Core + Context + User + Session
 * Token-efficient, context-aware prompt building
 *
 * @author Dpro Bot Team
 * @license MIT
 */

import {
  PromptBuildParams,
  SystemPrompt,
  PromptMetadata,
  RequestAnalysis,
  Skill,
  Tool,
  Memory,
  UserPreferences,
  SessionContext,
} from './types.js';

export class SmartPromptBuilder {
  private readonly maxCoreTokens = 200;
  private readonly maxContextTokens = 300;
  private readonly maxUserTokens = 100;
  private readonly maxSessionTokens = 200;

  /**
   * Build intelligent system prompt based on context
   * Only includes what's needed for this specific request
   */
  async build(params: PromptBuildParams): Promise<SystemPrompt> {
    const startTime = Date.now();
    const layers: string[] = [];
    const metadata: Partial<PromptMetadata> = {
      layersIncluded: [],
      skillsCount: 0,
      toolsCount: 0,
    };

    // Layer 1: Core (always included)
    const core = this.buildCoreLayer();
    layers.push(core);
    metadata.layersIncluded!.push('core');

    // Analyze request to determine what to load
    const analysis = await this.analyzeRequest(params);

    // Layer 2: Context (conditional)
    if (analysis.requiresSkills.length > 0 || analysis.requiresTools.length > 0) {
      const contextLayer = await this.buildContextLayer(analysis, params);
      if (contextLayer) {
        layers.push(contextLayer);
        metadata.layersIncluded!.push('context');
      }
    }

    // Layer 3: User preferences (if available)
    if (params.context?.userPreferences) {
      const userLayer = this.buildUserLayer(params.context.userPreferences);
      layers.push(userLayer);
      metadata.layersIncluded!.push('user');
    }

    // Layer 4: Session context (if available)
    if (params.context) {
      const sessionLayer = this.buildSessionLayer(params.context);
      if (sessionLayer) {
        layers.push(sessionLayer);
        metadata.layersIncluded!.push('session');
      }
    }

    // Combine all layers
    const full = layers.join('\n\n---\n\n');

    // Calculate metadata
    const buildTime = Date.now() - startTime;
    const tokenCount = this.estimateTokenCount(full);

    const prompt: SystemPrompt = {
      core,
      full,
      metadata: {
        tokenCount,
        layersIncluded: metadata.layersIncluded!,
        skillsCount: metadata.skillsCount!,
        toolsCount: metadata.toolsCount!,
        buildTime,
      },
    };

    return prompt;
  }

  /**
   * Layer 1: Core Identity & Capabilities
   * Always included - defines who the agent is
   */
  private buildCoreLayer(): string {
    return `# Dpro Bot - AI Assistant

You are Dpro Bot, an intelligent AI assistant designed to help users accomplish tasks efficiently.

## Core Capabilities
- Natural conversation in English and Arabic
- Execute tasks using available skills
- Use tools to interact with systems
- Learn from interactions to improve over time

## Behavior Guidelines
- Be helpful, accurate, and efficient
- Ask for clarification when needed
- Suggest skills when they can help
- Respect user preferences and context

## Response Format
- Provide clear, concise answers
- Use markdown for formatting
- Include relevant examples when helpful
- Show thinking process for complex tasks`;
  }

  /**
   * Layer 2: Context (Skills, Tools, Memory)
   * Loaded based on request analysis
   */
  private async buildContextLayer(
    analysis: RequestAnalysis,
    params: PromptBuildParams
  ): Promise<string | null> {
    const sections: string[] = [];

    // Skills section (if relevant)
    if (analysis.requiresSkills.length > 0) {
      const skills = await this.selectRelevantSkills(analysis);
      if (skills.length > 0) {
        sections.push(this.formatSkillsSection(skills));
      }
    }

    // Tools section (if needed)
    if (analysis.requiresTools.length > 0) {
      const tools = this.selectContextualTools(analysis);
      if (tools.length > 0) {
        sections.push(this.formatToolsSection(tools));
      }
    }

    // Memory section (if relevant context found)
    if (analysis.context.referencesHistory) {
      const memories = await this.recallRelevantMemories(params);
      if (memories.length > 0) {
        sections.push(this.formatMemorySection(memories));
      }
    }

    return sections.length > 0 ? sections.join('\n\n') : null;
  }

  /**
   * Layer 3: User Preferences
   * Personalization based on user settings
   */
  private buildUserLayer(preferences: UserPreferences): string {
    const parts: string[] = ['## User Preferences'];

    // Language preference
    parts.push(`- Primary Language: ${preferences.language === 'ar' ? 'Arabic' : 'English'}`);

    // Response style
    parts.push(`- Response Style: ${preferences.tone}`);
    parts.push(`- Response Length: ${preferences.responseLength}`);

    // Code examples preference
    if (preferences.codeExamples) {
      parts.push('- Include code examples when relevant');
    }

    return parts.join('\n');
  }

  /**
   * Layer 4: Session Context
   * Current conversation state
   */
  private buildSessionLayer(context: SessionContext): string | null {
    const parts: string[] = [];

    // Recent topics
    if (context.recentTopics && context.recentTopics.length > 0) {
      parts.push('## Recent Conversation');
      parts.push('Topics discussed:');
      context.recentTopics.slice(0, 3).forEach(topic => {
        parts.push(`- ${topic}`);
      });
    }

    // Active skills
    if (context.activeSkills && context.activeSkills.length > 0) {
      parts.push('\n## Active Skills');
      parts.push(`Currently using: ${context.activeSkills.join(', ')}`);
    }

    // Conversation style
    if (context.conversationStyle) {
      parts.push(`\n## Conversation Style: ${context.conversationStyle}`);
    }

    return parts.length > 0 ? parts.join('\n') : null;
  }

  /**
   * Analyze user request to determine what context is needed
   */
  private async analyzeRequest(params: PromptBuildParams): Promise<RequestAnalysis> {
    const message = params.message.toLowerCase();

    // Extract keywords
    const keywords = this.extractKeywords(message);

    // Detect intent
    const intent = this.detectIntent(message);

    // Detect language
    const language = this.detectLanguage(message);

    // Determine complexity
    const complexity = this.assessComplexity(message);

    // Identify required skills (basic matching for now)
    const requiresSkills = this.identifyRequiredSkills(message, keywords);

    // Identify required tools
    const requiresTools = this.identifyRequiredTools(message, intent);

    // Context analysis
    const context = {
      isFollowUp: params.history.length > 0,
      referencesHistory: this.referencesHistory(message),
      needsExternalData: this.needsExternalData(message),
    };

    return {
      intent,
      keywords,
      sentiment: 'neutral', // TODO: Implement sentiment analysis
      complexity,
      language,
      requiresTools,
      requiresSkills,
      context,
    };
  }

  /**
   * Select relevant skills based on request analysis
   * Returns top 3-5 most relevant skills
   */
  private async selectRelevantSkills(analysis: RequestAnalysis): Promise<Skill[]> {
    // TODO: Implement semantic skill matching with embeddings
    // For now, return mock skills based on keywords

    const allSkills: Skill[] = []; // Will be loaded from skill registry

    // Filter by relevance
    const relevant = allSkills.filter(skill => {
      // Check if skill tags match keywords
      const tagMatch = skill.tags.some(tag =>
        analysis.keywords.some(kw => tag.includes(kw))
      );

      // Check if skill triggers match
      const triggerMatch = skill.triggers?.some(trigger =>
        analysis.keywords.some(kw => trigger.includes(kw))
      );

      return tagMatch || triggerMatch;
    });

    // Sort by confidence and take top 5
    return relevant.slice(0, 5);
  }

  /**
   * Select contextual tools based on request type
   */
  private selectContextualTools(analysis: RequestAnalysis): Tool[] {
    const tools: Tool[] = [];

    // Essential tools (always available)
    const essentialTools: Tool[] = [
      {
        name: 'read_file',
        description: 'Read content from a file',
        category: 'file',
        priority: 'essential',
      },
      {
        name: 'write_file',
        description: 'Write content to a file',
        category: 'file',
        priority: 'essential',
      },
    ];
    tools.push(...essentialTools);

    // Contextual tools based on intent
    if (analysis.requiresTools.includes('web_search')) {
      tools.push({
        name: 'web_search',
        description: 'Search the web for information',
        category: 'web',
        priority: 'contextual',
      });
    }

    if (analysis.requiresTools.includes('execute_command')) {
      tools.push({
        name: 'execute_command',
        description: 'Execute a shell command',
        category: 'execution',
        priority: 'contextual',
      });
    }

    return tools;
  }

  /**
   * Recall relevant memories for this conversation
   */
  private async recallRelevantMemories(params: PromptBuildParams): Promise<Memory[]> {
    // TODO: Implement vector-based memory search
    // For now, return empty array
    return [];
  }

  /**
   * Format skills section for prompt
   */
  private formatSkillsSection(skills: Skill[]): string {
    const parts: string[] = ['## Available Skills'];

    skills.forEach(skill => {
      parts.push(`\n### ${skill.name}`);
      parts.push(skill.description);
      if (skill.triggers && skill.triggers.length > 0) {
        parts.push(`Triggers: ${skill.triggers.join(', ')}`);
      }
    });

    return parts.join('\n');
  }

  /**
   * Format tools section for prompt
   */
  private formatToolsSection(tools: Tool[]): string {
    const parts: string[] = ['## Available Tools'];

    tools.forEach(tool => {
      parts.push(`\n- **${tool.name}**: ${tool.description}`);
    });

    return parts.join('\n');
  }

  /**
   * Format memory section for prompt
   */
  private formatMemorySection(memories: Memory[]): string {
    const parts: string[] = ['## Relevant Context'];

    memories.forEach(memory => {
      parts.push(`- ${memory.content}`);
    });

    return parts.join('\n');
  }

  // ============================================
  // Helper Methods - Request Analysis
  // ============================================

  private extractKeywords(message: string): string[] {
    // Remove common stop words and extract meaningful keywords
    const stopWords = new Set([
      'the', 'is', 'at', 'which', 'on', 'a', 'an', 'as', 'are', 'was', 'were',
      'what', 'how', 'when', 'where', 'who', 'can', 'could', 'would', 'should',
    ]);

    const words = message
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word));

    return [...new Set(words)]; // Remove duplicates
  }

  private detectIntent(message: string): RequestAnalysis['intent'] {
    const lowerMessage = message.toLowerCase();

    // Question patterns
    if (/^(what|how|when|where|who|why|can|could|is|are|do|does)\b/i.test(message)) {
      return 'question';
    }

    // Command patterns
    if (/^(do|make|create|delete|remove|add|update|change|run|execute)\b/i.test(message)) {
      return 'command';
    }

    // Request patterns
    if (/please|could you|would you|can you|help me/i.test(lowerMessage)) {
      return 'request_info';
    }

    // Creation patterns
    if (/create|make|generate|build|write/i.test(lowerMessage)) {
      return 'create_content';
    }

    // Modification patterns
    if (/modify|update|change|edit|fix/i.test(lowerMessage)) {
      return 'modify_content';
    }

    // Execution patterns
    if (/run|execute|start|stop|restart/i.test(lowerMessage)) {
      return 'execute_task';
    }

    // Default to chat
    return 'chat';
  }

  private detectLanguage(message: string): 'en' | 'ar' | 'mixed' {
    const arabicChars = message.match(/[\u0600-\u06FF]/g);
    const englishChars = message.match(/[a-zA-Z]/g);

    const arabicCount = arabicChars ? arabicChars.length : 0;
    const englishCount = englishChars ? englishChars.length : 0;

    if (arabicCount > englishCount * 2) return 'ar';
    if (englishCount > arabicCount * 2) return 'en';
    return 'mixed';
  }

  private assessComplexity(message: string): 'simple' | 'medium' | 'complex' {
    const words = message.split(/\s+/).length;
    const sentences = message.split(/[.!?]+/).length;
    const hasMultipleSteps = /and then|after that|next|finally/i.test(message);

    if (words < 10 && sentences <= 1) return 'simple';
    if (hasMultipleSteps || words > 30 || sentences > 3) return 'complex';
    return 'medium';
  }

  private identifyRequiredSkills(message: string, keywords: string[]): string[] {
    const skills: string[] = [];

    // Weather skill
    if (/weather|temperature|forecast|climate/i.test(message)) {
      skills.push('weather');
    }

    // GitHub skill
    if (/github|repository|repo|pull request|pr|issue/i.test(message)) {
      skills.push('github');
    }

    // Web search skill
    if (/search|find|look up|google/i.test(message)) {
      skills.push('web-search');
    }

    // Note taking skill
    if (/note|remember|write down|save/i.test(message)) {
      skills.push('note-taking');
    }

    return skills;
  }

  private identifyRequiredTools(message: string, intent: string): string[] {
    const tools: string[] = [];

    // Web search tool
    if (/search|find online|google|browse/i.test(message)) {
      tools.push('web_search');
    }

    // File operations
    if (/read file|open file|write file|save file/i.test(message)) {
      tools.push('file_operations');
    }

    // Command execution
    if (/run|execute|command|shell/i.test(message)) {
      tools.push('execute_command');
    }

    return tools;
  }

  private referencesHistory(message: string): boolean {
    return /last time|before|previous|earlier|we discussed|you said/i.test(message);
  }

  private needsExternalData(message: string): boolean {
    return /search|find|look up|check|get data|fetch/i.test(message);
  }

  /**
   * Estimate token count (rough approximation)
   * 1 token ≈ 4 characters on average
   */
  private estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 4);
  }
}
