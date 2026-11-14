import { Router } from 'express';
import { z } from 'zod';
import { getConfiguredMemberService } from '../config/members.js';
import type { MemberService } from '../services/members.js';

const verificationInput = z.object({
  srCode: z.string().trim().min(1).max(128),
});

export function createMemberVerificationRouter(
  service?: MemberService
): Router {
  const router = Router();
  router.post('/members/verify', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const input = verificationInput.safeParse(req.body);
    if (!input.success) {
      res.status(400).json({ error: 'INVALID_SR_CODE' });
      return;
    }
    try {
      const members = service ?? getConfiguredMemberService();
      res.json(await members.verifyMembership(input.data.srCode));
    } catch {
      res.status(503).json({ error: 'MEMBER_SOURCE_UNAVAILABLE' });
    }
  });
  return router;
}
