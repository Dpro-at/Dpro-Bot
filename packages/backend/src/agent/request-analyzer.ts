/**
 * Request Analyzer - Intent Detection & Context Understanding
 *
 * Analyzes user requests to determine:
 * - Intent (question, command, chat, etc.)
 * - Complexity (simple, medium, complex)
 * - Language (en, ar, mixed)
 * - Required skills and tools
 * - Keywords extraction
 * - Context requirements
 *
 * Innovation: Smart analysis to load only needed context (vs loading everything)
 *
 * @author Dpro Bot Team
 * @license MIT
 */

import {
  RequestAnalysis,
  Intent,
  Message,
  PromptBuildParams,
} from './types.js';

export class RequestAnalyzer {
  // Stop words for keyword extraction (English)
  private readonly stopWordsEn = new Set([
    'the', 'is', 'at', 'which', 'on', 'a', 'an', 'as', 'are', 'was', 'were',
    'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'doing',
    'what', 'how', 'when', 'where', 'who', 'why', 'can', 'could', 'would',
    'should', 'will', 'shall', 'may', 'might', 'must', 'to', 'of', 'in', 'for',
    'with', 'about', 'by', 'from', 'up', 'into', 'through', 'during', 'before',
    'after', 'above', 'below', 'between', 'under', 'again', 'further', 'then',
    'once', 'here', 'there', 'all', 'both', 'each', 'few', 'more', 'most',
    'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
    'than', 'too', 'very', 'just', 'but', 'me', 'my', 'i', 'you', 'your',
  ]);

  // Stop words for Arabic
  private readonly stopWordsAr = new Set([
    'في', 'من', 'إلى', 'على', 'عن', 'هذا', 'هذه', 'ذلك', 'التي', 'الذي',
    'ما', 'كان', 'كانت', 'هو', 'هي', 'أن', 'إن', 'لا', 'لم', 'لن', 'لو',
    'مع', 'أو', 'كل', 'بعض', 'غير', 'حتى', 'عند', 'بعد', 'قبل', 'أي',
  ]);

  /**
   * Analyze user request comprehensively
   */
  async analyze(params: PromptBuildParams): Promise<RequestAnalysis> {
    const message = params.message;
    const lowerMessage = message.toLowerCase();

    // 1. Extract keywords
    const keywords = this.extractKeywords(message);

    // 2. Detect intent
    const intent = this.detectIntent(message, keywords);

    // 3. Detect language
    const language = this.detectLanguage(message);

    // 4. Assess complexity
    const complexity = this.assessComplexity(message, keywords);

    // 5. Detect sentiment
    const sentiment = this.detectSentiment(message);

    // 6. Identify required skills
    const requiresSkills = this.identifyRequiredSkills(message, keywords);

    // 7. Identify required tools
    const requiresTools = this.identifyRequiredTools(message, intent);

    // 8. Analyze context requirements
    const context = this.analyzeContext(params);

    return {
      intent,
      keywords,
      sentiment,
      complexity,
      language,
      requiresTools,
      requiresSkills,
      context,
    };
  }

  /**
   * Extract meaningful keywords from message
   * Removes stop words and extracts important terms
   */
  private extractKeywords(message: string): string[] {
    // Detect if Arabic or English
    const hasArabic = /[\u0600-\u06FF]/.test(message);
    const stopWords = hasArabic ? this.stopWordsAr : this.stopWordsEn;

    // Tokenize
    const words = message
      .toLowerCase()
      .replace(/[^\w\s\u0600-\u06FF]/g, ' ') // Keep Arabic chars
      .split(/\s+/)
      .filter(word => {
        // Filter out stop words and short words
        return word.length > 2 && !stopWords.has(word);
      });

    // Remove duplicates and return
    return [...new Set(words)];
  }

