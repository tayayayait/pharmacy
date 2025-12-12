import type {
  AssessmentDetail,
  AuthResponse,
  AuthUser,
  Notification,
  PharmacyInfo,
  FollowUp,
} from '../types';
import { INITIAL_SCORES } from '../constants';

const demoPharmacy: PharmacyInfo = {
  id: 'demo-pharmacy',
  name: 'NRFT 데모 약국',
};

const pharmacistUser: AuthUser = {
  id: 'pharmacist-1',
  email: 'pharmacist@example.com',
  name: '데모 약사',
  role: 'PHARMACIST',
  pharmacy: demoPharmacy,
};

let currentUser: AuthUser = pharmacistUser;

const nowIso = () => new Date().toISOString();

const mockAssessments: AssessmentDetail[] = [
  {
    id: 'assessment-1',
    pharmacyId: demoPharmacy.id,
    patient: {
      nickname: '김NRFT',
      ageGroup: '30대',
      gender: 'female',
      phoneLast4: '1234',
    },
    selectedOptionIds: [],
    scores: {
      ...INITIAL_SCORES,
      Energy: 65,
      Sleep: 70,
    },
    healthType: '에너지 고갈형 (Burnout Fire)',
    clusters: {
      피로도: 80,
      스트레스: 75,
    },
    recommendations: {
      lifestyle: '취침 전 휴대폰 사용을 줄이고, 7시간 이상의 수면을 확보하세요.',
      product: '마그네슘 + 비타민B 복합제',
      message: '3주 정도 관리 후 다시 체크해보시면 좋습니다.',
    },
    createdAt: nowIso(),
    status: 'pending',
    aiConsultationNote: '',
    session: {
      id: 'session-1',
      token: 'demo-nrft-session',
      status: 'PENDING',
      channel: 'WEB',
      deliveryAddress: null,
      createdAt: nowIso(),
      completedAt: null,
    },
    followUps: [],
  },
];

const mockFollowUps: FollowUp[] = [];

type MockPatient = {
  id: string;
  displayName: string;
  phoneLast4: string;
  gender?: 'male' | 'female' | 'other';
  birthYear?: number;
};

const mockPatients: MockPatient[] = [
  {
    id: 'patient-1',
    displayName: '김NRFT',
    phoneLast4: '1234',
    gender: 'female',
    birthYear: 1990,
  },
  {
    id: 'patient-2',
    displayName: '이데모',
    phoneLast4: '5678',
    gender: 'male',
    birthYear: 1985,
  },
];

let notifications: Notification[] = [
  {
    id: 'notification-1',
    type: 'ASSESSMENT_CREATED',
    message: '새로운 NRFT 설문 결과가 도착했습니다.',
    isRead: false,
    createdAt: nowIso(),
  },
  {
    id: 'notification-2',
    type: 'FOLLOW_UP',
    message: '오늘 상담 예약된 환자가 있습니다.',
    isRead: false,
    createdAt: nowIso(),
  },
];

export const mockLogin = async (payload: {
  email: string;
  password: string;
}): Promise<AuthResponse> => {
  currentUser = { ...pharmacistUser, email: payload.email.trim().toLowerCase() };

  return {
    token: 'mock-pharmacist-token',
    user: currentUser,
  };
};

export const mockFetchCurrentUser = async (): Promise<AuthUser> => {
  return currentUser;
};

export const mockFetchAssessments = async (): Promise<any[]> => {
  return mockAssessments.map((assessment) => ({ ...assessment }));
};

export const mockPatchAssessmentStatus = async (
  id: string,
  status: 'PENDING' | 'COMPLETED'
): Promise<any> => {
  const normalized = status.toLowerCase() === 'completed' ? 'completed' : 'pending';
  const target = mockAssessments.find((assessment) => assessment.id === id);
  if (!target) {
    throw new Error('해당 설문을 찾을 수 없습니다.');
  }
  target.status = normalized;
  return { ...target };
};

export const mockFetchPatients = async (_query?: string): Promise<any[]> => {
  return mockPatients.map((patient) => ({ ...patient }));
};

export const mockCreatePatient = async (payload: {
  name: string;
  phone: string;
  gender?: 'male' | 'female' | 'other';
  birthYear?: number;
  displayName?: string;
}) => {
  const id = `patient-${mockPatients.length + 1}`;
  const phoneLast4 = payload.phone.slice(-4) || '0000';
  const record: MockPatient = {
    id,
    displayName: payload.displayName || payload.name,
    phoneLast4,
    gender: payload.gender,
    birthYear: payload.birthYear,
  };
  mockPatients.push(record);
  return { ...record };
};

