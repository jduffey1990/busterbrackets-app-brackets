// src/controllers/newsService.ts
import Parser from 'rss-parser';

export interface NewsArticle {
  title: string;
  snippet: string;
  link: string;
  source: string;
  publishedAt: string | null;
}

interface NewsSource {
  name: string;
  url: string;
}

/**
 * RSS feeds scoped to men's college basketball / NCAA tournament coverage.
 * Fox Sports retired its RSS API and Barstool removed its feeds entirely;
 * add new sources here as they become available.
 */
const NEWS_SOURCES: NewsSource[] = [
  { name: 'ESPN', url: 'https://www.espn.com/espn/rss/ncb/news' },
  { name: 'CBS Sports', url: 'https://www.cbssports.com/rss/headlines/college-basketball/' },
  { name: 'Yahoo Sports', url: 'https://sports.yahoo.com/college-basketball/rss/' },
];

const MAX_PER_SOURCE = 8;
const MAX_TOTAL = 15;
const SNIPPET_MAX_LENGTH = 200;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

export class NewsService {
  private static parser = new Parser({
    timeout: 10000,
    headers: { 'User-Agent': 'BusterBrackets/1.0 (+https://busterbrackets.com)' },
  });

  private static cache: { articles: NewsArticle[]; fetchedAt: number } | null = null;
  private static inflight: Promise<NewsArticle[]> | null = null;

  /**
   * Get the latest NCAA news articles across all sources.
   * Results are cached in memory; concurrent callers share one fetch.
   */
  public static async getLatest(): Promise<NewsArticle[]> {
    if (this.cache && Date.now() - this.cache.fetchedAt < CACHE_TTL_MS) {
      return this.cache.articles;
    }

    if (!this.inflight) {
      this.inflight = this.fetchAllSources().finally(() => {
        this.inflight = null;
      });
    }

    try {
      const articles = await this.inflight;
      this.cache = { articles, fetchedAt: Date.now() };
      return articles;
    } catch (error) {
      console.error('Failed to refresh news feeds:', error);
      // Serve stale articles rather than nothing if every feed failed
      if (this.cache) return this.cache.articles;
      throw error;
    }
  }

  /**
   * Fetch every source concurrently; a single failing feed is logged and
   * skipped so the rest still come through.
   */
  private static async fetchAllSources(): Promise<NewsArticle[]> {
    const results = await Promise.allSettled(
      NEWS_SOURCES.map(source => this.fetchSource(source))
    );

    const articles: NewsArticle[] = [];
    results.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        articles.push(...result.value);
      } else {
        console.error(`News feed failed (${NEWS_SOURCES[i].name}):`, result.reason);
      }
    });

    if (articles.length === 0) {
      throw new Error('All news feeds failed');
    }

    articles.sort((a, b) => {
      const aTime = a.publishedAt ? Date.parse(a.publishedAt) : 0;
      const bTime = b.publishedAt ? Date.parse(b.publishedAt) : 0;
      return bTime - aTime;
    });

    return articles.slice(0, MAX_TOTAL);
  }

  private static async fetchSource(source: NewsSource): Promise<NewsArticle[]> {
    const feed = await this.parser.parseURL(source.url);
    return (feed.items || [])
      .filter(item => item.title && item.link)
      .slice(0, MAX_PER_SOURCE)
      .map(item => ({
        title: item.title!.trim(),
        snippet: this.toSnippet(item.contentSnippet || item.content || ''),
        link: item.link!,
        source: source.name,
        publishedAt: item.isoDate || item.pubDate || null,
      }));
  }

  /**
   * Feed descriptions can contain HTML and run long; reduce to plain text
   * capped for the dashboard card.
   */
  private static toSnippet(raw: string): string {
    const text = raw
      .replace(/<[^>]*>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&#39;|&apos;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (text.length <= SNIPPET_MAX_LENGTH) return text;
    return `${text.slice(0, SNIPPET_MAX_LENGTH).replace(/\s+\S*$/, '')}...`;
  }
}
