#!/usr/bin/env node
/**
 * Run app version check locally.
 * Usage: node scripts/check-version-bump.js [--base origin/main] [--head HEAD]
 */

const { spawnSync } = require('node:child_process');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);

const result = spawnSync('node', [path.join(__dirname, 'check-app-version.js'), ...args], {
    cwd: ROOT,
    stdio: 'inherit',
});

if (result.status !== 0) {
    process.exit(result.status ?? 1);
}

console.log('All version checks passed.');
