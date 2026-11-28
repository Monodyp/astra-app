import { Request, Response, NextFunction } from 'express';

// Minimal global error handler for unexpected errors and NotImplementedError
export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  console.error(`[errorHandler] ${req.method} ${req.originalUrl} (${statusCode}):`, err);

  res.status(statusCode).json({
    error: message,
  });
}
