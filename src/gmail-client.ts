import { google } from 'googleapis';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createInterface } from 'readline';
import { OAuth2Client } from 'google-auth-library';
import type { gmail_v1 } from 'googleapis';
import type { EmailMatch, CleanupResult } from './types.js';

export class GmailClient {
  private gmail: gmail_v1.Gmail;
  private auth: OAuth2Client | null = null;

  constructor() {
    // Gmail client will be initialized after authentication
    this.gmail = google.gmail({ version: 'v1', auth: this.auth as any });
  }

  /**
   * Authenticate with Gmail API
   * Requires credentials.json file with client_id and client_secret
   */
  async authenticate(): Promise<void> {
    // Check for credentials file or environment variables
    let clientId: string;
    let clientSecret: string;
    let redirectUri: string;

    if (existsSync('credentials.json')) {
      const credentials = JSON.parse(readFileSync('credentials.json', 'utf-8'));
      const creds = credentials.installed || credentials.web;
      clientId = creds.client_id;
      clientSecret = creds.client_secret;
      redirectUri = creds.redirect_uris[0];
    } else if (process.env.CLIENT_ID && process.env.CLIENT_SECRET) {
      clientId = process.env.CLIENT_ID;
      clientSecret = process.env.CLIENT_SECRET;
      redirectUri = process.env.REDIRECT_URI || 'http://localhost:3000/oauth2callback';
    } else {
      throw new Error(
        'credentials.json not found and CLIENT_ID/CLIENT_SECRET not set.\n' +
        'Please download credentials.json from Google Cloud Console or set environment variables.\n' +
        'See README.md for setup instructions.'
      );
    }

    this.auth = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    this.gmail = google.gmail({ version: 'v1', auth: this.auth });

    // Check if we have a saved token
    if (existsSync('token.json')) {
      const token = JSON.parse(readFileSync('token.json', 'utf-8'));
      this.auth.setCredentials(token);

      // Verify token is still valid by making a test request
      try {
        await this.gmail.users.getProfile({ userId: 'me' });
        return;
      } catch (error) {
        console.log('Saved token is invalid or expired. Re-authenticating...');
        // Continue to get a new token
      }
    }

    // Get authorization URL
    const authUrl = this.auth.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://mail.google.com/'],
    });

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🔐 Gmail API Authorization Required');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('1. Open this URL in your browser:');
    console.log(`   ${authUrl}\n`);
    console.log('2. Sign in with your Google account');
    console.log('3. Click "Allow" to grant access\n');
    console.log('4. After authorization, you will be redirected to a page.');
    console.log('   Look at the URL in your browser - it will look like:');
    console.log(`   ${redirectUri}?code=4/XXXXXXXXXXXXXXXXXXXXXXXXXXXXX\n`);
    console.log('5. Copy the ENTIRE code value (everything after "code=")');
    console.log('   and paste it below when prompted.\n');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Try to get code from environment variable first, otherwise prompt
    let code = process.env.AUTH_CODE;

    if (!code) {
      // Use readline for interactive input
      const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      code = await new Promise<string>((resolve) => {
        rl.question('Paste the authorization code here: ', (answer) => {
          rl.close();
          resolve(answer.trim());
        });
      });

      if (!code) {
        throw new Error('Authorization code is required. Please run again and provide the code.');
      }
    }

    const { tokens } = await this.auth.getToken(code);
    this.auth.setCredentials(tokens);

    // Save the token for future use
    writeFileSync('token.json', JSON.stringify(tokens));
    console.log('Token stored to token.json');
  }

  /**
   * Search for emails matching the given criteria
   */
  async searchEmails(config: {
    senders?: string[];
    subjects?: string[];
    maxResults?: number;
  }): Promise<EmailMatch[]> {
    const queryParts: string[] = [];

    // Build query for senders
    if (config.senders && config.senders.length > 0) {
      const senderQueries = config.senders.map(sender => `from:${sender}`);
      queryParts.push(`(${senderQueries.join(' OR ')})`);
    }

    // Build query for subjects
    if (config.subjects && config.subjects.length > 0) {
      const subjectQueries = config.subjects.map(subject => `subject:"${subject}"`);
      queryParts.push(`(${subjectQueries.join(' OR ')})`);
    }

    if (queryParts.length === 0) {
      throw new Error('At least one sender or subject must be specified');
    }

    const query = queryParts.join(' AND ');
    const maxResults = config.maxResults || 500;

    console.log(`Searching for emails with query: ${query}`);
    console.log(`Max results: ${maxResults}`);

    const response = await this.gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: Math.min(maxResults, 500), // Gmail API limit is 500
    });

    const messageIds = response.data.messages || [];
    const matches: EmailMatch[] = [];

    // Fetch message details in batches
    for (const message of messageIds) {
      if (message.id) {
        try {
          const msgResponse = await this.gmail.users.messages.get({
            userId: 'me',
            id: message.id,
            format: 'metadata',
            metadataHeaders: ['From', 'Subject'],
          });

          const snippet = msgResponse.data.snippet || '';
          matches.push({
            id: message.id,
            threadId: message.threadId || '',
            snippet: snippet.substring(0, 100),
          });
        } catch (error) {
          console.error(`Error fetching message ${message.id}:`, error);
        }
      }
    }

    return matches;
  }

  /**
   * Batch delete emails by their IDs
   */
  async batchDeleteEmails(messageIds: string[], dryRun: boolean = false): Promise<CleanupResult> {
    const result: CleanupResult = {
      totalFound: messageIds.length,
      deleted: 0,
      errors: [],
    };

    if (dryRun) {
      console.log(`[DRY RUN] Would delete ${messageIds.length} emails`);
      return result;
    }

    // Gmail API allows batch deletion
    // Delete in batches of 1000 (Gmail API limit)
    const batchSize = 1000;
    for (let i = 0; i < messageIds.length; i += batchSize) {
      const batch = messageIds.slice(i, i + batchSize);

      try {
        await this.gmail.users.messages.batchDelete({
          userId: 'me',
          requestBody: {
            ids: batch,
          },
        });
        result.deleted += batch.length;
        console.log(`Deleted batch: ${batch.length} emails (${result.deleted}/${result.totalFound})`);
      } catch (error) {
        const errorMsg = `Error deleting batch: ${error instanceof Error ? error.message : String(error)}`;
        result.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    return result;
  }
}

