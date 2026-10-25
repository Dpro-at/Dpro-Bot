/**
 * Skills Selector - Smart Skill Selection with Confidence Scoring
 *
 * Selects most relevant skills for a request using:
 * - Keyword matching (tags, triggers, descriptions)
 * - Semantic similarity (future: embeddings)
 * - Confidence scoring
 * - Learning from past successes
 *
 * Returns top 2-5 most relevant skills based on confidence scoring
 *
 * @author Dpro Bot Team
 * @license MIT
 */

import {
  Skill,
  SkillSelectionResult,
  RequestAnalysis,
  LearningFeedback,
  SkillConfidenceUpdate,
} from './types.js';

export class SkillsSelector {
  // Confidence threshold - only include skills above this score
  private readonly confidenceThreshold = 0.5;

  // Maximum skills to return
  private readonly maxSkills = 5;

  // Learning data: track which skills work well for which intents/keywords
  private learningData: Map<string, Map<string, number>> = new Map();

  /**
   * Select most relevant skills for the request
   */
  async select(
    analysis: RequestAnalysis,
    availableSkills: Skill[]
  ): Promise<SkillSelectionResult> {
    // Score all skills
    const scored = availableSkills.map(skill => ({
      skill,
      confidence: this.calculateConfidence(skill, analysis),
    }));

    // Filter by confidence threshold
    const filtered = scored.filter(s => s.confidence >= this.confidenceThreshold);

    // Sort by confidence (highest first)
    const sorted = filtered.sort((a, b) => b.confidence - a.confidence);

    // Take top N
    const top = sorted.slice(0, this.maxSkills);

    // Add confidence to skills
    const selected = top.map(s => ({
      ...s.skill,
      confidence: s.confidence,
    }));

    // Build reasoning
    const reasoning = this.buildReasoning(selected, analysis);

    return {
      selected,
      confidence: this.calculateOverallConfidence(selected),
      reasoning,
    };
  }

  /**
   * Calculate confidence score for a skill given the request analysis
   * Returns: 0.0 to 1.0
   */
  private calculateConfidence(skill: Skill, analysis: RequestAnalysis): number {
    let score = 0.0;

    // 🎯 PRIORITY: If RequestAnalyzer explicitly suggested this skill, give it high confidence!
    if (analysis.requiresSkills && analysis.requiresSkills.includes(skill.id)) {
      return 0.95; // Very high confidence (95%)
    }

    const weights = {
      triggerMatch: 0.4,     // Trigger words match
      keywordMatch: 0.3,     // Keyword overlap
      categoryMatch: 0.15,   // Category relevance
      learningBonus: 0.15,   // Past success rate
    };

    // 1. Trigger match score
    if (skill.triggers && skill.triggers.length > 0) {
      const triggerScore = this.calculateTriggerMatch(skill.triggers, analysis);
      score += triggerScore * weights.triggerMatch;
    }

    // 2. Keyword match score
    const keywordScore = this.calculateKeywordMatch(skill, analysis.keywords);
    score += keywordScore * weights.keywordMatch;

    // 3. Category relevance score
    const categoryScore = this.calculateCategoryRelevance(skill.category, analysis);
    score += categoryScore * weights.categoryMatch;

    // 4. Learning bonus (if this skill has worked well before)
    const learningScore = this.getLearningScore(skill.id, analysis);
    score += learningScore * weights.learningBonus;

    return Math.min(1.0, Math.max(0.0, score));
  }

  /**
   * Calculate trigger match score
   * Checks if any trigger words appear in the message
   * Now supports fuzzy matching for typos!
   */
  private calculateTriggerMatch(triggers: string[], analysis: RequestAnalysis): number {
    const keywords = analysis.keywords.map(k => k.toLowerCase());
    let matches = 0;

    for (const trigger of triggers) {
      const triggerWords = trigger.toLowerCase().split(/\s+/);

      // Check each trigger word
      const wordMatches = triggerWords.filter(triggerWord => {
        // Exact match first (fastest)
        if (keywords.some(k => k.includes(triggerWord))) {
          return true;
        }

        // Fuzzy match for typos (using similarity)
        return keywords.some(keyword => {
          const similarity = this.calculateSimilarity(keyword, triggerWord);
          return similarity >= 0.75; // 75% similar = match (handles typos)
        });
      });

      // If most words match, count as trigger match
      if (wordMatches.length >= Math.ceil(triggerWords.length * 0.7)) {
        matches++;
      }
    }

    return Math.min(1.0, matches / Math.max(1, triggers.length));
  }

