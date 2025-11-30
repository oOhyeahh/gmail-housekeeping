import { GmailClient } from './gmail-client.js';
import type { CleanupConfig } from './types.js';

async function main() {
  const args = process.argv.slice(2);
  
  // Parse command line arguments
  const config: CleanupConfig = {
    dryRun: args.includes('--dry-run'),
    maxResults: 500,
  };

  // Parse senders
  const senderIndex = args.indexOf('--senders');
  if (senderIndex !== -1 && args[senderIndex + 1]) {
    config.senders = args[senderIndex + 1].split(',').map(s => s.trim());
  }

  // Parse subjects
  const subjectIndex = args.indexOf('--subjects');
  if (subjectIndex !== -1 && args[subjectIndex + 1]) {
    config.subjects = args[subjectIndex + 1].split(',').map(s => s.trim());
  }

  // Parse max results
  const maxResultsIndex = args.indexOf('--max-results');
  if (maxResultsIndex !== -1 && args[maxResultsIndex + 1]) {
    config.maxResults = parseInt(args[maxResultsIndex + 1], 10);
  }

  // Show help
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Gmail Housekeeping Tool

Usage:
  npm run dev -- [options]

Options:
  --senders <emails>     Comma-separated list of sender emails to match
  --subjects <subjects>  Comma-separated list of subject keywords to match
  --max-results <num>    Maximum number of emails to process (default: 500)
  --dry-run              Show what would be deleted without actually deleting
  --help, -h             Show this help message

Examples:
  # Delete emails from specific senders
  npm run dev -- --senders "spam@example.com,promos@example.com"

  # Delete emails with specific subjects
  npm run dev -- --subjects "Unsubscribe,Special Offer"

  # Combine both criteria
  npm run dev -- --senders "spam@example.com" --subjects "Promotion"

  # Dry run to preview
  npm run dev -- --senders "spam@example.com" --dry-run

Environment Variables:
  CLIENT_ID              Google OAuth2 Client ID
  CLIENT_SECRET          Google OAuth2 Client Secret
  REDIRECT_URI           OAuth2 redirect URI (default: http://localhost:3000/oauth2callback)
  AUTH_CODE              OAuth2 authorization code (for first-time setup)
`);
    process.exit(0);
  }

  // Validate configuration
  if (!config.senders && !config.subjects) {
    console.error('Error: At least one of --senders or --subjects must be specified');
    console.log('Use --help for usage information');
    process.exit(1);
  }

  try {
    const client = new GmailClient();
    
    console.log('Authenticating with Gmail API...');
    await client.authenticate();
    console.log('Authentication successful!\n');

    const matches = await client.searchEmails({
      senders: config.senders,
      subjects: config.subjects,
      maxResults: config.maxResults,
    });

    console.log(`\nFound ${matches.length} matching emails\n`);

    if (matches.length === 0) {
      console.log('No emails to delete.');
      return;
    }

    // Show preview of first few matches
    console.log('Preview of matches:');
    matches.slice(0, 5).forEach((match, index) => {
      console.log(`  ${index + 1}. ${match.snippet}...`);
    });
    if (matches.length > 5) {
      console.log(`  ... and ${matches.length - 5} more`);
    }

    if (config.dryRun) {
      console.log('\n[DRY RUN] No emails were deleted.');
      return;
    }

    // Confirm deletion
    console.log(`\n⚠️  About to delete ${matches.length} emails.`);
    console.log('This action cannot be undone!');

    console.log('\nDeleting emails...');
    const result = await client.batchDeleteEmails(
      matches.map(m => m.id),
      false
    );

    console.log('\n✅ Cleanup complete!');
    console.log(`   Total found: ${result.totalFound}`);
    console.log(`   Deleted: ${result.deleted}`);
    if (result.errors.length > 0) {
      console.log(`   Errors: ${result.errors.length}`);
      result.errors.forEach(err => console.log(`     - ${err}`));
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main().catch(console.error);

