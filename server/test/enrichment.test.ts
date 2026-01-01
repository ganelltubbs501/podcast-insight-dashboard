import fs from 'fs';
import path from 'path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { fetchRSSSummary } from '../src/enrichment';

const fixture = fs.readFileSync(path.resolve(__dirname, 'fixtures/sample-feed.xml'), 'utf-8');

describe('fetchRSSSummary', () => {
  beforeEach(() => {
    // stub global fetch to return fixture
    (global as any).fetch = (url: string) => Promise.resolve({ ok: true, text: () => Promise.resolve(fixture) });
  });

  afterEach(() => {
    delete (global as any).fetch;
  });

  it('parses RSS and extracts sponsorCandidates and items', async () => {
    const res = await fetchRSSSummary('http://example.com/feed');
    expect(res).toBeTruthy();
    expect(res.itemCount).toBeGreaterThan(0);
    expect(Array.isArray(res.recent)).toBe(true);
    expect(res.sponsorMentions).toBeGreaterThan(0);
    // sponsorCandidates should include 'Acme' or 'Acme Corp'
    const found = (res.sponsorCandidates || []).some((s: any) => /Acme/i.test(s.name || s));
    expect(found).toBe(true);
  });
});