  /**
   * Detect user intent from message
   * Returns one of: question, command, request_info, create_content, modify_content, execute_task, chat, other
   */
  private detectIntent(message: string, keywords: string[]): Intent {
    const lowerMessage = message.toLowerCase();

    // Question intent - starts with question words
    if (/^(what|how|when|where|who|why|which)\b/i.test(message)) {
      return 'question';
    }

    // Question intent - Arabic
    if (/^(ما|كيف|متى|أين|من|لماذا|ماذا|هل)\b/.test(message)) {
      return 'question';
    }

    // Question intent - contains question marks or "can", "could", "is", "are"
    if (/\?/.test(message) || /^(can|could|is|are|do|does)\b/i.test(message)) {
      return 'question';
    }

    // Command intent - imperative verbs
    if (/^(do|make|create|delete|remove|add|update|change|run|execute|start|stop|show|list|get|find|search)\b/i.test(message)) {
      return 'command';
    }

    // Command intent - Arabic
    if (/^(إعمل|أنشئ|أحذف|أضف|غير|شغل|أوقف|أعرض|ابحث)\b/.test(message)) {
      return 'command';
    }

    // Request info - polite requests
    if (/please|could you|would you|can you|help me|i need|i want/i.test(lowerMessage)) {
      return 'request_info';
    }

    // Request info - Arabic polite
    if (/(من فضلك|لو سمحت|ممكن|أريد|أحتاج)/.test(message)) {
      return 'request_info';
    }

    // Create content - creation verbs
    if (/\b(create|make|generate|build|write|compose|draft|design)\b/i.test(lowerMessage)) {
      return 'create_content';
    }

    // Modify content - modification verbs
    if (/\b(modify|update|change|edit|fix|correct|improve|refactor|revise)\b/i.test(lowerMessage)) {
      return 'modify_content';
    }

    // Execute task - execution verbs
    if (/\b(run|execute|start|launch|open|close|restart|deploy|install)\b/i.test(lowerMessage)) {
      return 'execute_task';
    }

    // Chat - greetings or conversational
    if (/^(hi|hello|hey|good morning|good afternoon|good evening|مرحبا|أهلا|السلام عليكم)\b/i.test(message)) {
      return 'chat';
    }

    // Default to other
    return 'other';
  }

  /**
   * Detect language of message
   * Returns: 'en', 'ar', or 'mixed'
   */
  private detectLanguage(message: string): 'en' | 'ar' | 'mixed' {
    const arabicChars = message.match(/[\u0600-\u06FF]/g);
    const englishChars = message.match(/[a-zA-Z]/g);

    const arabicCount = arabicChars ? arabicChars.length : 0;
    const englishCount = englishChars ? englishChars.length : 0;

    // Mostly Arabic
    if (arabicCount > englishCount * 2) return 'ar';

    // Mostly English
    if (englishCount > arabicCount * 2) return 'en';

    // Mixed
    return 'mixed';
  }

  /**
   * Assess complexity of the request
   * Returns: 'simple', 'medium', or 'complex'
   */
  private assessComplexity(message: string, keywords: string[]): 'simple' | 'medium' | 'complex' {
    const words = message.split(/\s+/).length;
    const sentences = message.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const hasMultipleSteps = /\b(and then|after that|next|finally|first|second|third|step)\b/i.test(message);
    const hasConditionals = /\b(if|when|unless|in case|provided that)\b/i.test(message);
    const hasLists = /[,;].*[,;]/.test(message); // Multiple commas/semicolons

    // Simple: Short, single sentence, no steps
    if (words < 10 && sentences <= 1 && !hasMultipleSteps) {
      return 'simple';
    }

    // Complex: Long, multiple steps, or conditionals
    if (
      words > 30 ||
      sentences > 3 ||
      hasMultipleSteps ||
      hasConditionals ||
      hasLists ||
      keywords.length > 10
    ) {
      return 'complex';
    }

    // Medium: Everything in between
    return 'medium';
  }

