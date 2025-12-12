import type {
  AuthResponse,
  AuthUser,
  AssessmentDetail,
  Notification,
  PatientTimelineItem,
  FollowUp,
  SurveyTemplateSummary,
  SurveySessionCreationResponse,
} from '../types';
import {
  mockLogin,
  mockFetchCurrentUser,
  mockFetchAssessments,
  mockPatchAssessmentStatus,
  mockFetchPatients,
  mockCreatePatient,
  mockFetchAssessmentDetail,
  mockRequestAIScript,
  mockFetchNotifications,
  mockMarkNotificationRead,
  mockDownloadAssessmentReport,
  mockCreateFollowUp,
  mockUpdateFollowUp,
  mockFetchSurveyTemplates,
  mockCreateSurveySession,
} from './mockApi';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:4000/api/v1';
const AUTH_TOKEN_KEY = 'pharmacy_nrft_auth_token';
const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true';

const parseResponse = async (response: Response) => {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const buildError = async (response: Response) => {
  const parsed = await parseResponse(response);
  if (parsed && typeof parsed === 'object' && 'message' in parsed) {
    return (parsed as { message?: string }).message ?? response.statusText;
  }
  return response.statusText;
};

const request = async (path: string, options: RequestInit = {}) => {
  if (USE_MOCK_API) {
    throw new Error('Network request not available in mock mode');
  }

  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    const message = await buildError(response);
    throw new Error(message);
  }

  return parseResponse(response);
};

const toIsoString = (value: unknown) => {
  if (!value) return undefined;
  const date = new Date(value as string);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

const mapFollowUp = (payload: any) => ({
  id: payload.id,
  nextVisitDate: toIsoString(payload.nextVisitDate) ?? payload.nextVisitDate,
  status: payload.status,
  checklist: payload.checklist ?? payload.checklistJson ?? [],
  createdAt: toIsoString(payload.createdAt) ?? payload.createdAt,
});

export const login = async (payload: { email: string; password: string }): Promise<AuthResponse> => {
  if (USE_MOCK_API) {
    return mockLogin(payload);
  }

  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await buildError(response);
    throw new Error(message);
  }

  return (await parseResponse(response)) as AuthResponse;
};

export const setAuthToken = (token: string | null) => {
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
};

export const getAuthToken = () => localStorage.getItem(AUTH_TOKEN_KEY);

export const fetchCurrentUser = (): Promise<AuthUser> => {
  if (USE_MOCK_API) {
    return mockFetchCurrentUser();
  }
  return request('/auth/me');
};

export const fetchAssessments = (): Promise<any[]> => {
  if (USE_MOCK_API) {
    return mockFetchAssessments();
  }
  return request('/assessments');
};

