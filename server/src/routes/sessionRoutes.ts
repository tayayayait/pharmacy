import { Router } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import prisma from '../prisma/client';
import { authMiddleware } from '../middlewares/auth';
import { ApiError } from '../middlewares/errorHandler';
import { analyzeNRFT, Scores } from '../services/nrftService';
import { env } from '../config/env';
import { decryptString } from '../utils/crypto';
import { SurveyChannel } from '@prisma/client';
import { createAutoFollowUp } from '../services/followUpTemplateService';

const router = Router();

const createSessionSchema = z.object({
  patientId: z.string().cuid(),
  templateId: z.string().cuid(),
  expiresAt: z.string().datetime().optional(),
  channel: z.enum(['WEB', 'EMAIL', 'SMS']).optional(),
  deliveryAddress: z.string().optional(),
});

const answerSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string().cuid(),
      optionIds: z.array(z.string().cuid()).min(1),
    })
  ),
});

router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const body = createSessionSchema.parse(req.body);
    if (!req.user) {
      throw new ApiError(401, 'Unauthorized');
    }

    const patient = await prisma.patient.findUnique({
      where: { id: body.patientId },
    });
    if (!patient || patient.pharmacyId !== req.user.pharmacyId) {
      throw new ApiError(404, 'Patient not found');
    }

    const template = await prisma.surveyTemplate.findUnique({ where: { id: body.templateId } });
    if (!template || !template.isActive) {
      throw new ApiError(404, 'Survey template not found');
    }

    const expiresAt = body.expiresAt
      ? new Date(body.expiresAt)
      : new Date(Date.now() + 24 * 60 * 60 * 1000);

    const token = crypto.randomBytes(12).toString('hex');
    const channel: SurveyChannel = (body.channel as SurveyChannel) ?? 'WEB';

    if (channel !== 'WEB' && !body.deliveryAddress) {
      throw new ApiError(400, 'deliveryAddress is required for EMAIL/SMS channels');
    }

    const session = await prisma.surveySession.create({
      data: {
        token,
        expiresAt,
        templateId: template.id,
        patientId: patient.id,
        pharmacyId: req.user.pharmacyId,
        channel,
        deliveryAddress: body.deliveryAddress ?? null,
      },
    });

    // 멀티채널 발송: 실제 외부 연동 대신 로깅/응답만 수행
    if (channel !== 'WEB') {
      console.log(`Dispatch survey via ${channel} to ${body.deliveryAddress ?? 'unknown'}. Token: ${token}`);
    }

    res.status(201).json({
      token: session.token,
      expiresAt: session.expiresAt,
      surveyUrl: `${env.surveyUrl}/survey/${session.token}`,
      channel: session.channel,
      deliveryAddress: session.deliveryAddress,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:token', async (req, res, next) => {
  try {
    const session = await prisma.surveySession.findUnique({
      where: { token: req.params.token },
      include: {
        template: {
          include: {
            questions: {
              include: { options: true },
            },
          },
        },
        patient: true,
      },
    });

    if (!session) {
      throw new ApiError(404, 'Session not found');
    }

    const isExpired = session.expiresAt < new Date();
    if (isExpired && session.status === 'PENDING') {
      await prisma.surveySession.update({
        where: { id: session.id },
        data: { status: 'EXPIRED' },
      });
    }

    res.json({
      token: session.token,
      status: session.status,
      expiresAt: session.expiresAt,
      templateId: session.templateId,
      patientId: session.patientId,
      channel: session.channel,
      deliveryAddress: session.deliveryAddress,
      template: {
        id: session.template.id,
        name: session.template.name,
        description: session.template.description,
        type: session.template.type,
        questions: session.template.questions.map((question) => ({
          id: question.id,
          category: question.category,
          text: question.text,
          order: question.order,
          type: question.type,
          options: question.options.map((option) => ({
            id: option.id,
            text: option.text,
            order: option.order,
            impact: option.impactJson ?? {},
          })),
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:token/answers', async (req, res, next) => {
  try {
    const payload = answerSchema.parse(req.body);
    const session = await prisma.surveySession.findUnique({
      where: { token: req.params.token },
      include: {
        template: {
          include: {
            questions: {
              include: { options: true },
            },
          },
        },
        patient: true,
      },
    });

    if (!session) {
      throw new ApiError(404, 'Session not found');
    }

    if (session.status !== 'PENDING') {
      throw new ApiError(400, 'Survey already completed or expired');
    }

    if (session.expiresAt < new Date()) {
      await prisma.surveySession.update({
        where: { id: session.id },
        data: { status: 'EXPIRED' },
      });
      throw new ApiError(410, 'Session expired');
    }

    const answerRecords = payload.answers.map((answer) => ({
      sessionId: session.id,
      questionId: answer.questionId,
      optionIds: answer.optionIds,
    }));

    await prisma.answer.createMany({ data: answerRecords });

    const selectedOptionIds = Array.from(
      new Set(payload.answers.flatMap((answer) => answer.optionIds))
    );

    const impacts: Record<string, Partial<Scores>> = {};
    session.template.questions.forEach((question) => {
      question.options.forEach((option) => {
        impacts[option.id] = (option.impactJson ?? {}) as Partial<Scores>;
      });
    });

    const analysis = analyzeNRFT(selectedOptionIds, impacts);

    const assessment = await prisma.assessment.create({
      data: {
        pharmacyId: session.pharmacyId,
        patientId: session.patientId,
        sessionId: session.id,
        selectedOptionIds,
        healthType: analysis.healthType,
        scoresJson: analysis.scores,
        clustersJson: analysis.clusters,
        recommendationsJson: analysis.recommendations,
      },
    });

    // 자동 F/U 생성
    await createAutoFollowUp(assessment.id, analysis.healthType);

    await prisma.surveySession.update({
      where: { id: session.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    const patientName = session.patient
      ? decryptString(session.patient.encryptedName)
      : '환자';

    const pharmacists = await prisma.pharmacist.findMany({
      where: {
        pharmacyId: session.pharmacyId,
        isActive: true,
      },
      select: { id: true },
    });

    if (pharmacists.length) {
      const message = `${patientName}님의 설문이 접수되었습니다. 상담을 진행해 주세요.`;
      await prisma.notification.createMany({
        data: pharmacists.map((pharmacist) => ({
          pharmacistId: pharmacist.id,
          type: 'SURVEY_COMPLETED',
          message,
        })),
      });
    }

    res.status(201).json({
      assessmentId: assessment.id,
      healthType: analysis.healthType,
      scores: analysis.scores,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