  /**
   * Detect sentiment of message
   * Returns: 'positive', 'neutral', or 'negative'
   */
  private detectSentiment(message: string): 'positive' | 'neutral' | 'negative' {
    const lowerMessage = message.toLowerCase();

    // Positive indicators
    const positiveWords = [
      'good', 'great', 'excellent', 'awesome', 'amazing', 'wonderful', 'fantastic',
      'love', 'like', 'happy', 'thanks', 'thank you', 'please',
      'جميل', 'رائع', 'ممتاز', 'شكرا', 'من فضلك'
    ];

    // Negative indicators
    const negativeWords = [
      'bad', 'terrible', 'awful', 'horrible', 'hate', 'wrong', 'error',
      'problem', 'issue', 'broken', 'failed', 'not working',
      'سيء', 'خطأ', 'مشكلة', 'لا يعمل'
    ];

    const positiveCount = positiveWords.filter(word => lowerMessage.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerMessage.includes(word)).length;

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  /**
   * Identify which skills are likely needed for this request
   */
  private identifyRequiredSkills(message: string, keywords: string[]): string[] {
    const skills: string[] = [];
    const lowerMessage = message.toLowerCase();

    // Weather skill
    if (/\b(weather|temperature|forecast|climate|rain|sunny|cloudy|الطقس|درجة الحرارة)\b/i.test(message)) {
      skills.push('weather');
    }

    // GitHub skill
    if (/\b(github|repository|repo|pull request|pr|issue|commit|branch|merge|جيت|جيتهاب)\b/i.test(message)) {
      skills.push('github');
    }

    // Web search skill
    if (/\b(search|find online|google|browse|look up|ابحث|جوجل|بحث)\b/i.test(message)) {
      skills.push('web-search');
    }

    // Note taking skill
    if (/\b(note|remember|write down|save|remind|ملاحظة|احفظ|تذكر)\b/i.test(message)) {
      skills.push('note-taking');
    }

    // Calculator skill
    if (/\b(calculate|compute|math|sum|total|multiply|divide|احسب|حساب)\b/i.test(message)) {
      skills.push('calculator');
    }

    // Email skill
    if (/\b(email|mail|send message|inbox|ايميل|بريد|رسالة)\b/i.test(message)) {
      skills.push('email');
    }

    // Calendar skill
    if (/\b(calendar|schedule|appointment|meeting|event|تقويم|موعد|اجتماع)\b/i.test(message)) {
      skills.push('calendar');
    }

    // File management skill
    if (/\b(file|folder|directory|document|ملف|مجلد|وثيقة)\b/i.test(message)) {
      skills.push('file-manager');
    }

    return skills;
  }

  /**
   * Identify which tools are needed based on intent
   */
  private identifyRequiredTools(message: string, intent: Intent): string[] {
    const tools: string[] = [];
    const lowerMessage = message.toLowerCase();

    // Web tools
    if (/\b(search|browse|website|url|http|online|انترنت|موقع)\b/i.test(message)) {
      tools.push('web_search');
      tools.push('web_fetch');
    }

    // File tools
    if (/\b(read|write|file|save|load|open|ملف|احفظ|افتح)\b/i.test(message)) {
      tools.push('read_file');
      tools.push('write_file');
    }

    // Execution tools
    if (/\b(run|execute|command|shell|terminal|شغل|نفذ)\b/i.test(message)) {
      tools.push('execute_command');
    }

    // API tools
    if (/\b(api|request|post|get|fetch|طلب)\b/i.test(message)) {
      tools.push('http_request');
    }

    // Based on intent
    if (intent === 'execute_task') {
      tools.push('execute_command');
    }

    if (intent === 'create_content' || intent === 'modify_content') {
      tools.push('write_file');
    }

    return [...new Set(tools)]; // Remove duplicates
  }

  /**
   * Analyze context requirements
   */
  private analyzeContext(params: PromptBuildParams): RequestAnalysis['context'] {
    const message = params.message.toLowerCase();
    const hasHistory = params.history.length > 0;

    // Is this a follow-up question?
    const isFollowUp = hasHistory && /\b(it|this|that|they|them|also|too|as well)\b/i.test(message);

    // References conversation history?
    const referencesHistory = /\b(last time|before|previous|earlier|we discussed|you said|you mentioned|قبل|سابقا|قلت)\b/i.test(message);

    // Needs external data?
    const needsExternalData = /\b(search|find|check|get|fetch|look up|latest|current|now|ابحث|أحصل|الآن|الحالي)\b/i.test(message);

    return {
      isFollowUp,
      referencesHistory: referencesHistory || isFollowUp,
      needsExternalData,
    };
  }

  /**
   * Get detailed analysis report (for debugging/logging)
   */
  getAnalysisReport(analysis: RequestAnalysis): string {
    return `
Request Analysis Report:
-----------------------
Intent: ${analysis.intent}
Language: ${analysis.language}
Complexity: ${analysis.complexity}
Sentiment: ${analysis.sentiment}
Keywords: ${analysis.keywords.join(', ')}
Required Skills: ${analysis.requiresSkills.join(', ') || 'none'}
Required Tools: ${analysis.requiresTools.join(', ') || 'none'}
Context:
  - Follow-up: ${analysis.context.isFollowUp}
  - References History: ${analysis.context.referencesHistory}
  - Needs External Data: ${analysis.context.needsExternalData}
    `.trim();
  }
}
