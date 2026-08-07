import { Router } from 'express';
import { logger } from '../../src/utils/logger.ts';
import { sendError } from '../utils/errors.ts';

const router = Router();

async function fetchModels(url: string, authHeader: string | undefined, logName: string): Promise<{ status: number; body: any }> {
  try {
    const headers: Record<string, string> = {};
    if (authHeader) {
      const key = authHeader.replace(/^Bearer\s+/i, '').trim();
      headers['Authorization'] = `Bearer ${key}`;
    }
    const response = await fetch(url, { headers });
    if (!response.ok) {
      logger.warn({ status: response.status }, `${logName} models request failed`);
      return { status: response.status, body: { error: `${logName} API returned ${response.status}` } };
    }
    const data: any = await response.json();
    logger.info({ count: Array.isArray(data?.data) ? data.data.length : undefined }, `${logName} models fetched`);
    return { status: 200, body: data };
  } catch (error: any) {
    logger.error({ err: error }, `Failed to fetch models from ${logName}`);
    return { status: 500, body: { error: error?.message || `Failed to fetch models from ${logName}` } };
  }
}

router.get('/openrouter/models', async (req, res) => {
  const result = await fetchModels('https://openrouter.ai/api/v1/models', req.headers.authorization, 'OpenRouter');
  if (result.status === 200) {
    res.json(result.body);
  } else {
    sendError(res, result.status, result.body.error);
  }
});

router.get('/generalcompute/models', async (req, res) => {
  const result = await fetchModels('https://api.generalcompute.com/v1/public/models', req.headers.authorization, 'General Compute');
  if (result.status === 200) {
    res.json(result.body);
  } else {
    sendError(res, result.status, result.body.error);
  }
});

export default router;