  /**
   * Calculate string similarity (0.0 to 1.0)
   * Uses Levenshtein distance ratio
   */
  private calculateSimilarity(str1: string, str2: string): number {
    // Quick checks
    if (str1 === str2) return 1.0;
    if (str1.length === 0 || str2.length === 0) return 0.0;

    // One string contains the other = high similarity
    if (str1.includes(str2) || str2.includes(str1)) {
      return Math.max(str2.length / str1.length, str1.length / str2.length);
    }

    // Levenshtein distance
    const distance = this.levenshteinDistance(str1, str2);
    const maxLen = Math.max(str1.length, str2.length);
    return 1.0 - (distance / maxLen);
  }

  /**
   * Calculate Levenshtein distance between two strings
   * Returns number of edits needed to transform str1 into str2
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    // Initialize first row and column
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    // Fill the matrix
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(
            dp[i - 1][j],     // deletion
            dp[i][j - 1],     // insertion
            dp[i - 1][j - 1]  // substitution
          );
        }
      }
    }

    return dp[m][n];
  }

  /**
   * Calculate keyword overlap score
   * Compares request keywords with skill tags and description
   */
  private calculateKeywordMatch(skill: Skill, requestKeywords: string[]): number {
    if (requestKeywords.length === 0) return 0.0;

    // Combine skill tags and description words
    const skillWords = new Set<string>();

    // Add tags
    skill.tags.forEach(tag => {
      tag.toLowerCase().split(/\s+/).forEach(word => skillWords.add(word));
    });

    // Add description words
    skill.description.toLowerCase().split(/\s+/).forEach(word => {
      if (word.length > 2) skillWords.add(word);
    });

    // Count matches
    let matches = 0;
    for (const keyword of requestKeywords) {
      if (skillWords.has(keyword.toLowerCase())) {
        matches++;
      }
    }

    return matches / requestKeywords.length;
  }

  /**
   * Calculate category relevance for the request
   */
  private calculateCategoryRelevance(
    category: Skill['category'],
    analysis: RequestAnalysis
  ): number {
    // Map intents to skill categories
    const intentCategoryMap: Record<string, Set<Skill['category']>> = {
      question: new Set(['productivity', 'ai', 'data']),
      command: new Set(['development', 'automation', 'utilities']),
      request_info: new Set(['productivity', 'communication', 'ai']),
      create_content: new Set(['ai', 'media', 'development']),
      modify_content: new Set(['development', 'ai', 'utilities']),
      execute_task: new Set(['automation', 'utilities', 'development']),
      chat: new Set(['ai', 'communication']),
      other: new Set(['utilities']),
    };

    const relevantCategories = intentCategoryMap[analysis.intent] || new Set();

    return relevantCategories.has(category) ? 1.0 : 0.3;
  }

  /**
   * Get learning score for this skill with this type of request
   * Based on past success/failure rate
   */
  private getLearningScore(skillId: string, analysis: RequestAnalysis): number {
    // Create a key from intent and top keywords
    const contextKey = `${analysis.intent}:${analysis.keywords.slice(0, 3).join(',')}`;

    const skillScores = this.learningData.get(contextKey);
    if (!skillScores) return 0.5; // Neutral score if no data

    const score = skillScores.get(skillId);
    if (!score) return 0.5; // Neutral score if skill not used in this context

    return score;
  }

  /**
   * Calculate overall confidence for the selection
   */
  private calculateOverallConfidence(skills: Skill[]): number {
    if (skills.length === 0) return 0.0;

    const avgConfidence = skills.reduce((sum, skill) => {
      return sum + (skill.confidence || 0);
    }, 0) / skills.length;

    return avgConfidence;
  }

  /**
   * Build human-readable reasoning for the selection
   */
  private buildReasoning(skills: Skill[], analysis: RequestAnalysis): string {
    if (skills.length === 0) {
      return 'No relevant skills found for this request.';
    }

    const reasons: string[] = [
      `Selected ${skills.length} skill(s) based on your request:`,
    ];

    skills.forEach((skill, index) => {
      const confidence = Math.round((skill.confidence || 0) * 100);
      reasons.push(
        `${index + 1}. ${skill.name} (${confidence}% match) - ${skill.description}`
      );
    });

    return reasons.join('\n');
  }

