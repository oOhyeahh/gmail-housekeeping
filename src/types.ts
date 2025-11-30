export interface CleanupConfig {
  senders?: string[];
  subjects?: string[];
  maxResults?: number;
  dryRun?: boolean;
}

export interface EmailMatch {
  id: string;
  threadId: string;
  snippet: string;
}

export interface CleanupResult {
  totalFound: number;
  deleted: number;
  errors: string[];
}

