import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error('[Error]', err.message);

  if (err instanceof Prisma.PrismaClientInitializationError) {
    return res.status(503).json({
      error: 'Database unavailable. Start PostgreSQL and run `npm run prisma:push`.',
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return res.status(500).json({ error: `Database error (${err.code})` });
  }

  return res.status(500).json({ error: 'Internal server error' });
}
