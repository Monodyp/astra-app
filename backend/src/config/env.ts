import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('4000'),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  FIREBASE_PROJECT_ID: z.string().default('astra-dev-project'),
  FIREBASE_SERVICE_ACCOUNT_JSON: z.string().optional(),
  DATA_CONNECT_SERVICE_ID: z.string().default('astra-dataconnect'),
  DATA_CONNECT_LOCATION: z.string().default('us-central1'),
  DATA_CONNECT_CONNECTOR: z.string().default('default'),
  JWT_SECRET: z.string().default('dev-secret-key'),
  QR_SIGNING_SECRET: z.string().default('dev-qr-key'),
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().optional(),
  GOOGLE_PRIVATE_KEY: z.string().optional(),
  MEMBERS_SHEET_ID: z.string().optional(),
  PAID_SHEET_ID: z.string().optional(),
  OPPORTUNITIES_SHEET_ID: z.string().optional(),
  ATTENDANCE_POINTS: z.string().default('10'),
});

export const env = envSchema.parse(process.env);
