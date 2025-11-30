# Gmail Housekeeping

A TypeScript tool to batch delete spam and promotional emails from your Gmail account based on sender addresses or email subjects.

## Features

-   🔍 Search emails by sender addresses
-   🔍 Search emails by subject keywords
-   🗑️ Batch delete matching emails
-   🧪 Dry-run mode to preview deletions
-   🔒 Secure OAuth2 authentication

## Prerequisites

1. **Node.js** (v18 or higher)
2. **Google Cloud Project** with Gmail API enabled
3. **OAuth2 credentials** from Google Cloud Console

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Google OAuth2 Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Gmail API**:
    - Navigate to "APIs & Services" > "Library"
    - Search for "Gmail API"
    - Click "Enable"
4. Configure OAuth consent screen:

    - Go to "APIs & Services" > "OAuth consent screen"
    - Choose "External" (unless you have a Google Workspace)
    - Fill in the required fields (App name, User support email, Developer contact)
    - Add scopes: Click "Add or Remove Scopes" and add `https://mail.google.com/` scope
    - Add test users: Click "Add Users" and add **your Gmail address** (the one you want to clean)
    - Click "Save and Continue" through the remaining steps

5. Create OAuth2 credentials:
    - Go to "APIs & Services" > "Credentials"
    - Click "Create Credentials" > "OAuth client ID"
    - Choose "Desktop app" as the application type
    - Download the credentials JSON file
    - Save it as `credentials.json` in the project root

### 3. Authenticate

On first run, you'll need to authorize the application:

1. Run the tool - it will display an authorization URL:

    ```bash
    npm run dev -- --senders "spam@example.com" --dry-run
    ```

2. The tool will show you a URL to visit. Open it in your browser.

3. Sign in with your Google account.

4. **If you see "This app isn't verified" warning:**

    - This is normal for personal/testing apps - you don't need to verify it
    - Click **"Advanced"** at the bottom
    - Then click **"Go to [your app name] (unsafe)"** to proceed
    - This is safe since you're the developer and only using it for yourself

5. Click "Allow" to grant access.

6. After authorization, you'll be redirected to a page. **Look at the URL in your browser** - it will contain a `code` parameter, like:

    ```
    http://localhost:3000/oauth2callback?code=4/XXXXXXXXXXXXXXXXXXXXXXXXXXXXX
    ```

7. **Copy the entire code value** (everything after `code=`) from the URL.

8. **Paste it into the terminal** when prompted by the tool.

After the first authentication, a `token.json` file will be created and you won't need to authenticate again.

**Note:** You can also set `AUTH_CODE` as an environment variable if you prefer:

```bash
AUTH_CODE="your-code-here" npm run dev -- --senders "spam@example.com" --dry-run
```

## Usage

### Basic Examples

**Delete emails from specific senders:**

```bash
npm run dev -- --senders "spam@example.com,promos@example.com"
```

**Delete emails with specific subjects:**

```bash
npm run dev -- --subjects "Unsubscribe,Special Offer"
```

**Combine both criteria:**

```bash
npm run dev -- --senders "spam@example.com" --subjects "Promotion"
```

**Preview what would be deleted (dry run):**

```bash
npm run dev -- --senders "spam@example.com" --dry-run
```

**Limit the number of results:**

```bash
npm run dev -- --senders "spam@example.com" --max-results 100
```

### Command Line Options

-   `--senders <emails>` - Comma-separated list of sender emails to match
-   `--subjects <subjects>` - Comma-separated list of subject keywords to match
-   `--max-results <num>` - Maximum number of emails to process (default: 500, max: 500)
-   `--dry-run` - Show what would be deleted without actually deleting
-   `--help, -h` - Show help message

### Environment Variables

-   `CLIENT_ID` - Google OAuth2 Client ID (optional if using credentials.json)
-   `CLIENT_SECRET` - Google OAuth2 Client Secret (optional if using credentials.json)
-   `REDIRECT_URI` - OAuth2 redirect URI (default: http://localhost:3000/oauth2callback)
-   `AUTH_CODE` - OAuth2 authorization code (only needed for first-time setup)

## Safety Features

-   **Dry-run mode**: Always test with `--dry-run` first
-   **Preview**: Shows a preview of matching emails before deletion
-   **Error handling**: Continues processing even if some deletions fail

## Building

Compile TypeScript to JavaScript:

```bash
npm run build
```

Run the compiled version:

```bash
npm start -- --senders "spam@example.com" --dry-run
```

## Important Notes

⚠️ **Warning**: This tool permanently deletes emails. Deleted emails cannot be recovered.

-   Always use `--dry-run` first to preview what will be deleted
-   Start with a small `--max-results` value to test
-   Be careful with subject keywords - they match partial strings
-   Sender matching is exact (case-insensitive)

## Troubleshooting

### "credentials.json not found"

-   Make sure you've downloaded the OAuth2 credentials from Google Cloud Console
-   Save the file as `credentials.json` in the project root

### "Authorization code is required"

-   This only happens on first run
-   Visit the authorization URL shown in the console
-   After authorization, copy the `code` parameter from the redirect URL
-   Paste it when prompted (or set it as `AUTH_CODE` environment variable)

### "This app isn't verified" warning

-   **This is normal and safe to bypass for personal use**
-   Google shows this for apps that haven't gone through verification
-   Since you're using this tool for yourself, you don't need verification
-   Click **"Advanced"** → **"Go to [app name] (unsafe)"** to proceed
-   App verification is only required if you want to publish the app for public use

### "Error 403: access_denied" or "app is currently being tested"

-   **This means your email isn't added as a test user**
-   Go to [Google Cloud Console](https://console.cloud.google.com/)
-   Navigate to "APIs & Services" > "OAuth consent screen"
-   Scroll down to "Test users" section
-   Click "Add Users"
-   Add **your Gmail address** (the exact email you're trying to use)
-   Click "Add"
-   Try authorizing again - it should work now

### "Token expired" or authentication errors

-   Delete `token.json` and re-authenticate
-   Make sure your OAuth2 credentials are still valid in Google Cloud Console

### Rate limiting

-   Gmail API has rate limits
-   If you hit limits, wait a few minutes and try again
-   Consider processing in smaller batches with `--max-results`

## License

MIT
