import { Request, Response } from 'express';
import { firebaseAdmin } from '../lib/firebase.js';

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

// TODO(AI/Backend): Record member attendance check-in and award event points
export async function checkInEventStub(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  void id;
  res.status(501).json({
    error: 'POST /events/:id/checkin not implemented',
    checkedIn: false,
  });
}