const mockSurveyTemplates = [
  {
    id: 'template-demo',
    name: 'NRFT 건강 문진',
    description: '데모 환자를 위한 기본 NRFT 설문 템플릿입니다.',
    type: 'INITIAL',
  },
];

export const mockFetchSurveyTemplates = async (): Promise<any[]> => {
  return mockSurveyTemplates.map((template) => ({ ...template }));
};

export const mockCreateSurveySession = async (payload: {
  patientId: string;
  templateId: string;
  channel?: 'WEB' | 'EMAIL' | 'SMS';
  deliveryAddress?: string;
}): Promise<any> => {
  const token = `demo-session-${Date.now()}`;
  return {
    token,
    surveyUrl: `http://localhost:5173/#/survey/${token}`,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
    channel: payload.channel ?? 'WEB',
    deliveryAddress: payload.deliveryAddress ?? null,
  };
};

export const mockFetchAssessmentDetail = async (
  id: string
): Promise<AssessmentDetail> => {
  const existing = mockAssessments.find((assessment) => assessment.id === id);
  if (existing) {
    return { ...existing };
  }

  const fallback: AssessmentDetail = {
    ...mockAssessments[0],
    id,
  };
  return fallback;
};

export const mockRequestAIScript = async (
  id: string
): Promise<{ aiScript: string; assessment?: AssessmentDetail }> => {
  const target = mockAssessments.find((assessment) => assessment.id === id);
  const script =
    '데모 환경에서는 실제 AI 호출 대신 미리 준비된 상담 스크립트를 표시합니다. 환자의 주요 불편 영역을 중심으로 수면·에너지·소화·면역을 단계적으로 관리하도록 안내해 주세요.';

  if (target) {
    target.aiConsultationNote = script;
    return {
      aiScript: script,
      assessment: { ...target },
    };
  }

  return { aiScript: script };
};

export const mockFetchNotifications = async (): Promise<Notification[]> => {
  return notifications.map((notification) => ({ ...notification }));
};

export const mockMarkNotificationRead = async (
  id: string
): Promise<Notification> => {
  const target = notifications.find((notification) => notification.id === id);
  if (!target) {
    throw new Error('알림을 찾을 수 없습니다.');
  }
  target.isRead = true;
  return { ...target };
};

export const mockDownloadAssessmentReport = async (_id: string): Promise<Blob> => {
  const content =
    '이 파일은 데모용 가짜 PDF 입니다. 실제 환경에서는 백엔드에서 생성된 NRFT 상담 리포트가 제공됩니다.';
  return new Blob([content], { type: 'application/pdf' });
};

export const mockCreateFollowUp = async (
  assessmentId: string,
  payload: { nextVisitDate: string; checklist?: string[]; status?: 'SCHEDULED' | 'DONE' | 'CANCELLED' }
): Promise<FollowUp> => {
  const followUp: FollowUp = {
    id: `fu-${mockFollowUps.length + 1}`,
    nextVisitDate: payload.nextVisitDate,
    status: payload.status ?? 'SCHEDULED',
    checklist: payload.checklist ?? [],
    createdAt: nowIso(),
  };
  mockFollowUps.push(followUp);
  const target = mockAssessments.find((a) => a.id === assessmentId);
  if (target) {
    target.followUps = [...(target.followUps ?? []), followUp];
  }
  return { ...followUp };
};

export const mockUpdateFollowUp = async (
  id: string,
  payload: { nextVisitDate?: string; checklist?: string[]; status?: 'SCHEDULED' | 'DONE' | 'CANCELLED' }
): Promise<FollowUp> => {
  const target = mockFollowUps.find((item) => item.id === id);
  if (!target) {
    throw new Error('Follow-up not found');
  }
  if (payload.nextVisitDate) target.nextVisitDate = payload.nextVisitDate;
  if (payload.checklist) target.checklist = payload.checklist;
  if (payload.status) target.status = payload.status;
  // assessment 내 followUps도 동기화
  mockAssessments.forEach((assessment) => {
    assessment.followUps = (assessment.followUps ?? []).map((fu) =>
      fu.id === id ? { ...fu, ...target } : fu
    );
  });
  return { ...target };
};
