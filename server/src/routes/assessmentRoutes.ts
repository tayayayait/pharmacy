import { Router } from 'express';
import { z } from 'zod';
import prismaClient from '../prisma/client';
import { authMiddleware } from '../middlewares/auth';
import { decryptString } from '../utils/crypto';
import { ApiError } from '../middlewares/errorHandler';
import { generateConsultationScript } from '../services/geminiService';
import { streamAssessmentReport } from '../services/reportService';
import { buildHtmlReport } from '../services/reportTemplate';

const router = Router();
router.use(authMiddleware);

const statusSchema = z.object({
  status: z.enum(['PENDING', 'COMPLETED']),
});

const deriveAgeGroup = (birthYear?: number | null) => {
  if (!birthYear) return '정보 없음';
  const age = new Date().getFullYear() - birthYear;
  if (age < 20) return '10대';
  if (age < 30) return '20대';
  if (age < 40) return '30대';
  if (age < 50) return '40대';
  if (age < 60) return '50대';
  return '60대 이상';
};

const formatPatient = (patient: any) => ({
  id: patient.id,
  nickname: patient.displayName ?? decryptString(patient.encryptedName),
  ageGroup: deriveAgeGroup(patient.birthYear),
  gender: (patient.gender ?? 'other') as 'male' | 'female' | 'other',
  phoneLast4: patient.phoneLast4 ?? '0000',
});

const formatAssessment = (assessment: any) => ({
  id: assessment.id,
  pharmacyId: assessment.pharmacyId,
  status: assessment.status,
  healthType: assessment.healthType,
  scores: assessment.scoresJson,
  clusters: assessment.clustersJson,
  recommendations: assessment.recommendationsJson,
  aiScript: assessment.aiScript,
  selectedOptionIds: assessment.selectedOptionIds,
  createdAt: assessment.createdAt,
  updatedAt: assessment.updatedAt,
  session: assessment.session
    ? {
        id: assessment.session.id,
        token: assessment.session.token,
        status: assessment.session.status,
        channel: (assessment.session as any).channel,
        deliveryAddress: (assessment.session as any).deliveryAddress,
        createdAt: assessment.session.createdAt,
        completedAt: assessment.session.completedAt,
      }
    : null,
  followUps: assessment.followUps?.map((followUp: any) => ({
    id: followUp.id,
    nextVisitDate: followUp.nextVisitDate,
    status: followUp.status,
    checklist: followUp.checklistJson,
  })) ?? [],
  patient: assessment.patient ? formatPatient(assessment.patient) : null,
});

router.get('/', async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Unauthorized');
    }

    const statusQuery =
      typeof req.query.status === 'string' ? req.query.status.toUpperCase() : undefined;
    const where: any = {
      pharmacyId: req.user.pharmacyId,
    };
    if (statusQuery) {
      where.status = statusQuery;
    }

    const assessments = await prismaClient.assessment.findMany({
      where,
      include: {
        patient: true,
        session: true,
        followUps: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json(assessments.map(formatAssessment));
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Unauthorized');
    }

    const assessment = await prismaClient.assessment.findUnique({
      where: { id: req.params.id },
      include: {
        patient: true,
        session: true,
        followUps: {
          orderBy: { nextVisitDate: 'asc' },
        },
      },
    });

    if (!assessment || assessment.pharmacyId !== req.user.pharmacyId) {
      throw new ApiError(404, 'Assessment not found');
    }

    res.json(formatAssessment(assessment));
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/status', async (req, res, next) => {
  try {
    const { status } = statusSchema.parse(req.body);
    if (!req.user) {
      throw new ApiError(401, 'Unauthorized');
    }

    const assessment = await prismaClient.assessment.findUnique({
      where: { id: req.params.id },
    });

    if (!assessment || assessment.pharmacyId !== req.user.pharmacyId) {
      throw new ApiError(404, 'Assessment not found');
    }

    const updated = await prismaClient.assessment.update({
      where: { id: assessment.id },
      data: { status },
      include: {
        patient: true,
        session: true,
        followUps: {
          orderBy: { nextVisitDate: 'asc' },
        },
      },
    });

    res.json(formatAssessment(updated));
  } catch (error) {
    next(error);
  }
});

