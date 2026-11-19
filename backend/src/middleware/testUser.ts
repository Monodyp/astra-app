import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';

export interface AuthenticatedUser {
  uid: string;
  srCode: string;
  role: string;
}

const testUserSchema = z.object({
  uid: z.string().min(1),
  srCode: z.string().min(1),
  role: z.string().min(1),
});

export function testUserMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  if (env.NODE_ENV === 'test') {
    const header = req.header('x-test-user');
    if (header) {
      try {
        const parsed = testUserSchema.safeParse(JSON.parse(header));
        if (parsed.success) req.user = parsed.data;
      } catch {
        // Invalid test headers are treated as unauthenticated.
      }
    }
  }
  next();
}
