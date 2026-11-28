import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import {
  getMemberPoints,
  getPointsHistory,
  grantPoints,
} from '../services/pointsService.js';
import { getConfiguredMemberService } from '../config/members.js';
import { voucherRepository } from '../repositories/voucherRepository.js';
import { firebaseAdmin } from '../lib/firebase.js';

const memberIdSchema = z.string().trim().min(1).max(128);
const grantSchema = z.object({
  memberId: memberIdSchema,
  amount: z.number().int().positive().max(1_000),
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
  if (!user.srCode) {
    res.status(409).json({ error: 'MEMBER_LINK_REQUIRED', code: 'MEMBER_LINK_REQUIRED' });
    return;
  }
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
  if (!user.srCode) {
    res.status(409).json({ error: 'MEMBER_LINK_REQUIRED', code: 'MEMBER_LINK_REQUIRED' });
    return;
  }
  try {
    const history = await getPointsHistory(user.srCode);
    res.status(200).json({ history });
  } catch (error) {
    next(error);
  }
}

export async function searchMembersHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const parsed = z.object({ q: z.string().trim().min(2).max(100) }).safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'Search query must be at least 2 characters' });
    return;
  }
  try {
    const members = getConfiguredMemberService();
    const page = await members.searchMemberSummaries(parsed.data.q);
    const summarize = async (member: (typeof page.members)[number]) => ({
      id: member.srCode,
      fullName: member.fullName,
      srCode: member.srCode,
      email: member.email ?? null,
      currentPoints: await getMemberPoints(member.srCode),
      membershipId: member.membershipId ?? member.controlNumber ?? member.srCode,
      membershipStatus: member.membershipStatus,
    });
    const summaries: Awaited<ReturnType<typeof summarize>>[] = [];
    let nextIndex = 0;
    await Promise.all(Array.from({ length: Math.min(4, page.members.length) }, async () => {
      while (nextIndex < page.members.length) {
        const index = nextIndex++;
        summaries[index] = await summarize(page.members[index]);
      }
    }));
    res.status(200).json({ members: summaries, hasMore: page.hasMore, limit: page.limit });
  } catch (error) {
    next(error);
  }
}

export async function getMemberOverviewHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const user = getUser(req, res);
  if (!user) return;
  if (!user.srCode) {
    res.status(409).json({ error: 'MEMBER_LINK_REQUIRED', code: 'MEMBER_LINK_REQUIRED' });
    return;
  }
  try {
    const memberService = getConfiguredMemberService();
    const member = await memberService.findMember(user.srCode);
    if (!member) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }
    const [points, recentVouchers, eventSnapshot] = await Promise.all([
      getMemberPoints(user.srCode),
      voucherRepository.listByMember(user.srCode),
      firebaseAdmin.firestore().collection('events').get(),
    ]);
    const now = Date.now();
    const upcomingEvents = eventSnapshot.docs
      .map((document) => {
        const data = document.data() as Record<string, unknown>;
        return { id: document.id, ...data };
      })
      .filter((event) => {
        const eventData = event as Record<string, unknown>;
        const raw = eventData.startAt ?? eventData.date ?? eventData.startsAt;
        if (!raw) return true;
        const date = typeof raw === 'object'
          && raw !== null
          && 'toDate' in raw
          && typeof raw.toDate === 'function'
          ? raw.toDate()
          : new Date(String(raw));
        return !Number.isNaN(date.getTime()) && date.getTime() >= now;
      })
      .slice(0, 10);
    res.status(200).json({
      member: {
        uid: user.uid,
        srCode: member.srCode,
        fullName: member.fullName,
        membershipId: member.membershipId ?? member.controlNumber ?? null,
        controlNumber: member.controlNumber ?? null,
        program: member.program ?? null,
        yearLevel: member.yearLevel ?? null,
        email: member.email ?? null,
      },
      points,
      recentVouchers: recentVouchers.slice(0, 10),
      upcomingEvents,
    });
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
  if (user.role !== 'officer' && user.role !== 'admin') {
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
