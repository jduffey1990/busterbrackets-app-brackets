"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NewsService = void 0;
// src/controllers/newsService.ts
const rss_parser_1 = __importDefault(require("rss-parser"));
/**
 * RSS feeds scoped to men's college basketball / NCAA tournament coverage.
 * Fox Sports retired its RSS API and Barstool removed its feeds entirely;
 * add new sources here as they become available.
 */
const NEWS_SOURCES = [
    { name: 'ESPN', url: 'https://www.espn.com/espn/rss/ncb/news' },
    { name: 'CBS Sports', url: 'https://www.cbssports.com/rss/headlines/college-basketball/' },
    { name: 'Yahoo Sports', url: 'https://sports.yahoo.com/college-basketball/rss/' },
];
const MAX_PER_SOURCE = 8;
const MAX_TOTAL = 15;
const SNIPPET_MAX_LENGTH = 200;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
class NewsService {
    /**
     * Get the latest NCAA news articles across all sources.
     * Results are cached in memory; concurrent callers share one fetch.
     */
    static getLatest() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.cache && Date.now() - this.cache.fetchedAt < CACHE_TTL_MS) {
                return this.cache.articles;
            }
            if (!this.inflight) {
                this.inflight = this.fetchAllSources().finally(() => {
                    this.inflight = null;
                });
            }
            try {
                const articles = yield this.inflight;
                this.cache = { articles, fetchedAt: Date.now() };
                return articles;
            }
            catch (error) {
                console.error('Failed to refresh news feeds:', error);
                // Serve stale articles rather than nothing if every feed failed
                if (this.cache)
                    return this.cache.articles;
                throw error;
            }
        });
    }
    /**
     * Fetch every source concurrently; a single failing feed is logged and
     * skipped so the rest still come through.
     */
    static fetchAllSources() {
        return __awaiter(this, void 0, void 0, function* () {
            const results = yield Promise.allSettled(NEWS_SOURCES.map(source => this.fetchSource(source)));
            const articles = [];
            results.forEach((result, i) => {
                if (result.status === 'fulfilled') {
                    articles.push(...result.value);
                }
                else {
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
        });
    }
    static fetchSource(source) {
        return __awaiter(this, void 0, void 0, function* () {
            const feed = yield this.parser.parseURL(source.url);
            return (feed.items || [])
                .filter(item => item.title && item.link)
                .slice(0, MAX_PER_SOURCE)
                .map(item => ({
                title: item.title.trim(),
                snippet: this.toSnippet(item.contentSnippet || item.content || ''),
                link: item.link,
                source: source.name,
                publishedAt: item.isoDate || item.pubDate || null,
            }));
        });
    }
    /**
     * Feed descriptions can contain HTML and run long; reduce to plain text
     * capped for the dashboard card.
     */
    static toSnippet(raw) {
        const text = raw
            .replace(/<[^>]*>/g, '')
            .replace(/&amp;/g, '&')
            .replace(/&#39;|&apos;/g, "'")
            .replace(/&quot;/g, '"')
            .replace(/&nbsp;/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        if (text.length <= SNIPPET_MAX_LENGTH)
            return text;
        return `${text.slice(0, SNIPPET_MAX_LENGTH).replace(/\s+\S*$/, '')}...`;
    }
}
exports.NewsService = NewsService;
NewsService.parser = new rss_parser_1.default({
    timeout: 10000,
    headers: { 'User-Agent': 'BusterBrackets/1.0 (+https://busterbrackets.com)' },
});
NewsService.cache = null;
NewsService.inflight = null;