router.post('/:id/ai-script', async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Unauthorized');
    }

    const assessment = await prismaClient.assessment.findUnique({
      where: { id: req.params.id },
      include: {
        patient: true,
        session: true,
      },
    });

    if (!assessment || assessment.pharmacyId !== req.user.pharmacyId) {
      throw new ApiError(404, 'Assessment not found');
    }

    const patient = assessment.patient;
    if (!patient) {
      throw new ApiError(400, 'Patient data missing');
    }

    const context = {
      patientName: patient.displayName ?? decryptString(patient.encryptedName),
      ageGroup: deriveAgeGroup(patient.birthYear),
      gender: (patient.gender ?? 'other') as 'male' | 'female' | 'other',
      scores: assessment.scoresJson,
      healthType: assessment.healthType,
    };

    const script = await generateConsultationScript(context);

    const updated = await prismaClient.assessment.update({
      where: { id: assessment.id },
      data: { aiScript: script },
      include: {
        patient: true,
        session: true,
        followUps: { orderBy: { nextVisitDate: 'asc' } },
      },
    });

    res.json({ aiScript: script, assessment: formatAssessment(updated) });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/report.pdf', async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Unauthorized');
    }

    const assessment = await prismaClient.assessment.findUnique({
      where: { id: req.params.id },
      include: {
        patient: true,
        session: true,
        followUps: { orderBy: { nextVisitDate: 'asc' } },
        pharmacy: true,
      },
    });

    if (!assessment || assessment.pharmacyId !== req.user.pharmacyId) {
      throw new ApiError(404, 'Assessment not found');
    }

    const patient = assessment.patient;
    const patientName = patient ? decryptString(patient.encryptedName) : '환자';

    const payload = {
      assessmentId: assessment.id,
      patientName,
      healthType: assessment.healthType,
      scores: assessment.scoresJson as Record<string, number>,
      recommendations: (assessment.recommendationsJson ?? undefined) as Record<string, string> | undefined,
      createdAt: assessment.createdAt.toISOString(),
      pharmacyName: assessment.pharmacy?.name ?? '정보 없음',
      sessionToken: assessment.session?.token,
      followUps: assessment.followUps.map((item) => ({
        nextVisitDate: item.nextVisitDate.toISOString(),
        status: item.status,
        checklist: item.checklistJson as string[] | undefined,
      })),
      brandColor: assessment.pharmacy?.brandColor,
      brandLogoUrl: assessment.pharmacy?.brandLogoUrl,
      brandTagline: assessment.pharmacy?.brandTagline,
    };

    const reportType =
      typeof req.query.type === 'string' && req.query.type === 'patient'
        ? 'patient'
        : 'pharmacist';

    streamAssessmentReport(res, { ...payload, reportType });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/report.html', async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Unauthorized');
    }

    const assessment = await prismaClient.assessment.findUnique({
      where: { id: req.params.id },
      include: {
        patient: true,
        session: true,
        followUps: { orderBy: { nextVisitDate: 'asc' } },
        pharmacy: true,
      },
    });

    if (!assessment || assessment.pharmacyId !== req.user.pharmacyId) {
      throw new ApiError(404, 'Assessment not found');
    }

    const reportType =
      typeof req.query.type === 'string' && req.query.type === 'patient'
        ? 'patient'
        : 'pharmacist';

    const patient = assessment.patient;
    const patientName = patient ? decryptString(patient.encryptedName) : '환자';

    const html = buildHtmlReport(
      {
        patientName,
        pharmacyName: assessment.pharmacy?.name ?? 'NRFT Pharmacy',
        createdAt: assessment.createdAt.toISOString(),
        healthType: assessment.healthType,
        scores: assessment.scoresJson as Record<string, number>,
        recommendations: (assessment.recommendationsJson ?? undefined) as Record<string, string> | undefined,
        followUps: assessment.followUps.map((item) => ({
          nextVisitDate: item.nextVisitDate.toISOString(),
          status: item.status,
          checklist: item.checklistJson as string[] | undefined,
        })),
        sessionToken: assessment.session?.token ?? undefined,
        brandColor: assessment.pharmacy?.brandColor,
        brandLogoUrl: assessment.pharmacy?.brandLogoUrl,
        brandTagline: assessment.pharmacy?.brandTagline,
      },
      reportType
    );

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    next(error);
  }
});

export default router;
