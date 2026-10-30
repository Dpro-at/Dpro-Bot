/**
 * Migrate extension storage to isolated folders
 * Run once: node scripts/migrate-extension-storage.js
 *
 * Moves existing extension files from shared folders to isolated folders:
 * - From: public/storage/cdn/files/ or public/storage/cdn/data/
 * - To: public/storage/extensions/{extensionId}/
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');
const storageRoot = path.join(projectRoot, 'public', 'storage');

// The extensions that ship with Girru
const extensionIds = [
  'discord', 'slack', 'telegram', 'whatsapp',
  'email-client', 'calendar', 'team', 'public-chat',
  'call-center', 'trading',
];

let movedCount = 0;
let createdDirs = 0;

console.log('🚀 Starting extension storage migration...\n');

for (const extId of extensionIds) {
  // Create extension folder
  const extDir = path.join(storageRoot, 'extensions', extId);
  if (!fs.existsSync(extDir)) {
    fs.mkdirSync(extDir, { recursive: true });
    createdDirs++;
    console.log(`📁 Created: extensions/${extId}/`);
  }

  // Check common locations for extension-specific files
  const searchDirs = [
    path.join(storageRoot, 'cdn', 'files'),
    path.join(storageRoot, 'cdn', 'data'),
    path.join(storageRoot, 'cache', 'web'),
  ];

  for (const dir of searchDirs) {
    if (!fs.existsSync(dir)) continue;

    const files = fs.readdirSync(dir);
    for (const file of files) {
      // If filename contains extension ID, move it
      const lowerFile = file.toLowerCase();
      const lowerExt = extId.toLowerCase().replace('-', '_');

      if (lowerFile.includes(lowerExt) || lowerFile.startsWith(extId)) {
        const oldPath = path.join(dir, file);
        const newPath = path.join(extDir, file);

        try {
          // Check if file already exists at destination
          if (fs.existsSync(newPath)) {
            console.log(`⏭️  Skipped (exists): ${file}`);
            continue;
          }

          fs.renameSync(oldPath, newPath);
          movedCount++;
          console.log(`✅ Moved: ${file} → extensions/${extId}/`);
        } catch (error) {
          console.error(`❌ Error moving ${file}:`, error.message);
        }
      }
    }
  }
}

console.log(`\n🎉 Migration complete!`);
console.log(`   📁 Directories created: ${createdDirs}`);
console.log(`   📦 Files moved: ${movedCount}`);

if (movedCount === 0) {
  console.log(`\n✨ No files needed migration (either already migrated or no extension files found)`);
}
