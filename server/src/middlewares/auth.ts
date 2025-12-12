import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { PrismaClient, Role } from '@prisma/client';
import { ApiError } from './errorHandler';

const prisma = new PrismaClient();

export interface AuthUser {
  id: string;
  pharmacyId: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const authMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new ApiError(401, 'Unauthorized'));
  }

  const token = authHeader.slice('Bearer '.length);
  try {
    const payload = jwt.verify(token, env.jwtSecret) as {
      sub: string;
      pharmacyId: string;
      role: Role;
    };

    // 사용자가 여전히 활성화되어 있는지 확인
    const pharmacist = await prisma.pharmacist.findUnique({
      where: { id: payload.sub },
      select: { id: true, isActive: true, pharmacyId: true, role: true },
    });

    if (!pharmacist || !pharmacist.isActive) {
      throw new ApiError(401, 'User is inactive or not found');
    }

    req.user = {
      id: pharmacist.id,
      pharmacyId: pharmacist.pharmacyId,
      role: pharmacist.role,
    };

    next();
  } catch (error) {
    next(new ApiError(401, 'Invalid or expired token'));
  }
};

export const requireRoles =
  (roles: Role[]) => (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(403, 'Insufficient role'));
    }
    next();
  };

// 유지 호환: 기존 ADMIN 외에 SYSTEM_ADMIN도 허용
export const requireAdmin = requireRoles([Role.ADMIN, Role.SYSTEM_ADMIN]);

export const requireSamePharmacy = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  // 이후 핸들러에서 req.user.pharmacyId와 리소스의 pharmacyId를 비교하도록 사용
  if (!req.user) {
    return next(new ApiError(401, 'Unauthorized'));
  }
  next();
};