  /**
   * Record feedback from skill usage
   * Updates learning data to improve future selections
   */
  async recordFeedback(feedback: LearningFeedback): Promise<void> {
    // For now, this is a simple implementation
    // In production, this would persist to database

    if (!feedback.skillUsed) return;

    // Extract context key
    const contextKey = this.extractContextKey(feedback);

    // Get or create skill scores for this context
    if (!this.learningData.has(contextKey)) {
      this.learningData.set(contextKey, new Map());
    }

    const skillScores = this.learningData.get(contextKey)!;

    // Get current score
    const currentScore = skillScores.get(feedback.skillUsed) || 0.5;

    // Update based on success/failure
    let newScore: number;
    if (feedback.success) {
      // Increase score (but cap at 1.0)
      newScore = Math.min(1.0, currentScore + 0.1);
    } else {
      // Decrease score (but don't go below 0.0)
      newScore = Math.max(0.0, currentScore - 0.15);
    }

    // Apply user feedback multiplier
    if (feedback.userFeedback === 'positive') {
      newScore = Math.min(1.0, newScore + 0.05);
    } else if (feedback.userFeedback === 'negative') {
      newScore = Math.max(0.0, newScore - 0.1);
    }

    // Save updated score
    skillScores.set(feedback.skillUsed, newScore);

    console.log(`[Learning] Updated ${feedback.skillUsed} score: ${currentScore.toFixed(2)} → ${newScore.toFixed(2)}`);
  }

  /**
   * Extract context key from feedback for learning
   */
  private extractContextKey(feedback: LearningFeedback): string {
    // Simple implementation: just use interaction ID prefix
    // In production, would extract intent and keywords from interaction
    return feedback.interactionId.substring(0, 20);
  }

  /**
   * Get confidence updates report
   * Shows which skills have improved/degraded
   */
  async getConfidenceUpdates(
    skillIds: string[],
    timeRange?: { from: Date; to: Date }
  ): Promise<SkillConfidenceUpdate[]> {
    // TODO: Implement based on learning data
    // This would query database for historical confidence changes
    return [];
  }

  /**
   * Reset learning data for a specific context or skill
   * Useful for debugging or when skill is updated
   */
  async resetLearning(skillId?: string, context?: string): Promise<void> {
    if (skillId && context) {
      // Reset specific skill in specific context
      const skillScores = this.learningData.get(context);
      if (skillScores) {
        skillScores.delete(skillId);
      }
    } else if (skillId) {
      // Reset all contexts for this skill
      for (const [context, scores] of this.learningData.entries()) {
        scores.delete(skillId);
      }
    } else if (context) {
      // Reset all skills in this context
      this.learningData.delete(context);
    } else {
      // Reset everything
      this.learningData.clear();
    }

    console.log(`[Learning] Reset learning data: skill=${skillId || 'all'}, context=${context || 'all'}`);
  }

  /**
   * Export learning data for analysis or backup
   */
  exportLearningData(): Record<string, Record<string, number>> {
    const exported: Record<string, Record<string, number>> = {};

    for (const [context, scores] of this.learningData.entries()) {
      exported[context] = {};
      for (const [skillId, score] of scores.entries()) {
        exported[context][skillId] = score;
      }
    }

    return exported;
  }

  /**
   * Import learning data from backup or external source
   */
  importLearningData(data: Record<string, Record<string, number>>): void {
    this.learningData.clear();

    for (const [context, scores] of Object.entries(data)) {
      const skillScores = new Map<string, number>();
      for (const [skillId, score] of Object.entries(scores)) {
        skillScores.set(skillId, score);
      }
      this.learningData.set(context, skillScores);
    }

    console.log(`[Learning] Imported learning data: ${Object.keys(data).length} contexts`);
  }

  /**
   * Get statistics about skill usage and confidence
   */
  getStatistics(): {
    totalContexts: number;
    totalSkills: number;
    avgConfidence: number;
    topSkills: Array<{ skillId: string; avgScore: number; usageCount: number }>;
  } {
    const skillAggregates = new Map<string, { sum: number; count: number }>();

    // Aggregate scores across all contexts
    for (const scores of this.learningData.values()) {
      for (const [skillId, score] of scores.entries()) {
        if (!skillAggregates.has(skillId)) {
          skillAggregates.set(skillId, { sum: 0, count: 0 });
        }
        const agg = skillAggregates.get(skillId)!;
        agg.sum += score;
        agg.count++;
      }
    }

    // Calculate averages
    const skillStats = Array.from(skillAggregates.entries()).map(([skillId, agg]) => ({
      skillId,
      avgScore: agg.sum / agg.count,
      usageCount: agg.count,
    }));

    // Sort by average score
    skillStats.sort((a, b) => b.avgScore - a.avgScore);

    // Overall average
    const totalScores = skillStats.reduce((sum, s) => sum + s.avgScore * s.usageCount, 0);
    const totalCounts = skillStats.reduce((sum, s) => sum + s.usageCount, 0);
    const avgConfidence = totalCounts > 0 ? totalScores / totalCounts : 0;

    return {
      totalContexts: this.learningData.size,
      totalSkills: skillAggregates.size,
      avgConfidence,
      topSkills: skillStats.slice(0, 10), // Top 10
    };
  }
}
