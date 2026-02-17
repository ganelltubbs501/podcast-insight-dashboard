#!/usr/bin/env node

/**
 * Beta Operations Script
 * Run beta management queries and operations
 *
 * Usage:
 *   npm run beta-ops
 *   node scripts/beta-ops.js
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local if it exists
const envLocalPath = path.resolve(__dirname, '..', '.env.local');
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf8');
  const envVars = envContent.split('\n').filter(line => line.includes('='));
  envVars.forEach(line => {
    const [key, ...valueParts] = line.split('=');
    const value = valueParts.join('=').trim();
    if (key && value) {
      process.env[key.trim()] = value;
    }
  });
}

// Validate environment - try multiple sources
let supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
let supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error('❌ Missing SUPABASE_URL environment variable');
  console.error('   Set SUPABASE_URL or VITE_SUPABASE_URL in your environment');
  process.exit(1);
}

if (!supabaseKey) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_ANON_KEY');
  console.error('   For full admin operations, set SUPABASE_SERVICE_ROLE_KEY');
  console.error('   For read-only metrics, you can use VITE_SUPABASE_ANON_KEY (limited functionality)');
  process.exit(1);
}

const isServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function runBetaOperations() {
  console.log('🚀 LoquiHQ Beta Operations');
  console.log('==========================\n');

  if (!isServiceRole) {
    console.log('⚠️  Running with anonymous key - limited to read-only operations');
    console.log('   For full admin operations, set SUPABASE_SERVICE_ROLE_KEY\n');
  }

  try {
    // Get metrics
    console.log('📊 Gathering Beta Metrics...\n');

    // Total users
    const { count: totalUsers, error: userError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    if (userError) throw userError;

    // Waitlist count
    const { count: waitlistCount, error: waitlistError } = await supabase
      .from('waitlist')
      .select('*', { count: 'exact', head: true });

    if (waitlistError) throw waitlistError;

    // Connected podcasts
    const { count: connectedPodcasts, error: podcastError } = await supabase
      .from('podcasts')
      .select('*', { count: 'exact', head: true });

    if (podcastError) throw podcastError;

    // Analyses today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { count: analysesToday, error: todayError } = await supabase
      .from('podcast_analyses')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString());

    if (todayError) throw todayError;

    // Analyses this week
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());

    const { count: analysesThisWeek, error: weekError } = await supabase
      .from('podcast_analyses')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekStart.toISOString());

    if (weekError) throw weekError;

    // Display metrics
    const betaCapacity = 100;
    const remaining = Math.max(0, betaCapacity - (totalUsers || 0));

    console.log('📈 Current Metrics:');
    console.log(`   Active Testers: ${totalUsers || 0}`);
    console.log(`   Waitlist: ${waitlistCount || 0}`);
    console.log(`   Connected Podcasts: ${connectedPodcasts || 0}`);
    console.log(`   Analyses Today: ${analysesToday || 0}`);
    console.log(`   Analyses This Week: ${analysesThisWeek || 0}`);
    console.log(`   Beta Capacity: ${totalUsers || 0}/${betaCapacity} (${remaining} remaining)\n`);

    // Get recent testers - simplified query for anon key
    console.log('👥 Beta Status:');
    console.log('   Note: Detailed user metrics require service role key');
    console.log('   Current environment appears to be empty or inaccessible with anon key\n');

    console.log('✅ Beta operations check completed');
    console.log('\n💡 For full beta management:');
    console.log('   1. Set SUPABASE_SERVICE_ROLE_KEY in server/.env');
    console.log('   2. Use the web admin dashboard at /beta-admin');
    console.log('   3. Run SQL queries from BETA_OPERATIONS.sql');

  } catch (error) {
    console.error('❌ Error running beta operations:', error.message);
    process.exit(1);
  }
}

// Command line interface
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'metrics':
  case undefined:
    runBetaOperations();
    break;

  case 'remove-tester':
    const userId = args[1];
    if (!userId) {
      console.error('❌ Usage: npm run beta-ops remove-tester <user-id>');
      process.exit(1);
    }
    console.log(`🗑️ Removing tester ${userId}...`);
    // TODO: Implement remove tester logic
    console.log('⚠️ Remove tester functionality not yet implemented in script');
    break;

  case 'help':
  default:
    console.log('LoquiHQ Beta Operations Script');
    console.log('');
    console.log('Usage:');
    console.log('  npm run beta-ops [command]');
    console.log('');
    console.log('Commands:');
    console.log('  metrics       Show beta metrics (default)');
    console.log('  remove-tester <user-id>  Remove a tester (not implemented)');
    console.log('  help          Show this help');
    break;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  // Only run if called directly
  if (!command || command === 'metrics') {
    runBetaOperations();
  }
}

export { runBetaOperations };