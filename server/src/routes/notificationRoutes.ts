import { Router } from 'express';
import prisma from '../prisma/client';
import { authMiddleware } from '../middlewares/auth';
import { ApiError } from '../middlewares/errorHandler';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Unauthorized');
    }

    const notifications = await prisma.notification.findMany({
      where: { pharmacistId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json(notifications);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/read', async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Unauthorized');
    }

    const notification = await prisma.notification.findUnique({
      where: { id: req.params.id },
    });

    if (!notification || notification.pharmacistId !== req.user.id) {
      throw new ApiError(404, 'Notification not found');
    }

    const updated = await prisma.notification.update({
      where: { id: notification.id },
      data: { isRead: true },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

export default router;
