import { supabase } from '../lib/supabaseClient';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

export interface EmailList {
  id: string;
  name: string;
  email_count: number;
  emails?: string[];
  created_at: string;
  updated_at?: string;
}

async function getAuthToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

async function fetchWithAuth(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });
}

/**
 * Get all email lists for the current user
 */
export async function getEmailLists(): Promise<EmailList[]> {
  const res = await fetchWithAuth('/api/email-lists');

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to fetch email lists' }));
    throw new Error(error.error || 'Failed to fetch email lists');
  }

  return res.json();
}

/**
 * Get a single email list with all emails
 */
export async function getEmailList(id: string): Promise<EmailList> {
  const res = await fetchWithAuth(`/api/email-lists/${id}`);

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to fetch email list' }));
    throw new Error(error.error || 'Failed to fetch email list');
  }

  return res.json();
}

/**
 * Create a new email list from an array of emails
 */
export async function createEmailList(name: string, emails: string[]): Promise<EmailList> {
  const res = await fetchWithAuth('/api/email-lists', {
    method: 'POST',
    body: JSON.stringify({ name, emails }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to create email list' }));
    throw new Error(error.error || 'Failed to create email list');
  }

  return res.json();
}

/**
 * Delete an email list
 */
export async function deleteEmailList(id: string): Promise<void> {
  const res = await fetchWithAuth(`/api/email-lists/${id}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to delete email list' }));
    throw new Error(error.error || 'Failed to delete email list');
  }
}

/**
 * Parse a CSV file and extract email addresses
 * Supports various CSV formats:
 * - Single column of emails
 * - Column named "email" or "Email"
 * - First column if no header matches
 */
export function parseCSVForEmails(csvContent: string): string[] {
  const lines = csvContent.trim().split(/\r?\n/);
  if (lines.length === 0) return [];

  const emails: string[] = [];
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Check if first line is a header
  const firstLine = lines[0].toLowerCase();
  const hasHeader = firstLine.includes('email') || firstLine.includes('name') || firstLine.includes('first');

  // Find email column index if there's a header
  let emailColumnIndex = 0;
  if (hasHeader) {
    const headers = lines[0].split(/[,;\t]/);
    const emailIndex = headers.findIndex(h =>
      h.toLowerCase().trim() === 'email' ||
      h.toLowerCase().trim() === 'e-mail' ||
      h.toLowerCase().trim() === 'email address'
    );
    if (emailIndex !== -1) {
      emailColumnIndex = emailIndex;
    }
  }

  // Process data rows
  const startRow = hasHeader ? 1 : 0;
  for (let i = startRow; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Split by common delimiters
    const columns = line.split(/[,;\t]/);

    // Try to find an email in the expected column or any column
    let foundEmail = false;

    // First try the expected column
    if (columns[emailColumnIndex]) {
      const potential = columns[emailColumnIndex].trim().replace(/["']/g, '');
      if (emailRegex.test(potential)) {
        emails.push(potential);
        foundEmail = true;
      }
    }

    // If not found, search all columns
    if (!foundEmail) {
      for (const col of columns) {
        const potential = col.trim().replace(/["']/g, '');
        if (emailRegex.test(potential)) {
          emails.push(potential);
          break;
        }
      }
    }
  }

  // Remove duplicates and return
  return [...new Set(emails.map(e => e.toLowerCase()))];
}
