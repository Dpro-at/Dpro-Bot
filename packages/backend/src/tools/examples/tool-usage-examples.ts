/**
 * Practical Examples for Browser and Memory Tools
 *
 * Run these examples to see the tools in action
 */

import {exampleData} from '../example-data.js';
import { createToolsRegistry } from '../index.js';
import type { ToolExecutionContext } from '../types.js';

// Initialize tools
const context: ToolExecutionContext = {
  userId: 'example-user',
  workspaceDir: './workspace',
};

const registry = createToolsRegistry(context);

// ============================================
// Example 1: Simple Screenshot
// ============================================
export async function example1_simpleScreenshot() {
  console.log('\n📸 Example 1: Taking a screenshot of GitHub\n');

  const result = await registry.execute('browser_screenshot', {
    url: 'https://github.com',
    fullPage: false,
  });

  if (result.error) {
    console.error('❌ Error:', result.error);
  } else {
    console.log('✅ Success!');
    console.log('Screenshot saved to:', exampleData(result)?.path);
    console.log('Page title:', exampleData(result)?.title);
  }

  return result;
}

// ============================================
// Example 2: Extract Links from GitHub Trending
// ============================================
export async function example2_extractTrendingRepos() {
  console.log('\n🔗 Example 2: Extracting trending repos from GitHub\n');

  const result = await registry.execute('browser_extract', {
    url: 'https://github.com/trending',
    extract: 'links',
  });

  if (result.error) {
    console.error('❌ Error:', result.error);
  } else {
    console.log('✅ Success!');
    console.log(`Found ${exampleData(result)?.linkCount} links`);
    console.log('\nFirst 5 links:');
    exampleData(result)?.links?.slice(0, 5).forEach((link: any, i: number) => {
      console.log(`${i + 1}. ${link.text}: ${link.href}`);
    });
  }

  return result;
}

// ============================================
// Example 3: Navigate and Extract Page Info
// ============================================
export async function example3_pageAnalysis() {
  console.log('\n📊 Example 3: Analyzing a webpage\n');

  const result = await registry.execute('browser_navigate', {
    url: 'https://react.dev',
    extractInfo: true,
    screenshot: true,
  });

  if (result.error) {
    console.error('❌ Error:', result.error);
  } else {
    console.log('✅ Success!');
    console.log('Title:', exampleData(result)?.title);
    console.log('URL:', exampleData(result)?.finalUrl);
    if (exampleData(result)?.metadata) {
      console.log('Description:', exampleData(result).metadata?.description);
      console.log('Keywords:', exampleData(result).metadata?.keywords);
    }
    console.log('Screenshot:', exampleData(result)?.screenshot);
  }

  return result;
}

// ============================================
// Example 4: Search Google (Multi-Step Interaction)
// ============================================
export async function example4_googleSearch() {
  console.log('\n🔍 Example 4: Searching Google for "Claude AI"\n');

  const result = await registry.execute('browser_interact', {
    url: 'https://www.google.com',
    actions: [
      {
        type: 'wait',
        delay: 2000, // Wait for page to fully load
      },
      {
        type: 'type',
        selector: 'textarea[name="q"]',
        text: 'Claude AI',
      },
      {
        type: 'wait',
        delay: 1000,
      },
      {
        type: 'click',
        selector: 'input[name="btnK"]',
      },
      {
        type: 'wait',
        delay: 3000, // Wait for results
      },
    ],
    screenshot: true,
    keepAlive: false,
  });

  if (result.error) {
    console.error('❌ Error:', result.error);
  } else {
    console.log('✅ Success!');
    console.log(`Performed ${exampleData(result)?.actionsPerformed} actions`);
    console.log('Screenshot:', exampleData(result)?.screenshot);
  }

  return result;
}

// ============================================
// Example 5: Save User Preferences to Memory
// ============================================
export async function example5_savePreferences() {
  console.log('\n💾 Example 5: Saving user preferences to memory\n');

  // Save multiple preferences
  const preferences = [
    {
      content: "User's name is Ahmed",
      type: 'fact' as const,
      importance: 10,
      tags: ['name', 'identity'],
    },
    {
      content: 'User prefers Arabic language for responses',
      type: 'preference' as const,
      importance: 8,
      tags: ['language', 'localization'],
    },
    {
      content: 'User is learning React and Next.js',
      type: 'goal' as const,
      importance: 7,
      tags: ['learning', 'react', 'nextjs'],
    },
    {
      content: 'User prefers dark mode for UI',
      type: 'preference' as const,
      importance: 6,
      tags: ['ui', 'theme'],
    },
  ];

  console.log(`Saving ${preferences.length} memories...\n`);

  for (const pref of preferences) {
    const result = await registry.execute('memory_save', {
      ...pref,
      userId: 'example-user',
    });

    if (result.error) {
      console.error(`❌ Error saving "${pref.content}":`, result.error);
    } else {
      console.log(`✅ Saved: ${pref.content}`);
      console.log(`   Type: ${exampleData(result)?.type}, Importance: ${exampleData(result)?.importance}, Layer: ${exampleData(result)?.layer}`);
    }
  }
}

