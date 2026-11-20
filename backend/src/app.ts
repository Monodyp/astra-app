import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { router } from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { createMemberVerificationRouter } from './routes/memberVerification.js';

export const app = express();

function parseAllowedOrigins(raw: string): string | string[] {
  const origins = raw
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  return origins.length === 1 ? origins[0] : origins;
}

app.set('trust proxy', 1);

app.use(
  cors({
    origin: parseAllowedOrigins(env.FRONTEND_URL),
    credentials: true,
  })
);
app.use(express.json());

// Mount API routes
app.use('/', router);
app.use('/', createMemberVerificationRouter());

// Error handling middleware
app.use(errorHandler);

export default app;
