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
  getPointsMe,
  getPointsHistoryHandler,
  grantPointsHandler,
  searchMembersHandler,
  getMemberOverviewHandler,
} from '../controllers/pointsController.js';
import {
  getEvents,
  checkInEvent,
} from '../controllers/eventsController.js';
import {
  getPerks,
  redeemPerkHandler,
  getVouchersMe,
  getVoucherById,
  validateVoucherHandler,
  applyVoucherHandler,
} from '../controllers/perksAndVouchersController.js';
import {
  checkInHandler,
  getAttendanceHandler,
  getEventRosterHandler,
} from '../controllers/attendanceController.js';
import {
  getOpportunitiesStub,
  submitServiceRequest,
} from '../controllers/astrascendController.js';

export const router = Router();

// Root & health check
router.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'astra-backend' });
});

router.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Auth & Member routes
router.post('/auth/login', loginStub);
router.get('/auth/me', authMiddleware, getAuthMeStub);
router.get('/members/me/id', authMiddleware, getMemberIdCardStub);
router.get('/verify/:token', verifyTokenStub);

// Points & Ledger routes
router.get('/points/me', authMiddleware, getPointsMe);
router.get(
  '/points/me/history',
  authMiddleware,
  getPointsHistoryHandler
);
router.get(
  '/members/search',
  authMiddleware,
  requireRole('officer'),
  searchMembersHandler
);
router.get('/members/me/overview', authMiddleware, getMemberOverviewHandler);
router.post(
  '/points/grant',
  authMiddleware,
  requireRole('officer'),
  grantPointsHandler
);

// Events routes
router.get('/events', authMiddleware, getEvents);
router.get(
  '/events/:id/roster',
  authMiddleware,
  requireRole('officer'),
  getEventRosterHandler
);
router.post(
  '/events/:id/checkin',
  authMiddleware,
  requireRole('officer'),
  checkInEvent
);

// Perks & Vouchers routes
router.get('/perks', authMiddleware, getPerks);
router.post('/perks/:id/redeem', authMiddleware, redeemPerkHandler);
router.get('/vouchers/me', authMiddleware, getVouchersMe);
router.get('/vouchers/:id', authMiddleware, getVoucherById);

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
