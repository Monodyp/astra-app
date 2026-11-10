import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import {
  loginStub,
  getAuthMeStub,
  getMemberIdCardStub,
  verifyTokenStub,
} from '../controllers/authAndMemberController.js';
import {
  getPointsMeStub,
  getPointsHistoryStub,
  grantPointsStub,
} from '../controllers/pointsController.js';
import {
  getEventsStub,
  checkInEventStub,
} from '../controllers/eventsController.js';
import {
  getPerksStub,
  redeemPerkStub,
  getVouchersMeStub,
  getVoucherByIdStub,
  validateVoucherHandler,
  applyVoucherHandler,
} from '../controllers/perksAndVouchersController.js';
import {
  checkInHandler,
  getAttendanceHandler,
} from '../controllers/attendanceController.js';
import {
  getOpportunitiesStub,
  submitServiceRequest,
} from '../controllers/astrascendController.js';

export const router = Router();

// Health check (Real implementation)
router.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Auth & Member routes
router.post('/auth/login', loginStub);
router.get('/auth/me', authMiddleware, getAuthMeStub);
router.get('/members/me/id', authMiddleware, getMemberIdCardStub);
router.get('/verify/:token', verifyTokenStub);

// Points & Ledger routes
router.get('/points/me', authMiddleware, getPointsMeStub);
router.get('/points/me/history', authMiddleware, getPointsHistoryStub);
router.post(
  '/points/grant',
  authMiddleware,
  requireRole('officer'),
  grantPointsStub
);

// Events routes
router.get('/events', authMiddleware, getEventsStub);
router.post('/events/:id/checkin', authMiddleware, checkInEventStub);

// Perks & Vouchers routes
router.get('/perks', authMiddleware, getPerksStub);
router.post('/perks/:id/redeem', authMiddleware, redeemPerkStub);
router.get('/vouchers/me', authMiddleware, getVouchersMeStub);
router.get('/vouchers/:id', authMiddleware, getVoucherByIdStub);

// Attendance routes (officer/admin)
router.post(
  '/attendance/checkin',
  authMiddleware,
  requireRole('officer'),
  checkInHandler
);
router.get(
  '/attendance/:eventId',
  authMiddleware,
  requireRole('officer'),
  getAttendanceHandler
);

// Partner Redemption routes (partner/admin)
router.post(
  '/partner/validate',
  authMiddleware,
  requireRole('partner'),
  validateVoucherHandler
);
router.post(
  '/partner/apply',
  authMiddleware,
  requireRole('partner'),
  applyVoucherHandler
);

// ASTRAscend routes
router.get('/astrascend/opportunities', getOpportunitiesStub);
router.post('/astrascend/requests', submitServiceRequest);
