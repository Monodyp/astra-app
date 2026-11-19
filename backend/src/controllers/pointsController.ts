import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import {
  getMemberPoints,
  getPointsHistory,
  grantPoints,
} from '../services/pointsService.js';

const memberIdSchema = z.string().trim().min(1).max(128);
const grantSchema = z.object({
  memberId: memberIdSchema,
  amount: z.number().int().positive().max(1_000_000),
  reason: z.string().trim().min(1).max(200),
  referenceId: z.string().trim().min(1).max(200).optional(),
  idempotencyKey: z.string().trim().min(1).max(100),
});

function getUser(req: Request, res: Response): NonNullable<Request['user']> | null {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return null;
  }
  return req.user;
}

export async function getPointsMe(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const user = getUser(req, res);
  if (!user) return;
  try {
  const points = await getMemberPoints(user.srCode);
  res.status(200).json({ points });
  } catch (error) {
    next(error);
  }
}

export async function getPointsHistoryHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const user = getUser(req, res);
  if (!user) return;
  try {
    const history = await getPointsHistory(user.srCode);
    res.status(200).json({ history });
  } catch (error) {
    next(error);
  }
}

export async function grantPointsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const user = getUser(req, res);
  if (!user) return;
  if (user.role !== 'officer') {
    res.status(403).json({ error: 'Officer role required' });
    return;
  }
  const parsed = grantSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }
  try {
    const entry = await grantPoints({
      ...parsed.data,
      officerId: user.uid,
    });
    res.status(201).json({ entry });
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode;
    if (statusCode === 404 || statusCode === 409) {
      res.status(statusCode).json({ error: (error as Error).message });
      return;
    }
    next(error);
  }
}
