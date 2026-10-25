/**
 * Agent System - TypeScript Type Definitions
 * Professional, type-safe architecture for Dpro Bot
 */

// ============================================
// Core Types
// ============================================

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  id: string;
  content: string;
  error?: string;
}

// ============================================
// Prompt Builder Types
// ============================================

export interface PromptBuildParams {
  message: string;
  userId?: string;
  sessionId: string;
  history: Message[];
  context?: SessionContext;
}

export interface SessionContext {
  recentTopics?: string[];
  activeSkills?: string[];
  conversationStyle?: 'casual' | 'technical' | 'formal';
  userPreferences?: UserPreferences;
}

export interface UserPreferences {
  language: 'en' | 'ar' | 'auto';
  tone: 'friendly' | 'professional' | 'concise' | 'detailed';
  responseLength: 'short' | 'medium' | 'long';
  codeExamples: boolean;
}

export interface SystemPrompt {
  core: string;
  skills?: string;
  tools?: string;
  memory?: string;
  context?: string;
  full: string; // Combined prompt
  metadata: PromptMetadata;
}

export interface PromptMetadata {
  tokenCount: number;
  layersIncluded: string[];
  skillsCount: number;
  toolsCount: number;
  buildTime: number; // milliseconds
}

// ============================================
// Request Analysis Types
// ============================================

export interface RequestAnalysis {
  intent: Intent;
  keywords: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  complexity: 'simple' | 'medium' | 'complex';
  language: 'en' | 'ar' | 'mixed';
  requiresTools: string[];
  requiresSkills: string[];
  context: {
    isFollowUp: boolean;
    referencesHistory: boolean;
    needsExternalData: boolean;
  };
}

export type Intent =
  | 'question'
  | 'command'
  | 'request_info'
  | 'create_content'
  | 'modify_content'
  | 'execute_task'
  | 'chat'
  | 'other';

// ============================================
// Skill Types
// ============================================

export interface Skill {
  id: string;
  name: string;
  description: string;
  location: string;
  category: SkillCategory;
  tags: string[];
  triggers?: string[];
  confidence?: number; // 0-1, added during selection
  metadata?: SkillMetadata;
}

export type SkillCategory =
  | 'development'
  | 'productivity'
  | 'communication'
  | 'utilities'
  | 'ai'
  | 'media'
  | 'data'
  | 'automation'
  | 'other';

export interface SkillMetadata {
  version: string;
  author?: string;
  requiresBins?: string[];
  requiresEnv?: string[];
  enabled: boolean;
}

export interface SkillSelectionResult {
  selected: Skill[];
  confidence: number;
  reasoning?: string;
}

// ============================================
// Tool Types
// ============================================

export interface Tool {
  name: string;
  description: string;
  category: ToolCategory;
  priority: 'essential' | 'contextual' | 'optional';
  parameters?: ToolParameter[];
}

export type ToolCategory =
  | 'file'
  | 'execution'
  | 'web'
  | 'communication'
  | 'system'
  | 'data';

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required: boolean;
  default?: unknown;
}

export interface ToolSelectionResult {
  selected: Tool[];
  reasoning?: string;
}

// ============================================
// Memory Types
// ============================================

export interface Memory {
  id: string;
  content: string;
  timestamp: Date;
  relevance?: number; // 0-1, added during recall
  source: 'user' | 'system' | 'conversation';
  metadata?: Record<string, unknown>;
}

export interface MemoryRecallResult {
  memories: Memory[];
  totalFound: number;
  searchTime: number;
}

// ============================================
// Learning Types
// ============================================

export interface LearningFeedback {
  interactionId: string;
  skillUsed?: string;
  toolUsed?: string;
  success: boolean;
  userFeedback?: 'positive' | 'negative' | 'neutral';
  correction?: string;
  timestamp: Date;
}

export interface SkillConfidenceUpdate {
  skillId: string;
  previousConfidence: number;
  newConfidence: number;
  reason: string;
}

// ============================================
// Performance Metrics
// ============================================

export interface PerformanceMetrics {
  promptBuildTime: number;
  requestAnalysisTime: number;
  skillSelectionTime: number;
  toolSelectionTime: number;
  totalTokens: number;
  cacheHits?: number;
  cacheMisses?: number;
}

// ============================================
// Configuration Types
// ============================================

export interface AgentConfig {
  // Prompt Configuration
  prompt: {
    maxTokens: number;
    includeMemory: boolean;
    includeContext: boolean;
    adaptiveTone: boolean;
  };

  // Skill Selection
  skills: {
    maxSelected: number;
    confidenceThreshold: number;
    enableLearning: boolean;
  };

  // Tool Selection
  tools: {
    alwaysInclude: string[]; // Essential tools
    contextualEnabled: boolean;
  };

  // Performance
  performance: {
    enableCaching: boolean;
    cacheTimeout: number; // seconds
    enableMetrics: boolean;
  };

  // Learning
  learning: {
    enabled: boolean;
    feedbackWeight: number; // 0-1
    minInteractionsForUpdate: number;
  };
}

// ============================================
// Error Types
// ============================================

export class AgentError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AgentError';
  }
}

export class PromptBuildError extends AgentError {
  constructor(message: string, details?: unknown) {
    super(message, 'PROMPT_BUILD_ERROR', details);
    this.name = 'PromptBuildError';
  }
}

export class SkillSelectionError extends AgentError {
  constructor(message: string, details?: unknown) {
    super(message, 'SKILL_SELECTION_ERROR', details);
    this.name = 'SkillSelectionError';
  }
}

// ============================================
// Utility Types
// ============================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<
  T,
  Exclude<keyof T, Keys>
> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
  }[Keys];