export const patchAssessmentStatus = (
  id: string,
  status: 'PENDING' | 'COMPLETED'
): Promise<any> => {
  if (USE_MOCK_API) {
    return mockPatchAssessmentStatus(id, status);
  }
  return request(`/assessments/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
};

export const fetchPatients = (query?: string): Promise<any[]> => {
  if (USE_MOCK_API) {
    return mockFetchPatients(query);
  }
  return request(`/patients${query ? `?q=${encodeURIComponent(query)}` : ''}`);
};

export const fetchSurveyTemplates = (): Promise<SurveyTemplateSummary[]> => {
  if (USE_MOCK_API) {
    return mockFetchSurveyTemplates();
  }
  return request('/survey-templates');
};

export const fetchPatient = (id: string): Promise<any> => {
  if (USE_MOCK_API) {
    return Promise.resolve({ id, displayName: '데모 환자', phone: '01000000000' });
  }
  return request(`/patients/${id}`);
};

export const fetchPatientTimeline = (id: string): Promise<PatientTimelineItem[]> => {
  if (USE_MOCK_API) {
    // 데모 모드에선 평가/후속 조치의 더미 데이터가 없으므로 빈 배열 반환
    return Promise.resolve([]);
  }
  return request(`/patients/${id}/timeline`);
};

export const createPatient = (payload: {
  name: string;
  phone: string;
  gender?: 'male' | 'female' | 'other';
  birthYear?: number;
  displayName?: string;
  tags?: string[];
  note?: string;
}) => {
  if (USE_MOCK_API) {
    return mockCreatePatient(payload);
  }
  return request('/patients', { method: 'POST', body: JSON.stringify(payload) });
};

export const updatePatient = (id: string, payload: Partial<{ displayName: string; gender: 'male' | 'female' | 'other'; birthYear: number; tags: string[]; note: string }>) => {
  if (USE_MOCK_API) {
    return Promise.resolve({ id, ...payload });
  }
  return request(`/patients/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
};

export const createSurveySession = (
  payload: {
    patientId: string;
    templateId: string;
    channel?: 'WEB' | 'EMAIL' | 'SMS';
    deliveryAddress?: string;
  }
): Promise<SurveySessionCreationResponse> => {
  if (USE_MOCK_API) {
    return mockCreateSurveySession(payload);
  }
  return request('/survey-sessions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const fetchAssessmentDetail = (id: string): Promise<AssessmentDetail> => {
  if (USE_MOCK_API) {
    return mockFetchAssessmentDetail(id);
  }
  return request(`/assessments/${id}`);
};

export const requestAIScript = (
  id: string
): Promise<{ aiScript: string; assessment?: AssessmentDetail }> => {
  if (USE_MOCK_API) {
    return mockRequestAIScript(id);
  }
  return request(`/assessments/${id}/ai-script`, { method: 'POST' });
};

export const fetchNotifications = (): Promise<Notification[]> => {
  if (USE_MOCK_API) {
    return mockFetchNotifications();
  }
  return request('/notifications');
};

export const markNotificationRead = (id: string): Promise<Notification> => {
  if (USE_MOCK_API) {
    return mockMarkNotificationRead(id);
  }
  return request(`/notifications/${id}/read`, { method: 'PATCH' });
};

export const downloadAssessmentReport = async (
  id: string,
  options?: { type?: 'patient' | 'pharmacist' }
): Promise<Blob> => {
  if (USE_MOCK_API) {
    return mockDownloadAssessmentReport(id);
  }

  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const headers: Record<string, string> = {
    Accept: 'application/pdf',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const query = options?.type ? `?type=${options.type}` : '';
  const response = await fetch(`${API_BASE}/assessments/${id}/report.pdf${query}`, {
    headers,
    credentials: 'include',
  });
  if (!response.ok) {
    const message = await buildError(response);
    throw new Error(message);
  }

  return response.blob();
};

export const createFollowUp = (
  assessmentId: string,
  payload: { nextVisitDate: string; checklist?: string[]; status?: 'SCHEDULED' | 'DONE' | 'CANCELLED' }
): Promise<FollowUp> => {
  if (USE_MOCK_API) {
    return mockCreateFollowUp(assessmentId, payload);
  }
  return request(`/follow-ups/${assessmentId}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then(mapFollowUp);
};

export const updateFollowUp = (
  id: string,
  payload: { nextVisitDate?: string; checklist?: string[]; status?: 'SCHEDULED' | 'DONE' | 'CANCELLED'; assignee?: string }
): Promise<FollowUp> => {
  if (USE_MOCK_API) {
    return mockUpdateFollowUp(id, payload);
  }
  return request(`/follow-ups/items/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }).then(mapFollowUp);
};

export const sendFollowUpReminder = (
  id: string,
  payload: { channel?: 'SMS' | 'EMAIL' | 'CALL'; note?: string }
): Promise<{ channel: string; message: string; queuedAt: string }> => {
  if (USE_MOCK_API) {
    return Promise.resolve({
      channel: payload.channel ?? 'SMS',
      message: payload.note ?? '데모 리마인더',
      queuedAt: new Date().toISOString(),
    });
  }
  return request(`/follow-ups/items/${id}/remind`, {
    method: 'POST',
    body: JSON.stringify(payload ?? {}),
  });
};
