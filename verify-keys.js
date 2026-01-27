#!/usr/bin/env node

/**
 * API Key Verification Script
 *
 * This script helps verify that:
 * 1. New API keys are present in .env files
 * 2. Keys are different from exposed ones
 * 3. .env files are NOT tracked by git
 *
 * Run: node verify-keys.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 API Key Rotation Verification\n');
console.log('='.repeat(50));

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m'
};

const EXPOSED_GEMINI_KEY = 'AIzaSyDZ4ikQ7MMOMiBLa1qtU574OfS1xUIGqcg';
const EXPOSED_SUPABASE_KEY_PREFIX = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';

let passed = 0;
let failed = 0;
let warnings = 0;

function pass(message) {
  console.log(`${colors.green}✅ ${message}${colors.reset}`);
  passed++;
}

function fail(message) {
  console.log(`${colors.red}❌ ${message}${colors.reset}`);
  failed++;
}

function warn(message) {
  console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
  warnings++;
}

function info(message) {
  console.log(`${colors.blue}ℹ️  ${message}${colors.reset}`);
}

console.log('\n📋 Check 1: .env Files Exist\n');

// Check backend .env
const backendEnvPath = path.join(__dirname, 'server', '.env');
if (fs.existsSync(backendEnvPath)) {
  pass('server/.env exists');
} else {
  fail('server/.env does NOT exist - create it!');
}

// Check frontend .env.local
const frontendEnvPath = path.join(__dirname, '.env.local');
if (fs.existsSync(frontendEnvPath)) {
  pass('.env.local exists');
} else {
  fail('.env.local does NOT exist - create it!');
}

console.log('\n📋 Check 2: Gemini API Key\n');

if (fs.existsSync(backendEnvPath)) {
  const backendEnv = fs.readFileSync(backendEnvPath, 'utf8');

  if (backendEnv.includes('GEMINI_API_KEY=')) {
    pass('GEMINI_API_KEY is set in server/.env');

    // Check if it's the exposed key
    if (backendEnv.includes(EXPOSED_GEMINI_KEY)) {
      fail('❌ CRITICAL: Still using EXPOSED Gemini key!');
      console.log('   You MUST rotate this key immediately!');
      console.log('   Go to: https://aistudio.google.com/app/apikey');
    } else {
      pass('Gemini key is different from exposed key');

      // Extract and show first/last 8 chars
      const match = backendEnv.match(/GEMINI_API_KEY=([^\s\n]+)/);
      if (match && match[1]) {
        const key = match[1];
        const preview = `${key.substring(0, 8)}...${key.substring(key.length - 8)}`;
        info(`Current key: ${preview}`);
      }
    }
  } else {
    fail('GEMINI_API_KEY is NOT set in server/.env');
  }
}

console.log('\n📋 Check 3: Supabase Keys\n');

if (fs.existsSync(frontendEnvPath)) {
  const frontendEnv = fs.readFileSync(frontendEnvPath, 'utf8');

  // Check VITE_SUPABASE_URL
  if (frontendEnv.includes('VITE_SUPABASE_URL=')) {
    pass('VITE_SUPABASE_URL is set');
  } else {
    fail('VITE_SUPABASE_URL is NOT set in .env.local');
  }

  // Check VITE_SUPABASE_ANON_KEY
  if (frontendEnv.includes('VITE_SUPABASE_ANON_KEY=')) {
    pass('VITE_SUPABASE_ANON_KEY is set');

    // Show preview
    const match = frontendEnv.match(/VITE_SUPABASE_ANON_KEY=([^\s\n]+)/);
    if (match && match[1]) {
      const key = match[1];
      const preview = `${key.substring(0, 20)}...${key.substring(key.length - 10)}`;
      info(`Anon key: ${preview}`);

      // Warn if it looks like the old one (same prefix)
      if (key.startsWith(EXPOSED_SUPABASE_KEY_PREFIX) && key.length > 200) {
        warn('Key starts with same prefix as exposed key - verify you reset it!');
      }
    }
  } else {
    fail('VITE_SUPABASE_ANON_KEY is NOT set in .env.local');
  }

  // Check VITE_API_BASE_URL
  if (frontendEnv.includes('VITE_API_BASE_URL=')) {
    pass('VITE_API_BASE_URL is set');
  } else {
    fail('VITE_API_BASE_URL is NOT set in .env.local');
  }
}

if (fs.existsSync(backendEnvPath)) {
  const backendEnv = fs.readFileSync(backendEnvPath, 'utf8');

  // Check for service role key
  if (backendEnv.includes('SUPABASE_SERVICE_ROLE_KEY=')) {
    pass('SUPABASE_SERVICE_ROLE_KEY is set in server/.env');
  } else {
    warn('SUPABASE_SERVICE_ROLE_KEY is NOT set - needed for auth to work!');
    console.log('   Get it from: https://app.supabase.com/project/mhjbiiyvancaiacpaqlc/settings/api');
  }

  // Check for SUPABASE_URL in backend
  if (backendEnv.includes('SUPABASE_URL=')) {
    pass('SUPABASE_URL is set in server/.env');
  } else {
    warn('SUPABASE_URL is NOT set in server/.env - auth may not work');
  }
}

console.log('\n📋 Check 4: Git Status (Files NOT Tracked)\n');

try {
  const gitStatus = execSync('git status --short', { encoding: 'utf8' });

  if (gitStatus.includes('.env.local')) {
    fail('.env.local appears in git status - it should be ignored!');
    console.log('   Run: git rm --cached .env.local');
  } else {
    pass('.env.local is NOT in git status (good!)');
  }

  if (gitStatus.includes('server/.env')) {
    fail('server/.env appears in git status - it should be ignored!');
    console.log('   Run: git rm --cached server/.env');
  } else {
    pass('server/.env is NOT in git status (good!)');
  }
} catch (error) {
  warn('Could not check git status (not a git repo or git not installed)');
}

console.log('\n📋 Check 5: .gitignore Configuration\n');

const gitignorePath = path.join(__dirname, '.gitignore');
if (fs.existsSync(gitignorePath)) {
  const gitignore = fs.readFileSync(gitignorePath, 'utf8');

  if (gitignore.includes('.env') || gitignore.includes('.env.local')) {
    pass('.gitignore includes .env patterns');
  } else {
    fail('.gitignore does NOT include .env patterns!');
  }
} else {
  fail('.gitignore does NOT exist!');
}

console.log('\n' + '='.repeat(50));
console.log('\n📊 Summary:\n');
console.log(`${colors.green}✅ Passed: ${passed}${colors.reset}`);
console.log(`${colors.red}❌ Failed: ${failed}${colors.reset}`);
console.log(`${colors.yellow}⚠️  Warnings: ${warnings}${colors.reset}`);

console.log('\n' + '='.repeat(50));

if (failed > 0) {
  console.log(`\n${colors.red}🚨 CRITICAL ISSUES FOUND!${colors.reset}`);
  console.log('\nYou must fix the failed checks before deploying to production.');
  console.log('See API_KEY_ROTATION_CHECKLIST.md for detailed instructions.\n');
  process.exit(1);
} else if (warnings > 0) {
  console.log(`\n${colors.yellow}⚠️  WARNINGS FOUND${colors.reset}`);
  console.log('\nSome non-critical issues detected. Review warnings above.');
  console.log('Your keys appear to be rotated, but verify service_role key is set.\n');
  process.exit(0);
} else {
  console.log(`\n${colors.green}🎉 ALL CHECKS PASSED!${colors.reset}`);
  console.log('\nYour API keys appear to be properly rotated and configured.');
  console.log('\nNext steps:');
  console.log('1. Test locally: npm run dev (in both server/ and root)');
  console.log('2. Try analyzing a transcript');
  console.log('3. Verify no API key errors in console\n');
  process.exit(0);
}
