import type { NextFunction, Request, Response } from 'express';

export function requireRole(role: string) {
  const requiredRole = role.trim().toLowerCase();

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const userRole = req.user.role.trim().toLowerCase();
    // Published role policy: admin may access every protected route.
    if (userRole !== requiredRole && userRole !== 'admin') {
      res.status(403).json({ error: `${role} role required` });
      return;
    }

    next();
  };
}
