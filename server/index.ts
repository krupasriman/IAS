import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { logger } from '../src/utils/logger.ts';
import { sendNotFound, sendServerError } from './utils/errors.ts';
import llmRouter from './routes/llm.ts';
import modelsRouter from './routes/models.ts';
import generateRouter from './routes/generate.ts';
import streamRouter from './routes/stream.ts';
import searchRouter from './routes/search.ts';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Security headers
app.use(helmet({
  contentSecurityPolicy: NODE_ENV === 'production',
  crossOriginEmbedderPolicy: false,
}));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(cors());
app.use(express.json());

// Structured request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(
      { method: req.method, path: req.path, status: res.statusCode, durationMs: duration },
      'request completed'
    );
  });
  next();
});

app.use('/api/', apiLimiter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api', modelsRouter);
app.use('/api', llmRouter);
app.use('/api', generateRouter);
app.use('/api', streamRouter);
app.use('/api', searchRouter);

// 404 handler for API routes
app.use('/api', (req, res) => {
  logger.warn({ method: req.method, path: req.path }, 'API endpoint not found');
  sendNotFound(res, `API endpoint not found: ${req.method} ${req.path}`);
});

// Global error handler - ensures all errors return JSON.
// Must be registered AFTER all routes so it catches their errors.
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err, method: req.method, path: req.path }, 'Server error');
  sendServerError(res, err?.message || 'Internal server error');
});

// 404 handler for non-API routes
app.use((_req, res) => {
  sendNotFound(res, 'Not found');
});

app.listen(PORT, () => {
  logger.info({ port: PORT, env: NODE_ENV }, 'Server started');
});