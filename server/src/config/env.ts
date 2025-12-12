import dotenv from 'dotenv';

dotenv.config();

const getEnv = (key: string, fallback?: string): string => {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: getEnv('DATABASE_URL'),
  jwtSecret: getEnv('JWT_SECRET'),
  encryptionKey: getEnv('ENCRYPTION_KEY'),
  surveyUrl: process.env.SURVEY_APP_URL ?? 'http://localhost:5173',
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',
  geminiApiKey: process.env.GEMINI_API_KEY ?? '',
};
