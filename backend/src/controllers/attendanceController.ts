import { Request, Response } from 'express';
import { z } from 'zod';
import {
  resolveCheckInIdentity,
  checkInMember,
  getEventAttendance,
} from '../services/attendanceService.js';

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

const checkInSchema = z.object({
  srCode: z.string().min(1, 'srCode is required'),
  eventId: z.string().min(1, 'eventId is required'),
  points: z.number().int().positive().optional(),
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
 * Body: { srCode: string, eventId: string, points?: number }
 *
 * Returns HTTP 200 always (business failures indicated by `awarded: false`).
 * Returns HTTP 400 only for malformed input.
 */
export async function checkInHandler(
  req: Request,
  res: Response
): Promise<void> {
  const parsed = checkInSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }

  const { srCode: rawCode, eventId, points } = parsed.data;

  const normalizedCode = await resolveCheckInIdentity({ srCode: rawCode });
  const result = await checkInMember(normalizedCode, eventId, points);

  res.status(200).json(result);
}

/**
 * GET /api/attendance/:eventId
 * Role: officer | admin
 *
 * Returns all check-in records for a given event.
 */
export async function getAttendanceHandler(
  req: Request,
  res: Response
): Promise<void> {
  const parsed = getAttendanceSchema.safeParse({ eventId: req.params.eventId });
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }

  const records = await getEventAttendance(parsed.data.eventId);
  res.status(200).json({ attendance: records });
}
