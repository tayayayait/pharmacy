import type { Scores } from '../types';
import { SURVEY_QUESTIONS } from '../constants';
import { calculateScores, determineHealthType } from './analysisService';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:4000/api/v1';
const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true';

export interface SurveySessionPayload {
  token: string;
  status: 'PENDING' | 'COMPLETED' | 'EXPIRED';
  expiresAt: string;
  patientId: string;
  channel?: 'WEB' | 'EMAIL' | 'SMS';
  deliveryAddress?: string | null;
  template: {
    id: string;
    name: string;
    description: string;
    type: string;
    questions: {
      id: string;
      category: string;
      text: string;
      order: number;
      type: 'SINGLE' | 'MULTIPLE';
      options: {
        id: string;
        text: string;
        order: number;
        impact: Partial<Scores>;
      }[];
    }[];
  };
}

export interface SurveyAnswerPayload {
  questionId: string;
  optionIds: string[];
}

export interface SurveySubmissionResult {
  assessmentId: string;
  healthType: string;
  scores: Scores;
}

const parseJsonResponse = async (response: Response) => {
  const text = await response.text();
  if (!text) return null;
  return JSON.parse(text);
};

const buildHeaders = () => ({
  'Content-Type': 'application/json',
  Accept: 'application/json',
});

const buildMockSurveySession = (token: string): SurveySessionPayload => {
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60).toISOString();

  return {
    token,
    status: 'PENDING',
    expiresAt,
    patientId: 'mock-patient',
    channel: 'WEB',
    deliveryAddress: null,
    template: {
      id: 'template-mock',
      name: 'NRFT 데모 설문',
      description: '백엔드 없이 실행되는 NRFT 기본 문진입니다.',
      type: 'INITIAL',
      questions: SURVEY_QUESTIONS.map((question, index) => ({
        id: question.id,
        category: question.category,
        text: question.text,
        order: index + 1,
        type: question.type === 'single' ? 'SINGLE' : 'MULTIPLE',
        options: question.options.map((option, optionIndex) => ({
          id: option.id,
          text: option.text,
          order: optionIndex + 1,
          impact: option.impact,
        })),
      })),
    },
  };
};

export const fetchSurveySession = async (token: string): Promise<SurveySessionPayload> => {
  if (USE_MOCK_API) {
    return buildMockSurveySession(token);
  }

  const response = await fetch(`${API_BASE}/survey-sessions/${token}`, {
    headers: buildHeaders(),
  });

  if (!response.ok) {
    const payload = await parseJsonResponse(response);
    throw new Error(payload?.message ?? '설문 데이터 로드에 실패했습니다.');
  }

  return (await parseJsonResponse(response)) as SurveySessionPayload;
};

export const submitSurveyAnswers = async (
  token: string,
  answers: SurveyAnswerPayload[]
 ): Promise<SurveySubmissionResult> => {
  if (USE_MOCK_API) {
    const selectedOptionIds = answers.flatMap((answer) => answer.optionIds);
    const scores = calculateScores(selectedOptionIds);
    const healthType = determineHealthType(scores);

    return {
      assessmentId: `mock-assessment-${token}`,
      healthType,
      scores,
    };
  }

  const response = await fetch(`${API_BASE}/survey-sessions/${token}/answers`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ answers }),
  });

  if (!response.ok) {
    const payload = await parseJsonResponse(response);
    throw new Error(payload?.message ?? '설문 제출에 실패했습니다.');
  }

  return (await parseJsonResponse(response)) as SurveySubmissionResult;
};
