export type AssessmentStatus = 'pending' | 'completed';

export interface PatientInfo {
  id?: string;
  nickname: string;
  ageGroup: string;
  gender: 'male' | 'female' | 'other';
  phoneLast4: string;
}

export type Axis = 'Sleep' | 'Digestion' | 'Energy' | 'Stress' | 'Immunity';

export interface Scores {
  Sleep: number;
  Digestion: number;
  Energy: number;
  Stress: number;
  Immunity: number;
}

export interface QuestionOption {
  id: string;
  text: string;
  impact: Partial<Scores>; // Negative values to deduct score
}

export interface Question {
  id: string;
  category: Axis | 'Lifestyle';
  text: string;
  type: 'single' | 'multiple';
  options: QuestionOption[];
}

export interface Assessment {
  id: string;
  pharmacyId: string;
  patient?: PatientInfo;
  selectedOptionIds: string[];
  scores: Scores;
  healthType: string;
  clusters?: Record<string, number>;
  recommendations?: {
    lifestyle: string;
    product: string;
    message: string;
  };
  createdAt: string; // ISO String
  status: AssessmentStatus;
  aiConsultationNote?: string;
}

export interface AssessmentSession {
  id: string;
  token: string;
  status: 'PENDING' | 'COMPLETED' | 'EXPIRED';
  channel?: 'WEB' | 'EMAIL' | 'SMS';
  deliveryAddress?: string | null;
  createdAt: string;
  completedAt?: string | null;
}

export interface FollowUp {
  id: string;
  nextVisitDate: string;
  status: 'SCHEDULED' | 'DONE' | 'CANCELLED';
  checklist?: string[];
  createdAt?: string;
}

export interface AssessmentDetail extends Assessment {
  session: AssessmentSession | null;
  followUps: FollowUp[];
}

export type PatientTimelineItem =
  | {
      type: 'ASSESSMENT';
      assessmentId: string;
      createdAt: string;
      healthType: string;
      sessionToken: string | null;
      status: 'PENDING' | 'COMPLETED';
    }
  | {
      type: 'FOLLOW_UP';
      assessmentId: string;
      followUpId: string;
      createdAt: string;
      nextVisitDate: string;
      status: 'SCHEDULED' | 'DONE' | 'CANCELLED';
      checklist: string[];
    };

export interface Notification {
  id: string;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface HealthTypeDefinition {
  name: string;
  description: string;
  color: string;
  triggerAxis: Axis; // The axis that usually triggers this type if lowest
}

export interface PharmacyInfo {
  id: string;
  name: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'PHARMACIST' | 'ADMIN' | 'PHARMACY_ADMIN' | 'SYSTEM_ADMIN';
  pharmacy: PharmacyInfo;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface SurveyTemplateSummary {
  id: string;
  name: string;
  description?: string | null;
  type: string;
}

export interface SurveySessionCreationResponse {
  token: string;
  surveyUrl: string;
  expiresAt: string;
  channel: 'WEB' | 'EMAIL' | 'SMS';
  deliveryAddress?: string | null;
}