// ============================================
// Example 6: Search Memories
// ============================================
export async function example6_searchMemories() {
  console.log('\n🔎 Example 6: Searching memories\n');

  // First, ensure we have some memories (run example 5 first)
  await example5_savePreferences();

  console.log('\n--- Searching for user name ---\n');
  const nameSearch = await registry.execute('memory_search', {
    query: "What is the user's name?",
    userId: 'example-user',
    type: 'fact',
    minImportance: 8,
  });

  if (exampleData(nameSearch)?.memories && (exampleData(nameSearch).memories?.length ?? 0) > 0) {
    console.log('✅ Found memories:');
    exampleData(nameSearch).memories?.forEach((m: any) => {
      console.log(`- ${m.content} (importance: ${m.importance})`);
    });
  } else {
    console.log('❌ No memories found');
  }

  console.log('\n--- Searching for preferences ---\n');
  const prefSearch = await registry.execute('memory_search', {
    query: 'user preferences',
    userId: 'example-user',
    type: 'preference',
    limit: 10,
  });

  if (exampleData(prefSearch)?.memories && (exampleData(prefSearch).memories?.length ?? 0) > 0) {
    console.log('✅ Found preferences:');
    exampleData(prefSearch).memories?.forEach((m: any) => {
      console.log(`- ${m.content}`);
    });
  }

  console.log('\n--- Searching for learning goals ---\n');
  const goalSearch = await registry.execute('memory_search', {
    query: 'learning programming',
    userId: 'example-user',
    tags: ['learning'],
  });

  if (exampleData(goalSearch)?.memories && (exampleData(goalSearch).memories?.length ?? 0) > 0) {
    console.log('✅ Found goals:');
    exampleData(goalSearch).memories?.forEach((m: any) => {
      console.log(`- ${m.content}`);
    });
  }
}

// ============================================
// Example 7: Complete Workflow - Research and Remember
// ============================================
export async function example7_researchWorkflow() {
  console.log('\n🔬 Example 7: Complete Research Workflow\n');
  console.log('Task: Research React 19 and save key information\n');

  // Step 1: Navigate to React docs
  console.log('Step 1: Navigating to React.dev...');
  const nav = await registry.execute('browser_navigate', {
    url: 'https://react.dev',
    extractInfo: true,
  });

  if (nav.error) {
    console.error('❌ Navigation failed:', nav.error);
    return;
  }

  console.log(`✅ Loaded: ${exampleData(nav)?.title}`);

  // Step 2: Extract page metadata
  console.log('\nStep 2: Extracting page information...');
  const extract = await registry.execute('browser_extract', {
    url: 'https://react.dev',
    extract: 'metadata',
  });

  if (extract.error) {
    console.error('❌ Extraction failed:', extract.error);
    return;
  }

  console.log('✅ Extracted metadata:');
  console.log(`   Description: ${exampleData(extract)?.metadata?.description}`);

  // Step 3: Save to memory
  console.log('\nStep 3: Saving to memory...');
  const save = await registry.execute('memory_save', {
    content: `React official docs: ${exampleData(extract)?.metadata?.description}`,
    userId: 'example-user',
    type: 'fact',
    importance: 7,
    tags: ['react', 'documentation', 'web'],
  });

  if (save.error) {
    console.error('❌ Save failed:', save.error);
    return;
  }

  console.log('✅ Saved to memory with ID:', exampleData(save)?.memoryId);

  // Step 4: Verify with search
  console.log('\nStep 4: Verifying saved information...');
  const search = await registry.execute('memory_search', {
    query: 'React documentation',
    userId: 'example-user',
    tags: ['react'],
  });

  if (exampleData(search)?.memories && (exampleData(search).memories?.length ?? 0) > 0) {
    console.log('✅ Found in memory:');
    exampleData(search).memories?.forEach((m: any) => {
      console.log(`   - ${m.content}`);
    });
  }

  console.log('\n✅ Workflow completed successfully!');
}

// ============================================
// Example 8: Form Filling (Example Site)
// ============================================
export async function example8_formFilling() {
  console.log('\n📝 Example 8: Filling a form\n');

  const result = await registry.execute('browser_interact', {
    url: 'https://httpbin.org/forms/post',
    actions: [
      {
        type: 'fill_form',
        fields: [
          {
            selector: 'input[name="custname"]',
            value: 'Ahmed Mohamed',
            type: 'text',
          },
          {
            selector: 'input[name="custtel"]',
            value: '+20123456789',
            type: 'text',
          },
          {
            selector: 'input[name="custemail"]',
            value: 'ahmed@example.com',
            type: 'text',
          },
          {
            selector: 'input[name="size"][value="medium"]',
            value: 'true',
            type: 'radio',
          },
        ],
      },
      {
        type: 'wait',
        delay: 1000,
      },
    ],
    screenshot: true,
  });

  if (result.error) {
    console.error('❌ Error:', result.error);
  } else {
    console.log('✅ Form filled successfully!');
    console.log(`Actions performed: ${exampleData(result)?.actionsPerformed}`);
    console.log('Screenshot:', exampleData(result)?.screenshot);
  }

  return result;
}

// ============================================
// Run All Examples
// ============================================
export async function runAllExamples() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 Running All Tool Examples');
  console.log('='.repeat(60));

  try {
    await example1_simpleScreenshot();
    await example2_extractTrendingRepos();
    await example3_pageAnalysis();
    await example4_googleSearch();
    await example5_savePreferences();
    await example6_searchMemories();
    await example7_researchWorkflow();
    await example8_formFilling();

    console.log('\n' + '='.repeat(60));
    console.log('✅ All examples completed!');
    console.log('='.repeat(60) + '\n');
  } catch (error) {
    console.error('\n❌ Error running examples:', error);
  } finally {
    // Cleanup
    const { getBrowserController } = await import('../../browser/index.js');
    const controller = getBrowserController();
    await controller.cleanup();
    process.exit(0);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples();
}
