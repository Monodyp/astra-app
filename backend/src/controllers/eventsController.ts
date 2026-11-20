import { Request, Response } from 'express';
import { z } from 'zod';
import { firebaseAdmin } from '../lib/firebase.js';
import {
  resolveCheckInIdentity,
  checkInMember,
} from '../services/attendanceService.js';
import { InvalidQrTokenError } from '../services/qrService.js';

const events = firebaseAdmin.firestore().collection('events');

function serializeEventValue(value: unknown): unknown {
  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof value.toDate === 'function'
  ) {
    return value.toDate().toISOString();
  }
  return value;
}

// Return all event documents, including the Firestore document ID.
export async function getEvents(_req: Request, res: Response): Promise<void> {
  const snapshot = await events.get();
  const result = snapshot.docs.map((document) => {
    const data = document.data();
    const event = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        key,
        serializeEventValue(value),
      ])
    );
    return { id: document.id, ...event };
  });

  res.status(200).json({ events: result });
}

const eventCheckInSchema = z.object({
  qrToken: z.string().min(1, 'qrToken is required'),
  points: z.number().int().positive().optional(),
});

export async function checkInEvent(
  req: Request,
  res: Response
): Promise<void> {
  const parsed = eventCheckInSchema.safeParse(req.body);
  const eventId = z.string().min(1).safeParse(req.params.id);
  if (!parsed.success || !eventId.success) {
    const details = parsed.success
      ? { id: eventId.success ? undefined : eventId.error.flatten() }
      : parsed.error.flatten();
    res.status(400).json({
      error: 'Invalid input',
      details,
    });
    return;
  }

  try {
    const srCode = await resolveCheckInIdentity({
      qrToken: parsed.data.qrToken,
    });
    const result = await checkInMember(srCode, eventId.data, parsed.data.points);
    res.status(200).json({ ...result, checkedIn: result.awarded });
  } catch (error) {
    if (error instanceof InvalidQrTokenError) {
      res.status(400).json({ error: error.message, checkedIn: false });
      return;
    }
    throw error;
  }
}
