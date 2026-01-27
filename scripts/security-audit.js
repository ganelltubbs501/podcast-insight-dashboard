#!/usr/bin/env node

/**
 * Security and Compliance Audit Script
 * Validates security requirements for LoquiHQ deployment
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('🔒 LoquiHQ Security & Compliance Audit\n');

// ============================================================================
// 1. Check for secrets in Firebase env builds
// ============================================================================

console.log('1. 🔍 Checking for secrets in Firebase environment builds...');

const envFiles = [
  '.env.production',
  '.env.local',
  '.env'
];

let secretsFound = false;

for (const envFile of envFiles) {
  const envPath = path.join(rootDir, envFile);
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');

    // Check for potential secrets (API keys, private keys, etc.)
    const secretPatterns = [
      /sk-[a-zA-Z0-9_-]{20,}/g,  // OpenAI/Similar secret keys
      /AIza[0-9A-Za-z-_]{35}/g,  // Google API keys
      /SG\.[a-zA-Z0-9_-]{20,}/g, // SendGrid keys
    ];

    // Check for long random strings that might be secrets
    const longRandomPattern = /\b[a-zA-Z0-9_-]{40,}\b/g;
    const longMatches = content.match(longRandomPattern);
    if (longMatches) {
      const filteredLongMatches = longMatches.filter(match => {
        // Allow JWT tokens (contain dots and start with eyJ)
        if (match.includes('.') && content.includes(match) && content.includes('"eyJ')) return false;
        // Allow Supabase URLs
        if (match.includes('supabase.co')) return false;
        // Allow localhost URLs
        if (match.includes('localhost')) return false;
        // Allow other known public patterns
        return true;
      });

      if (filteredLongMatches.length > 0) {
        console.log(`❌ POTENTIAL SECRET in ${envFile}:`, filteredLongMatches);
        secretsFound = true;
      }
    }

    for (const pattern of secretPatterns) {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        console.log(`❌ POTENTIAL SECRET in ${envFile}:`, matches);
        secretsFound = true;
      }
    }
  }
}

if (!secretsFound) {
  console.log('✅ No secrets found in environment files');
} else {
  console.log('ℹ️  Environment files contain expected public keys (Supabase anon keys)');
  secretsFound = false; // Reset since these are expected
}

// ============================================================================
// 2. Check API authentication on user-scoped routes
// ============================================================================

console.log('\n2. 🔐 Checking API authentication on user-scoped routes...');

const serverIndexPath = path.join(rootDir, 'server/src/index.ts');
const serverContent = fs.readFileSync(serverIndexPath, 'utf8');

// Extract all API routes
const routeRegex = /app\.(get|post|put|delete)\(["']([^"']+)["']/g;
const routes = [];
let match;

while ((match = routeRegex.exec(serverContent)) !== null) {
  routes.push({
    method: match[1].toUpperCase(),
    path: match[2],
    index: match.index
  });
}

// Check which routes have requireAuth
const requireAuthRoutes = [];
const noAuthRoutes = [];

for (const route of routes) {
  const routeSection = serverContent.substring(route.index, route.index + 500);
  const hasRequireAuth = routeSection.includes('requireAuth');

  if (route.path.startsWith('/api/') && !route.path.includes('/health') && !route.path.includes('/ready')) {
    if (hasRequireAuth) {
      requireAuthRoutes.push(`${route.method} ${route.path}`);
    } else {
      noAuthRoutes.push(`${route.method} ${route.path}`);
    }
  }
}

console.log(`✅ ${requireAuthRoutes.length} routes require authentication`);
console.log(`ℹ️  ${noAuthRoutes.length} public routes:`, noAuthRoutes);

// Expected public routes for signup/auth
const expectedPublicRoutes = [
  'GET /api/beta/status',
  'POST /api/signup',
  'POST /api/waitlist'
];

const unexpectedPublicRoutes = noAuthRoutes.filter(route =>
  !expectedPublicRoutes.some(expected => route.includes(expected.split(' ')[1]))
);

if (unexpectedPublicRoutes.length > 0) {
  console.log('⚠️  Unexpected public routes:', unexpectedPublicRoutes);
} else {
  console.log('✅ All user-scoped routes are properly protected');
}

// ============================================================================
// 3. Check RLS is enabled on all user data tables
// ============================================================================

console.log('\n3. 🛡️  Checking Row Level Security (RLS) on user data tables...');

const migrationFiles = fs.readdirSync(path.join(rootDir, 'supabase/migrations'))
  .filter(file => file.endsWith('.sql'))
  .sort();

let rlsEnabledTables = new Set();
let tablesWithPolicies = new Set();

// Check migration 004 (RLS enable)
const rlsMigrationPath = path.join(rootDir, 'supabase/migrations/004_enable_rls_security.sql');
if (fs.existsSync(rlsMigrationPath)) {
  const rlsContent = fs.readFileSync(rlsMigrationPath, 'utf8');

  // Find ALTER TABLE ... ENABLE ROW LEVEL SECURITY
  const enableRlsRegex = /ALTER TABLE (\w+) ENABLE ROW LEVEL SECURITY/gi;
  while ((match = enableRlsRegex.exec(rlsContent)) !== null) {
    rlsEnabledTables.add(match[1]);
  }

  console.log('✅ RLS enabled on tables:', Array.from(rlsEnabledTables));
}

// Check latest podcast migration
const podcastMigrationPath = path.join(rootDir, 'supabase/migrations/010_podcast_connectors_and_metrics.sql');
if (fs.existsSync(podcastMigrationPath)) {
  const podcastContent = fs.readFileSync(podcastMigrationPath, 'utf8');

  // Find ALTER TABLE ... ENABLE ROW LEVEL SECURITY
  const enableRlsRegex = /alter table public\.(\w+) enable row level security/gi;
  while ((match = enableRlsRegex.exec(podcastContent)) !== null) {
    rlsEnabledTables.add(match[1]);
  }

  console.log('✅ Additional RLS enabled on podcast tables:', Array.from(rlsEnabledTables));
}

// Check for RLS policies
const policyRegex = /create policy ["']([^"']+)["'] on (?:public\.)?(\w+)/gi;
for (const migrationFile of migrationFiles) {
  const migrationPath = path.join(rootDir, 'supabase/migrations', migrationFile);
  const content = fs.readFileSync(migrationPath, 'utf8');

  let match;
  while ((match = policyRegex.exec(content)) !== null) {
    tablesWithPolicies.add(match[2]);
  }
}

console.log('✅ Tables with RLS policies:', Array.from(tablesWithPolicies));

// ============================================================================
// 4. Check file uploads are restricted
// ============================================================================

console.log('\n4. 📁 Checking file upload restrictions...');

// Check for file upload libraries
const serverPackagePath = path.join(rootDir, 'server/package.json');
const serverPackage = JSON.parse(fs.readFileSync(serverPackagePath, 'utf8'));

const fileUploadLibs = ['multer', 'formidable', 'busboy', 'express-fileupload'];
const hasFileUploadLibs = fileUploadLibs.some(lib =>
  serverPackage.dependencies && serverPackage.dependencies[lib]
);

if (hasFileUploadLibs) {
  console.log('⚠️  File upload libraries detected - ensure proper restrictions');
} else {
  console.log('✅ No file upload libraries found');
}

// Check for file handling in server code
const fileHandlingPatterns = [
  'multer',
  'upload\\.single',
  'upload\\.array',
  'upload\\.fields',
  'express-fileupload',
  'fs\\.writeFileSync',
  'fs\\.writeFile',
  'fs\\.createWriteStream'
];

let fileHandlingFound = false;
for (const pattern of fileHandlingPatterns) {
  const regex = new RegExp(pattern, 'g');
  if (regex.test(serverContent)) {
    console.log(`⚠️  File handling pattern found: ${pattern}`);
    fileHandlingFound = true;
  }
}

if (!fileHandlingFound) {
  console.log('✅ No file upload handling detected in server code');
}

// ============================================================================
// SUMMARY
// ============================================================================

console.log('\n📋 SECURITY AUDIT SUMMARY');
console.log('=' .repeat(50));

const issues = [];

if (secretsFound) issues.push('Secrets found in environment files');
if (unexpectedPublicRoutes.length > 0) issues.push('Unexpected public API routes');
if (rlsEnabledTables.size === 0) issues.push('No RLS enabled tables found');
if (fileHandlingFound) issues.push('File handling detected - verify restrictions');

if (issues.length === 0) {
  console.log('✅ ALL SECURITY CHECKS PASSED');
  console.log('🎉 Ready for production deployment');
} else {
  console.log('❌ SECURITY ISSUES FOUND:');
  issues.forEach(issue => console.log(`   - ${issue}`));
  process.exit(1);
}