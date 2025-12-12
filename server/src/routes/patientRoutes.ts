import { Router } from 'express';
import { z } from 'zod';
import prisma from '../prisma/client';
import { authMiddleware } from '../middlewares/auth';
import { encryptString, decryptString } from '../utils/crypto';
import { ApiError } from '../middlewares/errorHandler';

const router = Router();
router.use(authMiddleware);

const createPatientSchema = z.object({
  name: z.string().min(2),
  displayName: z.string().min(2).optional(),
  phone: z.string().min(4),
  gender: z.enum(['male', 'female', 'other']).optional(),
  birthYear: z.number().int().min(1900).max(new Date().getFullYear()).optional(),
  tags: z.array(z.string()).optional(),
  note: z.string().optional(),
});

const listQuerySchema = z.object({
  q: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
});

const formatPatient = (patient: {
  id: string;
  encryptedName: string;
  encryptedPhone: string;
  displayName: string | null;
  phoneLast4: string | null;
  gender: string | null;
  birthYear: number | null;
  tags: any;
  note: string | null;
  createdAt: Date;
}) => ({
  id: patient.id,
  name: decryptString(patient.encryptedName),
  displayName: patient.displayName,
  phone: decryptString(patient.encryptedPhone),
  phoneLast4: patient.phoneLast4,
  gender: patient.gender,
  birthYear: patient.birthYear,
  tags: patient.tags ?? [],
  note: patient.note,
  createdAt: patient.createdAt,
});

router.post('/', async (req, res, next) => {
  try {
    const body = createPatientSchema.parse(req.body);
    if (!req.user) {
      throw new ApiError(401, 'Unauthorized');
    }

    const patient = await prisma.patient.create({
      data: {
        encryptedName: encryptString(body.name),
        encryptedPhone: encryptString(body.phone),
        displayName: body.displayName ?? body.name,
        phoneLast4: body.phone.slice(-4),
        gender: body.gender ?? null,
        birthYear: body.birthYear ?? null,
        tags: body.tags ?? [],
        note: body.note ?? null,
        pharmacyId: req.user.pharmacyId,
      },
    });

    res.status(201).json(formatPatient(patient));
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const query = listQuerySchema.parse(req.query);
    if (!req.user) {
      throw new ApiError(401, 'Unauthorized');
    }

    const where: Record<string, unknown> = {
      pharmacyId: req.user.pharmacyId,
      gender: query.gender ?? undefined,
    };
    if (query.q) {
      where.OR = [
        { displayName: { contains: query.q, mode: 'insensitive' } },
        { phoneLast4: { contains: query.q } },
      ];
    }

    const patients = await prisma.patient.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json(patients.map(formatPatient));
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Unauthorized');
    }

    const patient = await prisma.patient.findUnique({
      where: { id: req.params.id },
    });

    if (!patient || patient.pharmacyId !== req.user.pharmacyId) {
      throw new ApiError(404, 'Patient not found');
    }

    res.json(formatPatient(patient));
  } catch (error) {
    next(error);
  }
});

const updatePatientSchema = z.object({
  displayName: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  birthYear: z.number().int().min(1900).max(new Date().getFullYear()).optional(),
  tags: z.array(z.string()).optional(),
  note: z.string().optional(),
});

router.patch('/:id', async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Unauthorized');
    }
    const body = updatePatientSchema.parse(req.body);
    const patient = await prisma.patient.findUnique({ where: { id: req.params.id } });
    if (!patient || patient.pharmacyId !== req.user.pharmacyId) {
      throw new ApiError(404, 'Patient not found');
    }

    const updated = await prisma.patient.update({
      where: { id: patient.id },
      data: {
        displayName: body.displayName ?? patient.displayName,
        gender: body.gender ?? patient.gender,
        birthYear: body.birthYear ?? patient.birthYear,
        tags: body.tags ?? patient.tags,
        note: body.note ?? patient.note,
      },
    });

    res.json(formatPatient(updated));
  } catch (error) {
    next(error);
  }
});

// 환자 타임라인: 설문/평가/FU 이력 통합
router.get('/:id/timeline', async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Unauthorized');
    }

    const patient = await prisma.patient.findUnique({
      where: { id: req.params.id },
    });

    if (!patient || patient.pharmacyId !== req.user.pharmacyId) {
      throw new ApiError(404, 'Patient not found');
    }

    const assessments = await prisma.assessment.findMany({
      where: { patientId: patient.id },
      include: {
        followUps: true,
        session: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const events = assessments.flatMap((assessment) => {
      const base = {
        assessmentId: assessment.id,
        createdAt: assessment.createdAt,
        healthType: assessment.healthType,
        sessionToken: assessment.session?.token ?? null,
        status: assessment.status,
      };

      const assessmentEvent = {
        type: 'ASSESSMENT' as const,
        ...base,
      };

      const followUpEvents =
        assessment.followUps?.map((followUp) => ({
          type: 'FOLLOW_UP' as const,
          assessmentId: assessment.id,
          followUpId: followUp.id,
          createdAt: followUp.createdAt,
          nextVisitDate: followUp.nextVisitDate,
          status: followUp.status,
          checklist: followUp.checklistJson ?? [],
        })) ?? [];

      return [assessmentEvent, ...followUpEvents];
    });

    // 최신순 정렬
    events.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json(events);
  } catch (error) {
    next(error);
  }
});

export default router;
