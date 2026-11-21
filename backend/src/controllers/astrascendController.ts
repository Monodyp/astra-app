import { Request, Response } from 'express';
import { createServiceRequest } from '../services/serviceRequestService.js';
import { serviceRequestSchema } from '../lib/serviceRequestSchema.js';

export async function getOpportunitiesStub(
  _req: Request,
  res: Response
): Promise<void> {
  res.status(200).json({ opportunities: [] });
}

export async function submitServiceRequest(
  req: Request,
  res: Response
): Promise<void> {
  const parsed = serviceRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', issues: parsed.error.issues });
    return;
  }

  try {
    const result = await createServiceRequest(parsed.data);
    res.status(201).json(result);
  } catch (err) {
    console.error('Failed to save request:', err);
    res.status(500).json({ error: 'Failed to save request' });
  }
}
