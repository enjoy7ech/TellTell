#!/usr/bin/env node
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// This ensures we can run the TS source without a build step in dev
const tsxPath = path.resolve(__dirname, '../node_modules/.bin/tsx');
const srcPath = path.resolve(__dirname, '../src/index.ts');

try {
  execSync(`"${tsxPath}" "${srcPath}" ${process.argv.slice(2).join(' ')}`, { stdio: 'inherit' });
} catch (e) {
  process.exit(1);
}
