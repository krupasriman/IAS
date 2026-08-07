import type { WebSearchResultItem, WebSearchResponse } from '../../types/search.types';
import type { SearchSettings, SearchProvider } from '../../types/settings.types';

/**
 * Client-side web search.
 * DuckDuckGo has a public JSON/HTML endpoint that works in browsers (with CORS considerations).
 * For robustness, we use DuckDuckGo's lite interface via a CORS-friendly approach
 * and Wikipedia's free search API as a reliable fallback for factual topics.
 */
export async function webSearch(
  query: string,
  settings: SearchSettings
): Promise<WebSearchResponse> {
  const provider = settings.provider || 'duckduckgo';
  const apiKey = settings.apiKeys?.[provider as SearchProvider] || '';

  try {
    switch (provider) {
      case 'tavily':
        if (apiKey) return searchTavily(query, settings);
        return searchDuckDuckGo(query, settings);
      case 'serpapi':
        if (apiKey) return searchSerpApi(query, settings);
        return searchDuckDuckGo(query, settings);
      case 'brave':
        if (apiKey) return searchBrave(query, settings);
        return searchDuckDuckGo(query, settings);
      case 'langsearch':
        if (apiKey) return searchLangSearch(query, settings);
        return searchDuckDuckGo(query, settings);
      case 'duckduckgo':
      default:
        return searchDuckDuckGo(query, settings);
    }
  } catch (error) {
    console.error('Web search failed:', error);
    // Fallback to Wikipedia for factual topics
    try {
      return searchWikipedia(query, settings);
    } catch (wikiError) {
      console.error('Wikipedia fallback failed:', wikiError);
      return {
        query,
        results: [],
        provider: provider as string,
        timestamp: new Date().toISOString()
      };
    }
  }
}

async function searchDuckDuckGo(
  query: string,
  settings: SearchSettings
): Promise<WebSearchResponse> {
  const maxResults = settings.maxResults || 8;
  const proxyUrls = [
    `/api/search/duckduckgo?q=${encodeURIComponent(query)}`
  ];

  let html = '';
  for (const proxyUrl of proxyUrls) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(proxyUrl, {
        signal: controller.signal,
        headers: { 'Accept': 'text/html,application/xhtml+xml' }
      });
      clearTimeout(timeout);
      if (res.ok) {
        html = await res.text();
        break;
      }
    } catch {
      continue;
    }
  }

  const results: WebSearchResultItem[] = [];
  if (html) {
    // Parse DuckDuckGo HTML results
    const blocks = html.split(/<div class=["']result['"]/).slice(1);
    for (const block of blocks.slice(0, maxResults)) {
      const titleMatch = block.match(/<a[^>]*class=["']result__a["'][^>]*>([\s\S]*?)<\/a>/);
      const urlMatch = block.match(/href=["']([^"']*?)["']/);
      const snippetMatch = block.match(/<a[^>]*class=["']result__snippet["'][^>]*>([\s\S]*?)<\/a>/);

      const title = titleMatch ? stripHtml(titleMatch[1]) : '';
      let url = urlMatch ? decodeURIComponent(urlMatch[1].replace(/^\/\//, 'https://')) : '';
      if (url.includes('uddg=')) {
        try {
          url = decodeURIComponent(url.split('uddg=')[1].split('&')[0]);
        } catch {}
      }
      const snippet = snippetMatch ? stripHtml(snippetMatch[1]) : '';

      if (title && url) {
        results.push({ title, url, snippet });
      }
    }
  }

  // If DuckDuckGo parsing produced no results, fallback to Wikipedia
  if (results.length === 0) {
    return searchWikipedia(query, settings);
  }

  return {
    query,
    results,
    provider: 'duckduckgo',
    timestamp: new Date().toISOString()
  };
}

async function searchWikipedia(
  query: string,
  settings: SearchSettings
): Promise<WebSearchResponse> {
  const maxResults = settings.maxResults || 8;
  const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=${maxResults}&origin=*`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Wikipedia search failed');
  }
  const data = await res.json();

  const results: WebSearchResultItem[] = (data?.query?.search ?? []).map((item: any) => ({
    title: item.title,
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`,
    snippet: stripHtml(item.snippet || ''),
    source: 'Wikipedia'
  }));

  return {
    query,
    results,
    provider: 'wikipedia',
    timestamp: new Date().toISOString()
  };
}

async function searchSerpApi(query: string, settings: SearchSettings): Promise<WebSearchResponse> {
  const apiKey = settings.apiKeys?.serpapi || '';
  const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&api_key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('SerpAPI request failed');
  const data = await res.json();
  const results: WebSearchResultItem[] = (data?.organic_results ?? []).map((r: any) => ({
    title: r.title || '',
    url: r.link || '',
    snippet: r.snippet || '',
    source: 'Google'
  }));
  return { query, results, provider: 'serpapi', timestamp: new Date().toISOString() };
}

async function searchBrave(query: string, settings: SearchSettings): Promise<WebSearchResponse> {
  const apiKey = settings.apiKeys?.brave || '';
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${settings.maxResults || 8}`;
  const res = await fetch(url, {
    headers: { 'X-Subscription-Token': apiKey }
  });
  if (!res.ok) throw new Error('Brave Search request failed');
  const data = await res.json();
  const results: WebSearchResultItem[] = (data?.web?.results ?? []).map((r: any) => ({
    title: r.title || '',
    url: r.url || '',
    snippet: r.description || '',
    source: 'Brave'
  }));
  return { query, results, provider: 'brave', timestamp: new Date().toISOString() };
}

async function searchTavily(query: string, settings: SearchSettings): Promise<WebSearchResponse> {
  const apiKey = settings.apiKeys?.tavily || '';
  const url = 'https://api.tavily.com/search';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: settings.maxResults || 8
    })
  });
  if (!res.ok) throw new Error('Tavily request failed');
  const data = await res.json();
  const results: WebSearchResultItem[] = (data?.results ?? []).map((r: any) => ({
    title: r.title || '',
    url: r.url || '',
    snippet: r.content || '',
    source: 'Tavily'
  }));
  return { query, results, provider: 'tavily', timestamp: new Date().toISOString() };
}

async function searchLangSearch(query: string, settings: SearchSettings): Promise<WebSearchResponse> {
  const apiKey = settings.apiKeys?.langsearch || '';
  const url = 'https://api.langsearch.com/v1/web-search';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({ query, count: settings.maxResults || 8 })
  });
  if (!res.ok) throw new Error('LangSearch request failed');
  const data = await res.json();
  const results: WebSearchResultItem[] = (data?.results ?? data?.web ?? []).map((r: any) => ({
    title: r.title || r.name || '',
    url: r.url || '',
    snippet: r.snippet || r.description || '',
    source: 'LangSearch'
  }));
  return { query, results, provider: 'langsearch', timestamp: new Date().toISOString() };
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}