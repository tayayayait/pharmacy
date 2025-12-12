import type { NextFunction, Request, Response } from 'express';
import { Role } from '@prisma/client';
import prisma from '../prisma/client';

export const auditLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', async () => {

    try {
      await prisma.auditLog.create({
        data: {
          userId: req.user?.id ?? null,
          pharmacyId: req.user?.pharmacyId ?? null,
          role: (req.user?.role ?? null) as Role | null,
          method: req.method,
          path: req.originalUrl,
          status: res.statusCode,
          duration: Date.now() - start,
          metadata: {
            query: req.query,
            ip: req.ip,
            bodyPresent: Boolean(req.body && Object.keys(req.body).length),
          },
        },
      });
    } catch (error) {
      console.error('Failed to persist audit log', error);
    }
  });
  next();
};
