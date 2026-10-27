/**
 * WAF Scan AI Tool - Pure JavaScript
 * Allows AI agents to test WAF protection
 */

export const wafScanTool = {
  name: 'waf_scan',
  description: 'Test WAF protection on a URL or run self-audit. Returns security score, detected WAF type, and bypass rates per category.',
  input_schema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'Target URL to scan, or "self" to audit Girru backend security',
      },
      mode: {
        type: 'string',
        enum: ['quick', 'full'],
        description: 'Scan mode: "quick" tests 2 payloads per category, "full" tests all payloads',
      },
      categories: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter attack categories (sql_injection, xss, path_traversal, etc.)',
      },
    },
    required: ['url'],
  },

  async execute(params) {
    const { url, mode, categories } = params;
    const backendUrl = process.env.BACKEND_URL || `http://${process.env.HOST || 'localhost'}:${process.env.PORT || '41522'}`;

    try {
      // Handle self-audit
      const selfAuditPattern = new RegExp(`${process.env.HOST || 'localhost'}:${process.env.PORT || '41522'}`);
      if (url === 'self' || selfAuditPattern.test(url)) {
        const response = await fetch(`${backendUrl}/api/ext/waf/self`, {
          method: 'POST',
        });

        if (!response.ok) {
          throw new Error(`Self-audit failed: ${response.statusText}`);
        }

        const audit = await response.json();

        return {
          content: [{
            type: 'text',
            text: `# Girru Security Audit\n\n**Total Issues**: ${audit.totalIssues}\n` +
                  `- High: ${audit.highSeverity}\n` +
                  `- Medium: ${audit.mediumSeverity}\n` +
                  `- Low: ${audit.lowSeverity}\n\n` +
                  `## Issues Found:\n\n` +
                  audit.issues.map((issue, i) =>
                    `${i + 1}. **[${issue.severity.toUpperCase()}]** ${issue.type}\n` +
                    `   - Detail: ${issue.detail}\n` +
                    `   - Fix: ${issue.recommendation}\n`
                  ).join('\n'),
          }],
        };
      }

      // Start WAF scan
      const scanResponse = await fetch(`${backendUrl}/api/ext/waf/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, mode: mode || 'quick', categories }),
      });

      if (!scanResponse.ok) {
        throw new Error(`Scan failed: ${scanResponse.statusText}`);
      }

      const { scanId } = await scanResponse.json();

      // Poll for results (max 30 seconds)
      let attempts = 0;
      let scan = null;

      while (attempts < 30) {
        await new Promise(resolve => setTimeout(resolve, 1000));

        const resultResponse = await fetch(`${backendUrl}/api/ext/waf/scan/${scanId}`);
        scan = await resultResponse.json();

        if (scan.status === 'completed' || scan.status === 'failed') {
          break;
        }

        attempts++;
      }

      if (!scan || scan.status !== 'completed') {
        return {
          content: [{
            type: 'text',
            text: `Scan timed out or failed. Scan ID: ${scanId}\nCheck status at /dashboard/waf-security`,
          }],
        };
      }

      // Format results
      const wafStatus = scan.waf_detected
        ? `**WAF Detected**: ${scan.waf_type} (${scan.waf_confidence}% confidence)`
        : '**No WAF detected** (or WAF is transparent)';

      const riskBadge = {
        critical: '🔴 CRITICAL',
        high: '🟠 HIGH',
        medium: '🟡 MEDIUM',
        low: '🟢 LOW',
      }[scan.risk_level] || '⚪ UNKNOWN';

      let categorySummary = '';
      if (scan.results && scan.results.tests) {
        const byCategory = {};
        scan.results.tests.forEach(test => {
          if (!byCategory[test.category]) {
            byCategory[test.category] = { total: 0, blocked: 0 };
          }
          byCategory[test.category].total++;
          if (test.blocked) byCategory[test.category].blocked++;
        });

        categorySummary = '\n## Results by Category:\n\n';
        for (const [cat, stats] of Object.entries(byCategory)) {
          const passRate = ((stats.total - stats.blocked) / stats.total * 100).toFixed(1);
          categorySummary += `- **${cat}**: ${stats.blocked}/${stats.total} blocked (${passRate}% bypass rate)\n`;
        }
      }

      return {
        content: [{
          type: 'text',
          text: `# WAF Scan Results\n\n` +
                `**Target**: ${scan.target_url}\n` +
                `${wafStatus}\n\n` +
                `**Risk Level**: ${riskBadge}\n\n` +
                `**Overall Stats**:\n` +
                `- Total Payloads: ${scan.total_payloads}\n` +
                `- Blocked: ${scan.blocked_count}\n` +
                `- Passed: ${scan.passed_count}\n` +
                `- Bypass Rate: ${scan.bypass_rate.toFixed(1)}%\n` +
                categorySummary +
                `\n\nView full results at: /dashboard/waf-security`,
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `WAF scan error: ${error.message}`,
        }],
      };
    }
  },
};
