import { Router } from 'express';
import prisma from '../prisma/client';
import { authMiddleware } from '../middlewares/auth';

const router = Router();
router.use(authMiddleware);

const formatOption = (option: { id: string; text: string; impactJson: unknown; order: number }) => ({
  id: option.id,
  text: option.text,
  impact: option.impactJson ?? {},
  matrixImpact: (option as any).matrixImpactJson ?? {},
  order: option.order,
});

const formatTemplate = (template: {
  id: string;
  name: string;
  description: string | null;
  type: string;
  version: number;
  baseTemplateId?: string | null;
  questions: {
    id: string;
    category: string;
    type: string;
    text: string;
    order: number;
    logicJson?: unknown;
    options: { id: string; text: string; impactJson: unknown; matrixImpactJson: unknown; order: number }[];
  }[];
}) => ({
  id: template.id,
  name: template.name,
  description: template.description,
  type: template.type,
  version: template.version,
  baseTemplateId: template.baseTemplateId,
  questions: template.questions
    .sort((a, b) => a.order - b.order)
    .map((question) => ({
      id: question.id,
      category: question.category,
      type: question.type,
      text: question.text,
      order: question.order,
      logic: question.logicJson ?? null,
      options: question.options
        .sort((a, b) => a.order - b.order)
        .map(formatOption),
    })),
});

router.get('/', async (_req, res, next) => {
  try {
    const templates = await prisma.surveyTemplate.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          include: {
            options: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    res.json(templates.map(formatTemplate));
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const template = await prisma.surveyTemplate.findUnique({
      where: { id: req.params.id },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          include: {
            options: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    res.json(formatTemplate(template));
  } catch (error) {
    next(error);
  }
});

export default router;
