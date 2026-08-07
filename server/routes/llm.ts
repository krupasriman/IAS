import { Router } from 'express';
import type { Request as ExpressRequest, Response } from 'express';
import { validateLLMRequest } from '../validation/llm.middleware.ts';
import { proxyChatCompletion } from '../services/llm.ts';
import { logger } from '../../src/utils/logger.ts';
import type { LLMRequest } from '../validation/llm.ts';
import { sendServerError } from '../utils/errors.ts';

const router = Router();

router.post('/llm', validateLLMRequest, async (req: ExpressRequest, res: Response) => {
  try {
    const request = req.body as LLMRequest;
    logger.info({ provider: request.provider, model: request.model }, 'LLM proxy request');

    const result = await proxyChatCompletion(request);
    if (result.status >= 400) {
      logger.warn({ status: result.status, provider: request.provider }, 'LLM proxy returned error response');
    }
    res.status(result.status).json(result.body);
  } catch (error: any) {
    logger.error({ err: error }, 'Failed to process LLM request');
    sendServerError(res, error?.message || 'Failed to process LLM request');
  }
});

export default router;