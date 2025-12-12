import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { loggingMiddleware } from './middlewares/logging';
import { errorHandler } from './middlewares/errorHandler';
import authRoutes from './routes/authRoutes';
import patientRoutes from './routes/patientRoutes';
import surveyRoutes from './routes/surveyRoutes';
import sessionRoutes from './routes/sessionRoutes';
import assessmentRoutes from './routes/assessmentRoutes';
import followUpRoutes from './routes/followUpRoutes';
import notificationRoutes from './routes/notificationRoutes';
import { auditLogger } from './middlewares/auditLogger';
import { env } from './config/env';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.frontendOrigin,
    credentials: true,
  })
);
app.use(express.json());
app.use(loggingMiddleware);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1', auditLogger);
app.use('/api/v1/patients', patientRoutes);
app.use('/api/v1/survey-templates', surveyRoutes);
app.use('/api/v1/survey-sessions', sessionRoutes);
app.use('/api/v1/assessments', assessmentRoutes);
app.use('/api/v1/follow-ups', followUpRoutes);
app.use('/api/v1/notifications', notificationRoutes);

app.use(errorHandler);

export default app;
