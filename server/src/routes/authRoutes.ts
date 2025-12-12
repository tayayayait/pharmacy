import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { env } from '../config/env';
import { ApiError } from '../middlewares/errorHandler';
import { authMiddleware } from '../middlewares/auth';
import prisma from '../prisma/client';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const pharmacist = await prisma.pharmacist.findUnique({
      where: { email },
      include: { pharmacy: true },
    });

    if (!pharmacist || !pharmacist.isActive) {
      throw new ApiError(401, 'Invalid credentials');
    }

    const passwordMatch = await bcrypt.compare(password, pharmacist.passwordHash);
    if (!passwordMatch) {
      throw new ApiError(401, 'Invalid credentials');
    }

    const token = jwt.sign(
      {
        sub: pharmacist.id,
        pharmacyId: pharmacist.pharmacyId,
        role: pharmacist.role,
      },
      env.jwtSecret,
      { expiresIn: '12h' }
    );

    const cookieOptions = {
      httpOnly: true,
      secure: env.nodeEnv === 'production',
      sameSite: 'lax' as const,
      maxAge: 1000 * 60 * 60 * 12,
    };
    res.cookie('nrft_token', token, cookieOptions);

    return res.json({
      token,
      user: {
        id: pharmacist.id,
        email: pharmacist.email,
        name: pharmacist.name,
        role: pharmacist.role,
        pharmacy: {
          id: pharmacist.pharmacy.id,
          name: pharmacist.pharmacy.name,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Unauthorized');
    }

    const pharmacist = await prisma.pharmacist.findUnique({
      where: { id: req.user.id },
      include: { pharmacy: true },
    });

    if (!pharmacist) {
      throw new ApiError(404, 'User not found');
    }

    return res.json({
      id: pharmacist.id,
      email: pharmacist.email,
      name: pharmacist.name,
      role: pharmacist.role,
      pharmacy: {
        id: pharmacist.pharmacy.id,
        name: pharmacist.pharmacy.name,
      },
    });
  } catch (error) {
    next(error);
  }
});

// 간단한 초기용 시드 엔드포인트 (개발 환경에서만 사용)
router.post('/seed-dev', async (req, res, next) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      throw new ApiError(403, 'Not allowed in production');
    }

    const existing = await prisma.pharmacist.findFirst();
    if (existing) {
      return res.json({ message: 'Seed already executed', pharmacistId: existing.id });
    }

    const pharmacy = await prisma.pharmacy.create({
      data: {
        name: 'Demo Pharmacy',
        address: '서울시 어디구 어디로 123',
        phone: '010-0000-0000',
      },
    });

    const passwordHash = await bcrypt.hash('demo1234', 10);

    const pharmacist = await prisma.pharmacist.create({
      data: {
        email: 'pharmacist@example.com',
        passwordHash,
        name: '데모 약사',
        role: Role.PHARMACIST,
        pharmacyId: pharmacy.id,
      },
    });

    return res.json({
      message: 'Seed created',
      loginEmail: pharmacist.email,
      loginPassword: 'demo1234',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
