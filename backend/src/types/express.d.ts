import type { AuthenticatedUser } from '../middleware/testUser.js';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};
