#!/usr/bin/env node

/**
 * build.js - Helper script for building VocabularyPDFReader
 * 
 * Usage:
 *   node build.js [platform] [options]
 * 
 * Platforms:
 *   win, mac, linux, all
 * 
 * Options:
 *   --publish: Publish the build to GitHub
 *   --help: Show this help
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Ensure we're in the project root
const packageJsonPath = path.join(process.cwd(), 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.error('Error: package.json not found. Make sure you run this script from the project root.');
  process.exit(1);
}

// Parse arguments
const args = process.argv.slice(2);
let platform = args[0]?.toLowerCase();
const shouldPublish = args.includes('--publish');
const showHelp = args.includes('--help');

// Show help
if (showHelp || !platform) {
  console.log(`
Build Script for VocabularyPDFReader
====================================

Usage:
  node build.js [platform] [options]

Platforms:
  win     - Build for Windows
  mac     - Build for macOS
  linux   - Build for Linux
  all     - Build for all platforms (requires appropriate environment)

Options:
  --publish  - Publish the build to GitHub (requires GH_TOKEN environment variable)
  --help     - Show this help

Examples:
  node build.js win              # Build for Windows, don't publish
  node build.js mac --publish    # Build for macOS and publish to GitHub
  node build.js all --publish    # Build for all platforms and publish
  `);
  process.exit(0);
}

// Validate platform
const validPlatforms = ['win', 'mac', 'linux', 'all'];
if (!validPlatforms.includes(platform)) {
  console.error(`Error: Invalid platform "${platform}". Valid options are: ${validPlatforms.join(', ')}`);
  process.exit(1);
}

// Check for GH_TOKEN if publishing
if (shouldPublish && !process.env.GH_TOKEN) {
  console.error(`
Error: Publishing requires a GitHub token set as the GH_TOKEN environment variable.

Please set it before running the script:
  - On Windows (CMD): set GH_TOKEN=your_token
  - On Windows (PowerShell): $env:GH_TOKEN="your_token"
  - On macOS/Linux: export GH_TOKEN=your_token
  `);
  process.exit(1);
}

// Map platform arg to electron-builder target
const platformMap = {
  win: 'win',
  mac: 'mac',
  linux: 'linux',
  all: 'mwl' // macOS, Windows, Linux
};

// Build command
const publishFlag = shouldPublish ? 'always' : 'never';
const command = `npm run build && electron-builder build --${platformMap[platform]} --publish ${publishFlag}`;

console.log(`\n=== Building VocabularyPDFReader for ${platform} ===`);
console.log(`Publish: ${shouldPublish ? 'Yes' : 'No'}`);
console.log('\nRunning command:', command);
console.log('\nThis may take several minutes. Please be patient...\n');

try {
  // Execute the build command
  execSync(command, { stdio: 'inherit' });
  
  console.log('\n✅ Build completed successfully!');
  console.log('\nBuilt files can be found in the "dist" directory.');
  
  if (shouldPublish) {
    console.log('\nYour application has been published to GitHub.');
    console.log('Remember to create a release for this version on GitHub to make the update available to users.');
  }
} catch (error) {
  console.error('\n❌ Build failed:', error.message);
  process.exit(1);
}