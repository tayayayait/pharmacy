import { Router } from 'express';
import { z } from 'zod';
import prisma from '../prisma/client';
import { authMiddleware } from '../middlewares/auth';
import { ApiError } from '../middlewares/errorHandler';

const router = Router();
router.use(authMiddleware);

const createSchema = z.object({
  nextVisitDate: z.string().datetime(),
  checklist: z.array(z.string()).optional(),
  status: z.enum(['SCHEDULED', 'DONE', 'CANCELLED']).optional(),
  assignee: z.string().optional(),
});

const updateSchema = z.object({
  nextVisitDate: z.string().datetime().optional(),
  checklist: z.array(z.string()).optional(),
  status: z.enum(['SCHEDULED', 'DONE', 'CANCELLED']).optional(),
  assignee: z.string().optional(),
});

const reminderSchema = z.object({
  channel: z.enum(['SMS', 'EMAIL', 'CALL']).default('SMS'),
  note: z.string().max(500).optional(),
});

router.post('/:assessmentId', async (req, res, next) => {
  try {
    const body = createSchema.parse(req.body);
    if (!req.user) {
      throw new ApiError(401, 'Unauthorized');
    }

    const assessment = await prisma.assessment.findUnique({
      where: { id: req.params.assessmentId },
    });

    if (!assessment || assessment.pharmacyId !== req.user.pharmacyId) {
      throw new ApiError(404, 'Assessment not found');
    }

    const followUp = await prisma.followUp.create({
      data: {
        assessmentId: assessment.id,
        nextVisitDate: new Date(body.nextVisitDate),
        checklistJson: body.checklist ?? null,
        status: body.status ?? 'SCHEDULED',
        assignee: body.assignee ?? null,
      },
    });

    res.status(201).json(followUp);
  } catch (error) {
    next(error);
  }
});

router.get('/:assessmentId', async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Unauthorized');
    }

    const assessment = await prisma.assessment.findUnique({
      where: { id: req.params.assessmentId },
    });

    if (!assessment || assessment.pharmacyId !== req.user.pharmacyId) {
      throw new ApiError(404, 'Assessment not found');
    }

    const followUps = await prisma.followUp.findMany({
      where: { assessmentId: assessment.id },
      orderBy: { nextVisitDate: 'asc' },
    });

    res.json(followUps);
  } catch (error) {
    next(error);
  }
});

router.patch('/items/:id', async (req, res, next) => {
  try {
    const body = updateSchema.parse(req.body);
    if (!req.user) {
      throw new ApiError(401, 'Unauthorized');
    }

    const followUp = await prisma.followUp.findUnique({
      where: { id: req.params.id },
      include: { assessment: true },
    });

    if (!followUp || followUp.assessment.pharmacyId !== req.user.pharmacyId) {
      throw new ApiError(404, 'Follow-up not found');
    }

    const updateData: Record<string, unknown> = {};
    if (body.nextVisitDate) {
      updateData.nextVisitDate = new Date(body.nextVisitDate);
    }
    if (body.checklist) {
      updateData.checklistJson = body.checklist;
    }
    if (body.status) {
      updateData.status = body.status;
    }
    if (body.assignee !== undefined) {
      updateData.assignee = body.assignee;
    }

    const updated = await prisma.followUp.update({
      where: { id: followUp.id },
      data: updateData,
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.post('/items/:id/remind', async (req, res, next) => {
  try {
    const body = reminderSchema.parse(req.body);
    if (!req.user) {
      throw new ApiError(401, 'Unauthorized');
    }

    const followUp = await prisma.followUp.findUnique({
      where: { id: req.params.id },
      include: {
        assessment: {
          include: {
            patient: true,
          },
        },
      },
    });

    if (!followUp || followUp.assessment.pharmacyId !== req.user.pharmacyId) {
      throw new ApiError(404, 'Follow-up not found');
    }

    const patient = followUp.assessment.patient;
    const patientLabel = patient?.displayName ?? `환자(${followUp.assessment.patientId})`;

    const channelLabel =
      body.channel === 'SMS' ? '문자' : body.channel === 'EMAIL' ? '이메일' : '전화';
    const composedMessage = [
      `[F/U 리마인더:${channelLabel}] ${patientLabel}`,
      body.note?.trim(),
    ]
      .filter(Boolean)
      .join(' - ');

    const notification = await prisma.notification.create({
      data: {
        pharmacistId: req.user.id,
        type: `FOLLOW_UP_REMINDER_${body.channel}`,
        message: composedMessage,
      },
    });

    res.json({
      notificationId: notification.id,
      channel: body.channel,
      message: composedMessage,
      queuedAt: notification.createdAt,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
