/**
 * Integration Tests for Browser and Memory Tools
 *
 * Tests all 6 new tools in realistic scenarios
 */

import {describe, it as nodeIt, before as beforeAll, after as afterAll} from 'node:test';
import assert from 'node:assert/strict';
const it=(name:string,fn:()=>Promise<void>|void,timeout=30000)=>nodeIt(name,{timeout},fn);
import {exampleData} from '../example-data.js';
import { createToolsRegistry } from '../index.js';
import type { ToolExecutionContext } from '../types.js';

describe('Browser and Memory Tools Integration', () => {
  let registry: ReturnType<typeof createToolsRegistry>;
  const testUserId = 'test-user-integration';
  const testWorkspaceDir = '/tmp/test-workspace';

  beforeAll(() => {
    const context: ToolExecutionContext = {
      userId: testUserId,
      workspaceDir: testWorkspaceDir,
    };

    registry = createToolsRegistry(context);
  });

  describe('Browser Navigate Tool', () => {
    it('should navigate to a URL and extract basic info', async () => {
      const result = await registry.execute('browser_navigate', {
        url: 'https://example.com',
        extractInfo: true,
      });

      assert.notStrictEqual(result.content, undefined);
      assert.strictEqual(result.error, undefined);

      if (result.data) {
        assert.strictEqual(exampleData(result).success, true);
        assert.notStrictEqual(exampleData(result).title, undefined);
        assert.strictEqual(exampleData(result).url, 'https://example.com');
      }
    }, 30000); // 30 second timeout

    it('should handle invalid URLs gracefully', async () => {
      const result = await registry.execute('browser_navigate', {
        url: 'invalid-url',
      });

      assert.notStrictEqual(result.error, undefined);
      assert.ok((result.content[0].text)?.includes('http://'));
    });

    it('should take screenshot when requested', async () => {
      const result = await registry.execute('browser_navigate', {
        url: 'https://example.com',
        screenshot: true,
      });

      assert.notStrictEqual(exampleData(result)?.screenshot, undefined);
      assert.match(exampleData(result)?.screenshot as string, /\.png$/);
    }, 30000);
  });

  describe('Browser Screenshot Tool', () => {
    it('should capture a screenshot', async () => {
      const result = await registry.execute('browser_screenshot', {
        url: 'https://example.com',
      });

      assert.notStrictEqual(result.content, undefined);
      assert.strictEqual(result.error, undefined);
      assert.notStrictEqual(exampleData(result)?.path, undefined);
      assert.match(exampleData(result)?.path as string, /\.png$/);
    }, 30000);

    it('should capture full page screenshot', async () => {
      const result = await registry.execute('browser_screenshot', {
        url: 'https://example.com',
        fullPage: true,
      });

      assert.strictEqual(exampleData(result)?.fullPage, true);
      assert.notStrictEqual(exampleData(result)?.path, undefined);
    }, 30000);

    it('should support custom viewport sizes', async () => {
      const result = await registry.execute('browser_screenshot', {
        url: 'https://example.com',
        width: 800,
        height: 600,
      });

      assert.deepStrictEqual(exampleData(result)?.viewport, { width: 800, height: 600 });
    }, 30000);
  });

  describe('Browser Extract Tool', () => {
    it('should extract links from a page', async () => {
      const result = await registry.execute('browser_extract', {
        url: 'https://example.com',
        extract: 'links',
      });

      assert.notStrictEqual(result.content, undefined);
      assert.strictEqual(result.error, undefined);
      assert.notStrictEqual(exampleData(result)?.links, undefined);
      assert.strictEqual(Array.isArray(exampleData(result)?.links), true);
      assert.ok((exampleData(result)?.linkCount ?? NaN) > 0);
    }, 30000);

    it('should extract page metadata', async () => {
      const result = await registry.execute('browser_extract', {
        url: 'https://example.com',
        extract: 'metadata',
      });

      assert.notStrictEqual(exampleData(result)?.metadata, undefined);
      assert.notStrictEqual(exampleData(result)?.metadata?.title, undefined);
    }, 30000);

    it('should extract text from selector', async () => {
      const result = await registry.execute('browser_extract', {
        url: 'https://example.com',
        extract: 'text',
        selector: 'h1',
      });

      assert.notStrictEqual(exampleData(result)?.text, undefined);
      assert.strictEqual(typeof exampleData(result)?.text === 'string', true);
    }, 30000);

    it('should require selector for text extraction', async () => {
      const result = await registry.execute('browser_extract', {
        url: 'https://example.com',
        extract: 'text',
      });

      assert.notStrictEqual(result.error, undefined);
      assert.ok((result.content[0].text)?.includes('selector'));
    });

    it('should extract all data types with "all" mode', async () => {
      const result = await registry.execute('browser_extract', {
        url: 'https://example.com',
        extract: 'all',
      });

      assert.notStrictEqual(exampleData(result)?.links, undefined);
      assert.notStrictEqual(exampleData(result)?.images, undefined);
      assert.notStrictEqual(exampleData(result)?.metadata, undefined);
      assert.ok((exampleData(result)?.linkCount ?? NaN) > 0);
    }, 30000);
  });

  describe('Browser Interact Tool', () => {
    it('should perform click action', async () => {
      const result = await registry.execute('browser_interact', {
        url: 'https://example.com',
        actions: [
          {
            type: 'click',
            selector: 'a',
          },
        ],
      });

      assert.notStrictEqual(result.content, undefined);
      assert.strictEqual(exampleData(result)?.actionsPerformed, 1);
    }, 30000);

    it('should perform wait action', async () => {
      const startTime = Date.now();

      const result = await registry.execute('browser_interact', {
        url: 'https://example.com',
        actions: [
          {
            type: 'wait',
            delay: 2000,
          },
        ],
      });

      const endTime = Date.now();
      const elapsed = endTime - startTime;

      assert.ok((elapsed ?? NaN) >= 2000);
      assert.strictEqual(exampleData(result)?.actionsPerformed, 1);
    }, 35000);

    it('should support session reuse with keepAlive', async () => {
      // Step 1: Create session with keepAlive
      const result1 = await registry.execute('browser_interact', {
        url: 'https://example.com',
        actions: [
          {
            type: 'wait',
            delay: 500,
          },
        ],
        keepAlive: true,
      });

      assert.notStrictEqual(exampleData(result1)?.sessionId, undefined);
      const sessionId = exampleData(result1)?.sessionId;

      // Step 2: Reuse session
      const result2 = await registry.execute('browser_interact', {
        sessionId: sessionId,
        actions: [
          {
            type: 'wait',
            delay: 500,
          },
        ],
      });

      assert.notStrictEqual(result2.content, undefined);
      assert.strictEqual(exampleData(result2)?.actionsPerformed, 1);
    }, 40000);

    it('should handle invalid session ID gracefully', async () => {
      const result = await registry.execute('browser_interact', {
        sessionId: 'invalid-session-id',
        actions: [
          {
            type: 'wait',
            delay: 100,
          },
        ],
      });

      assert.notStrictEqual(result.error, undefined);
      assert.ok((result.content[0].text)?.includes('not found'));
    });

    it('should take screenshot after actions', async () => {
      const result = await registry.execute('browser_interact', {
        url: 'https://example.com',
        actions: [
          {
            type: 'wait',
            delay: 500,
          },
        ],
        screenshot: true,
      });

      assert.notStrictEqual(exampleData(result)?.screenshot, undefined);
    }, 30000);
  });

  describe('Memory Save Tool', () => {
    it('should save a fact to memory', async () => {
      const result = await registry.execute('memory_save', {
        content: "User's name is Test User",
        userId: testUserId,
        type: 'fact',
        importance: 10,
        tags: ['name', 'identity'],
      });

      assert.notStrictEqual(result.content, undefined);
      assert.strictEqual(result.error, undefined);
      assert.strictEqual(exampleData(result)?.success, true);
      assert.notStrictEqual(exampleData(result)?.memoryId, undefined);
      assert.strictEqual(exampleData(result)?.importance, 10);
    });

    it('should save a preference to memory', async () => {
      const result = await registry.execute('memory_save', {
        content: 'User prefers Arabic language',
        userId: testUserId,
        type: 'preference',
        importance: 8,
        tags: ['language', 'localization'],
      });

      assert.strictEqual(exampleData(result)?.type, 'preference');
      assert.strictEqual(exampleData(result)?.layer, 'permanent'); // importance 8 → permanent
    });

    it('should save conversation context with lower importance', async () => {
      const result = await registry.execute('memory_save', {
        content: 'User mentioned working on a React project',
        userId: testUserId,
        type: 'conversation',
        importance: 5,
        tags: ['project', 'react'],
      });

      assert.strictEqual(exampleData(result)?.type, 'conversation');
      assert.strictEqual(exampleData(result)?.importance, 5);
    });

    it('should clamp importance to 1-10 range', async () => {
      const result1 = await registry.execute('memory_save', {
        content: 'Test with high importance',
        userId: testUserId,
        importance: 100,
      });

      const result2 = await registry.execute('memory_save', {
        content: 'Test with low importance',
        userId: testUserId,
        importance: -5,
      });

      assert.ok((exampleData(result1)?.importance ?? NaN) <= 10);
      assert.ok((exampleData(result2)?.importance ?? NaN) >= 1);
    });

    it('should use default values when optional params omitted', async () => {
      const result = await registry.execute('memory_save', {
        content: 'Simple memory without options',
        userId: testUserId,
      });

      assert.strictEqual(exampleData(result)?.type, 'conversation'); // default
      assert.ok((exampleData(result)?.importance ?? NaN) >= 1);
      assert.ok((exampleData(result)?.importance ?? NaN) <= 10);
    });
  });

  describe('Memory Search Tool', () => {
    beforeAll(async () => {
      // Seed some memories for testing
      await registry.execute('memory_save', {
        content: "User's favorite color is blue",
        userId: testUserId,
        type: 'preference',
        importance: 7,
        tags: ['color', 'favorites'],
      });

      await registry.execute('memory_save', {
        content: 'User is learning TypeScript',
        userId: testUserId,
        type: 'goal',
        importance: 8,
        tags: ['learning', 'typescript'],
      });

      await registry.execute('memory_save', {
        content: 'User lives in Cairo',
        userId: testUserId,
        type: 'fact',
        importance: 9,
        tags: ['location'],
      });
    });

    it('should search and find relevant memories', async () => {
      const result = await registry.execute('memory_search', {
        query: 'favorite color',
        userId: testUserId,
      });

      assert.notStrictEqual(result.content, undefined);
      assert.strictEqual(result.error, undefined);
      assert.ok((exampleData(result)?.count ?? NaN) > 0);
      assert.notStrictEqual(exampleData(result)?.memories, undefined);
    });

    it('should filter by memory type', async () => {
      const result = await registry.execute('memory_search', {
        query: 'user information',
        userId: testUserId,
        type: 'fact',
      });

      if (exampleData(result)?.memories && (exampleData(result).memories?.length ?? 0) > 0) {
        exampleData(result).memories?.forEach((memory: any) => {
          assert.strictEqual(memory.type, 'fact');
        });
      }
    });

    it('should filter by minimum importance', async () => {
      const result = await registry.execute('memory_search', {
        query: 'user',
        userId: testUserId,
        minImportance: 8,
      });

      if (exampleData(result)?.memories && (exampleData(result).memories?.length ?? 0) > 0) {
        exampleData(result).memories?.forEach((memory: any) => {
          assert.ok((memory.importance ?? NaN) >= 8);
        });
      }
    });

    it('should limit results', async () => {
      const result = await registry.execute('memory_search', {
        query: 'user',
        userId: testUserId,
        limit: 2,
      });

      assert.ok((exampleData(result)?.memories?.length ?? NaN) <= 2);
    });

    it('should return empty results for non-matching query', async () => {
      const result = await registry.execute('memory_search', {
        query: 'this query should not match anything xyzabc123',
        userId: testUserId,
      });

      assert.strictEqual(exampleData(result)?.count, 0);
      assert.deepStrictEqual(exampleData(result)?.memories, []);
    });

    it('should filter by tags', async () => {
      const result = await registry.execute('memory_search', {
        query: 'user',
        userId: testUserId,
        tags: ['location'],
      });

      if (exampleData(result)?.memories && (exampleData(result).memories?.length ?? 0) > 0) {
        exampleData(result).memories?.forEach((memory: any) => {
          assert.ok((memory.tags)?.includes('location'));
        });
      }
    });
  });

  describe('Complete Workflows', () => {
    it('should complete research and remember workflow', async () => {
      // Step 1: Navigate to page
      const nav = await registry.execute('browser_navigate', {
        url: 'https://example.com',
        extractInfo: true,
      });
      assert.strictEqual(exampleData(nav)?.success, true);

      // Step 2: Extract metadata
      const extract = await registry.execute('browser_extract', {
        url: 'https://example.com',
        extract: 'metadata',
      });
      assert.notStrictEqual(exampleData(extract)?.metadata, undefined);

      // Step 3: Save to memory
      const save = await registry.execute('memory_save', {
        content: `Example.com is a domain used in documentation. Title: ${exampleData(extract)?.metadata?.title}`,
        userId: testUserId,
        type: 'fact',
        importance: 5,
        tags: ['web', 'documentation'],
      });
      assert.strictEqual(exampleData(save)?.success, true);

      // Step 4: Search and verify
      const search = await registry.execute('memory_search', {
        query: 'example.com documentation',
        userId: testUserId,
      });
      assert.ok((exampleData(search)?.count ?? NaN) > 0);
    }, 60000);

    it('should complete screenshot and save workflow', async () => {
      // Step 1: Take screenshot
      const screenshot = await registry.execute('browser_screenshot', {
        url: 'https://example.com',
        fullPage: true,
      });
      assert.notStrictEqual(exampleData(screenshot)?.path, undefined);

      // Step 2: Save screenshot path to memory
      const save = await registry.execute('memory_save', {
        content: `Screenshot of example.com saved at: ${exampleData(screenshot)?.path}`,
        userId: testUserId,
        type: 'conversation',
        importance: 4,
        tags: ['screenshot', 'example.com'],
      });
      assert.strictEqual(exampleData(save)?.success, true);
    }, 40000);
  });

  afterAll(async () => {
    // Cleanup: Close any remaining browser sessions
    const { getBrowserController } = await import('../../browser/index.js');
    const controller = getBrowserController();
    await controller.cleanup();
  });
});
