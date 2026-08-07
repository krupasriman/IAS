import { Router } from 'express';
import { logger } from '../../src/utils/logger.ts';
import { sendError } from '../utils/errors.ts';

const router = Router();

router.get('/search/duckduckgo', async (req, res) => {
  const query = req.query.q as string;
  if (!query) {
    sendError(res, 400, 'Query parameter "q" is required');
    return;
  }

  const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}&ia=web`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'text/html,application/xhtml+xml',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      }
    });
    clearTimeout(timeout);

    if (!response.ok) {
      logger.warn({ status: response.status }, 'DuckDuckGo proxy request failed');
      sendError(res, response.status, `DuckDuckGo API returned ${response.status}`);
      return;
    }

    const html = await response.text();
    res.send(html);
  } catch (error: any) {
    logger.error({ err: error }, 'Failed to fetch from DuckDuckGo');
    sendError(res, 500, error?.message || 'Failed to fetch from DuckDuckGo');
  }
});

export default router;
