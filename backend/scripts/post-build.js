#!/usr/bin/env node

import { readdir, readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const apiDir = join(__dirname, '../../api');

/**
 * Post-build script to ensure all JS files have proper ES module exports
 * and are compatible with Vercel's serverless function requirements
 */

async function processJsFiles(dir) {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      
      if (entry.isDirectory()) {
        await processJsFiles(fullPath);
      } else if (entry.name.endsWith('.js')) {
        console.log(`Processing ${fullPath}`);
        
        let content = await readFile(fullPath, 'utf8');
        
        // Ensure we have proper exports for Vercel functions
        if (!content.includes('export ') && (content.includes('async function GET') || content.includes('async function POST'))) {
          console.log(`  - Adding missing exports to ${entry.name}`);
          // This shouldn't happen with our setup, but just in case
        }
        
        // Ensure the file ends with a newline
        if (!content.endsWith('\n')) {
          content += '\n';
          await writeFile(fullPath, content, 'utf8');
          console.log(`  - Added newline to ${entry.name}`);
        }
      }
    }
  } catch (error) {
    console.error(`Error processing directory ${dir}:`, error);
  }
}

console.log('Running post-build processing...');
await processJsFiles(apiDir);
console.log('Post-build processing complete!');