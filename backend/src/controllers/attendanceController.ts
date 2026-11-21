import { Request, Response } from 'express';
import type { NextFunction } from 'express';
import { z } from 'zod';
import {
  resolveCheckInIdentity,
  checkInMember,
  getEventAttendance,
  AttendanceServiceError,
} from '../services/attendanceService.js';
import { InvalidQrTokenError } from '../services/qrService.js';

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

const checkInSchema = z.object({
  srCode: z.string().min(1, 'srCode is required').optional(),
  qrToken: z.string().min(1, 'qrToken is required').optional(),
  eventId: z.string().min(1, 'eventId is required'),
}).refine((value) => value.srCode || value.qrToken, {
  message: 'srCode or qrToken is required',
  path: ['srCode'],
});

const getAttendanceSchema = z.object({
  eventId: z.string().min(1, 'eventId is required'),
});

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

/**
 * POST /api/attendance/checkin
 * Role: officer | admin
 *
 * Body: { srCode: string, eventId: string } or { qrToken: string, eventId: string }
 *
 * Returns HTTP 200 always (business failures indicated by `awarded: false`).
 * Returns HTTP 400 only for malformed input.
 */
export async function checkInHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const parsed = checkInSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }

  const { srCode: rawCode, qrToken, eventId } = parsed.data;

  let normalizedCode: string;
  try {
    normalizedCode = await resolveCheckInIdentity({
      srCode: rawCode,
      qrToken,
    });
  } catch (error) {
    if (error instanceof InvalidQrTokenError) {
      res.status(400).json({ error: error.message });
      return;
    }
    throw error;
  }
  try {
    const result = await checkInMember(
      normalizedCode,
      eventId,
      undefined,
      req.user?.uid
    );
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof AttendanceServiceError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    next(error);
  }
}

/**
 * GET /api/attendance/:eventId
 * Role: officer | admin
 *
 * Returns all check-in records for a given event.
 */
export async function getAttendanceHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const parsed = getAttendanceSchema.safeParse({ eventId: req.params.eventId });
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }

  try {
    const records = await getEventAttendance(parsed.data.eventId);
    res.status(200).json({ attendance: records });
  } catch (error) {
    if (error instanceof AttendanceServiceError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    next(error);
  }
}

export async function getEventRosterHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const eventId = z.string().trim().min(1).safeParse(req.params.id);
  if (!eventId.success) {
    res.status(400).json({ error: 'Invalid event ID' });
    return;
  }
  try {
    const records = await getEventAttendance(eventId.data);
    res.status(200).json({
      eventId: eventId.data,
      totalAttendees: records.length,
      roster: records.map((record) => ({
        srCode: record.srCode,
        fullName: record.fullName,
        checkedInAt: record.checkedInAt,
        pointsAwarded: record.pointsAwarded ?? 0,
      })),
    });
  } catch (error) {
    if (error instanceof AttendanceServiceError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    next(error);
  }
}
