import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HashRouter, Routes, Route, useNavigate, useParams, Link, Navigate, useLocation } from 'react-router-dom';
import { Activity, ClipboardList, CheckCircle2, User, MessageSquare, Sparkles, Home, Bell, BarChart2, ChevronRight } from 'lucide-react';
import type {
  Assessment,
  AssessmentDetail,
  AssessmentStatus,
  Notification,
  SurveySessionCreationResponse,
} from './types';
import { HEALTH_TYPES } from './constants';
import RadarChartComponent from './components/RadarChartComponent';
import LoginPage from './pages/LoginPage';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ThemeProvider } from './components/ui/ThemeProvider';
import { useAssessments } from './hooks/useAssessments';
import {
  createPatient,
  fetchPatients,
  fetchAssessmentDetail,
  requestAIScript,
  fetchNotifications,
  markNotificationRead,
  downloadAssessmentReport,
  fetchPatientTimeline,
  createFollowUp,
  updateFollowUp,
  createSurveySession,
} from './services/apiClient';
import SurveyPage from './pages/SurveyPage';
import SurveyTokenLanding from './pages/SurveyTokenLanding';
import type { PatientTimelineItem } from './types';
import PatientsPage from './pages/PatientsPage';
import PatientDetailPage from './pages/PatientDetailPage';
import { useSurveyTemplates } from './hooks/useSurveyTemplates';
import SurveySessionModal from './components/SurveySessionModal';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:4000/api/v1';

// --- Helper for Translations ---
const CATEGORY_LABELS: Record<string, string> = {
  Sleep: '수면 건강',
  Digestion: '소화 기능',
  Energy: '활력/에너지',
  Stress: '스트레스',
  Immunity: '면역력',
  Lifestyle: '생활 습관'
};

// --- Shared Components ---

import UIButton from './components/ui/Button';
import UICard from './components/ui/Card';
import Modal from './components/ui/Modal';

const Button = UIButton;
const Card = UICard;

const Badge: React.FC<{ children: React.ReactNode; color?: 'teal' | 'gray' | 'red' }> = ({ children, color = 'gray' }) => {
    const colors = {
        teal: 'bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-600/20',
        gray: 'bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-500/10',
        red: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/10'
    };
    return (
        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${colors[color]}`}>
            {children}
        </span>
    )
}

// --- Pharmacist Flow Components ---

const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(async () => {
    setNotificationsLoading(true);
    setNotificationError(null);
    try {
      const list = await fetchNotifications();
      setNotifications(Array.isArray(list) ? list : []);
    } catch (error) {
      setNotificationError(
        error instanceof Error ? error.message : '알림을 불러오는 동안 오류가 발생했습니다.'
      );
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications]
  );

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (
        notificationsOpen &&
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [notificationsOpen]);

  const handleMarkNotification = useCallback(
    async (id: string) => {
      try {
        await markNotificationRead(id);
        await loadNotifications();
      } catch (error) {
        setNotificationError(
          error instanceof Error ? error.message : '알림 상태를 업데이트할 수 없습니다.'
        );
      }
    },
    [loadNotifications]
  );

  const handleMarkAllRead = useCallback(async () => {
    const pending = notifications.filter((notification) => !notification.isRead);
    if (!pending.length) {
      return;
    }

    try {
      await Promise.all(pending.map((notification) => markNotificationRead(notification.id)));
      await loadNotifications();
    } catch (error) {
      setNotificationError(
        error instanceof Error ? error.message : '알림 상태를 업데이트할 수 없습니다.'
      );
    }
  }, [notifications, loadNotifications]);

  const toggleNotifications = () => setNotificationsOpen((prev) => !prev);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      <aside className="w-full md:w-72 bg-white border-r border-slate-200 md:h-screen sticky top-0 z-20 flex flex-col shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3 font-bold text-xl text-teal-800">
            <div className="bg-teal-100 p-2 rounded-lg">
              <Activity size={24} className="text-teal-600" />
            </div>
            <span>NRFT 헬스케어</span>
          </div>
        </div>
        <nav className="p-4 space-y-2 flex-1">
          <Link
            to="/pharmacist"
            className="flex items-center gap-3 px-4 py-3.5 text-slate-700 font-medium hover:bg-teal-50 hover:text-teal-800 rounded-xl transition-all"
          >
            <ClipboardList size={20} /> 대기 환자 목록
          </Link>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('pharmacy:open-patient-modal'))}
            className="w-full flex items-center gap-3 px-4 py-3.5 text-slate-700 font-medium hover:bg-teal-50 hover:text-teal-800 rounded-xl transition-all text-left"
          >
            <User size={20} /> 신규 환자 등록
          </button>
          <Link
            to="/patients"
            className="flex items-center gap-3 px-4 py-3.5 text-slate-700 font-medium hover:bg-teal-50 hover:text-teal-800 rounded-xl transition-all"
          >
            <User size={20} /> 환자 목록/메모
          </Link>
        </nav>
        <div className="p-4 border-t border-slate-100">
          <Link
            to="/"
            className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition-colors text-sm font-medium"
          >
            <Home size={18} /> 메인 화면으로
          </Link>
        </div>
        <div className="px-6 py-4 border-t border-slate-100">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs text-slate-400">로그인 사용자</p>
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{user?.name ?? '약사님'}</p>
                    <p className="text-xs text-slate-400">
                      {user?.pharmacy.name ?? '약국 정보 없음'}
                    </p>
                  </div>
                  <button
                    onClick={logout}
                    className="text-xs text-teal-600 hover:text-teal-800 font-semibold"
                  >
                    로그아웃
                  </button>
                </div>
              </div>
              <div className="relative" ref={notificationRef}>
                <button
                  type="button"
                  onClick={toggleNotifications}
                  className="relative inline-flex items-center justify-center rounded-full border border-slate-200 bg-white p-2 text-slate-500 hover:border-teal-200 hover:text-teal-700 transition"
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                      {unreadCount}
                    </span>
                  )}
                </button>
                {notificationsOpen && (
                  <div className="absolute right-0 top-full mt-3 w-72 max-h-72 overflow-y-auto rounded-2xl border border-slate-100 bg-white p-3 shadow-lg">
                    {notificationError && (
                      <p className="text-xs text-red-600">{notificationError}</p>
                    )}
                    {notificationsLoading ? (
                      <p className="text-xs text-slate-400">알림을 불러오는 중입니다.</p>
                    ) : notifications.length === 0 ? (
                      <p className="text-xs text-slate-400">새 알림이 없습니다.</p>
                    ) : (
                      <div className="space-y-2">
                        {notifications.map((notification) => (
                          <button
                            key={notification.id}
                            type="button"
                            onClick={() => handleMarkNotification(notification.id)}
                            className={`w-full rounded-xl px-3 py-2 text-left transition ${
                              notification.isRead
                                ? 'bg-slate-50 text-slate-600'
                                : 'bg-teal-50 text-teal-800'
                            }`}
                          >
                            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                              {notification.type}
                            </p>
                            <p className="text-sm font-medium">{notification.message}</p>
                            <p className="text-[11px] text-slate-400">
                              {new Date(notification.createdAt).toLocaleString()}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        disabled={notificationsLoading}
                        className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-teal-200 hover:text-teal-700 disabled:opacity-60"
                      >
                        전체 읽음 처리
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </aside>
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">{children}</main>
    </div>
  );
};
const PatientQueue: React.FC<{ assessments: Assessment[]; loading: boolean; refreshAssessments: () => void }> = ({
  assessments,
  loading,
  refreshAssessments,
}) => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<any[]>([]);
  const [patientFormVisible, setPatientFormVisible] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const { templates, loading: templatesLoading, error: templatesError } = useSurveyTemplates();
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [sessionModalInfo, setSessionModalInfo] = useState<SurveySessionCreationResponse | null>(null);
  const [sessionModalPatient, setSessionModalPatient] = useState('');
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [creatingSessionFor, setCreatingSessionFor] = useState<string | null>(null);

  useEffect(() => {
    if (templates.length > 0 && !selectedTemplateId) {
      setSelectedTemplateId(templates[0].id);
    }
  }, [templates, selectedTemplateId]);

  const normalizePhoneKey = useCallback((value?: string) => {
    if (!value) return '';
    const digits = value.replace(/\D/g, '');
    if (!digits) return '';
    return digits.slice(-4);
  }, []);

  const normalizedSearch = search.trim().toLowerCase();
  const sorted = useMemo(
    () => [...assessments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [assessments]
  );
  const handleStartSurvey = useCallback(
    async (patientId: string, patientName: string) => {
      if (!patientId) return;
      if (!selectedTemplateId) {
        setSessionError('설문 템플릿을 선택해주세요.');
        return;
      }
      setSessionError(null);
      setCreatingSessionFor(patientId);
      try {
        const session = await createSurveySession({
          patientId,
          templateId: selectedTemplateId,
          channel: 'WEB',
        });
        setSessionModalInfo(session);
        setSessionModalPatient(patientName);
      } catch (error) {
        setSessionError(error instanceof Error ? error.message : '문진 토큰 발급에 실패했습니다.');
      } finally {
        setCreatingSessionFor(null);
      }
    },
    [selectedTemplateId]
  );
  const assessmentPatientIds = useMemo(() => {
    const ids = assessments
      .map((assessment) => assessment.patient?.id)
      .filter((id): id is string => Boolean(id));
    return new Set(ids);
  }, [assessments]);
  const assessmentPatientPhoneKeys = useMemo(() => {
    const keys = new Set<string>();
    assessments.forEach((assessment) => {
      const fromPhone = normalizePhoneKey(assessment.patient?.phone);
      if (fromPhone) {
        keys.add(fromPhone);
      }
      const fromLast4 = normalizePhoneKey(assessment.patient?.phoneLast4);
      if (fromLast4) {
        keys.add(fromLast4);
      }
    });
    return keys;
  }, [assessments, normalizePhoneKey]);
  const pendingAssessmentCount = useMemo(
    () => assessments.filter((assessment) => assessment.status === 'pending').length,
    [assessments]
  );

  const filtered = useMemo(() => {
    const term = normalizedSearch;
    return sorted.filter((a) => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (!term) return true;
      const name = (a.patient?.nickname ?? '').toLowerCase();
      const phone = (a.patient?.phoneLast4 ?? '').toLowerCase();
      const health = (a.healthType ?? '').toLowerCase();
      return name.includes(term) || phone.includes(term) || health.includes(term);
    });
  }, [sorted, normalizedSearch, statusFilter]);

  const manualQueuePatients = useMemo(() => {
    if (statusFilter === 'completed') return [];
    const term = normalizedSearch;
    return patients.filter((patient) => {
      if (!patient?.id) return false;
      if (assessmentPatientIds.has(patient.id)) return false;
      const phoneKey = normalizePhoneKey(patient.phone ?? patient.phoneLast4);
      if (phoneKey && assessmentPatientPhoneKeys.has(phoneKey)) return false;
      if (!term) return true;
      const name = (patient.displayName ?? patient.name ?? '').toLowerCase();
      const phone = (patient.phone ?? patient.phoneLast4 ?? '').toLowerCase();
      return name.includes(term) || phone.includes(term);
    });
  }, [
    patients,
    assessmentPatientIds,
    assessmentPatientPhoneKeys,
    normalizedSearch,
    statusFilter,
    normalizePhoneKey,
  ]);
  const queueEntries = useMemo(() => {
    const assessmentEntries = filtered.map((assessment) => ({
      type: 'assessment' as const,
      assessment,
    }));
    const manualEntries = manualQueuePatients.map((patient) => ({
      type: 'manual' as const,
      patient,
    }));
    return [...assessmentEntries, ...manualEntries];
  }, [filtered, manualQueuePatients]);

  const refreshPatients = useCallback(async () => {
    try {
      const list = await fetchPatients();
      setPatients(list ?? []);
    } catch (error) {
      setStatusMessage('환자 목록을 불러오는 데 실패했습니다.');
    }
  }, []);

  useEffect(() => {
    refreshPatients();
  }, [refreshPatients]);

  const handlePatientCreated = () => {
    setStatusMessage('신규 환자가 등록되었습니다. 대기 환자 목록에서 확인할 수 있습니다.');
    refreshPatients();
    refreshAssessments();
  };

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const openPatientHandler = () => setPatientFormVisible(true);

    window.addEventListener('pharmacy:open-patient-modal', openPatientHandler);
    return () => {
      window.removeEventListener('pharmacy:open-patient-modal', openPatientHandler);
    };
  }, []);

  return (
    <>
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">대기 환자 목록</h1>
            <p className="text-slate-500 mt-1">접수된 디지털 문진표를 실시간으로 확인하세요.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => setPatientFormVisible(true)}>
              신규 환자 등록
            </Button>
          </div>
        </div>

        {patientFormVisible && (
          <PatientRegistrationPanel
            open={patientFormVisible}
            onClose={() => setPatientFormVisible(false)}
            onCreated={handlePatientCreated}
          />
        )}

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm">
            <span className="w-2 h-2 bg-teal-500 rounded-full animate-pulse"></span>
            <span className="text-sm font-bold text-slate-700">대기 중 {pendingAssessmentCount}명</span>
            {manualQueuePatients.length > 0 && (
              <span className="text-xs text-slate-400">
                등록만 {manualQueuePatients.length}명
              </span>
            )}
          </div>
          {statusMessage && (
            <p className="text-xs text-teal-600 bg-teal-50 border border-teal-100 px-3 py-1 rounded-full">{statusMessage}</p>
          )}
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-full border border-slate-200 shadow-sm">
            <label className="text-xs text-slate-500 font-semibold">상태</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'pending' | 'completed')}
              className="text-sm border border-slate-200 rounded-full px-3 py-1 focus:outline-none focus:border-teal-500"
            >
              <option value="all">전체</option>
              <option value="pending">대기</option>
              <option value="completed">완료</option>
            </select>
          </div>
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-full border border-slate-200 shadow-sm">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="이름/뒷자리/타입 검색"
              className="text-sm outline-none px-2 py-1"
            />
          </div>
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm">
            <label className="text-xs text-slate-500 font-semibold">템플릿</label>
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              disabled={templatesLoading || templates.length === 0}
              className="text-sm border border-slate-200 rounded-full px-3 py-1 focus:outline-none focus:border-teal-500"
            >
              <option value="" disabled>
                {templatesLoading ? '불러오는 중...' : '템플릿 선택'}
              </option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        {(templatesLoading || templatesError || sessionError || (!templatesLoading && !templates.length)) && (
          <div className="flex flex-col gap-1 pt-2">
            {templatesLoading && (
              <p className="text-xs text-slate-400">템플릿을 불러오는 중입니다.</p>
            )}
            {templatesError && (
              <p className="text-xs text-red-600">{templatesError}</p>
            )}
            {!templatesLoading && !templates.length && (
              <p className="text-xs text-red-600">사용 가능한 설문 템플릿이 없습니다.</p>
            )}
            {sessionError && (
              <p className="text-xs text-red-600">{sessionError}</p>
            )}
          </div>
        )}
      </div>
      <SurveySessionModal
        open={Boolean(sessionModalInfo)}
        info={sessionModalInfo}
        patientName={sessionModalPatient}
        onClose={() => {
          setSessionModalInfo(null);
          setSessionModalPatient('');
        }}
      />

      <div className="max-w-6xl mx-auto mt-4">
        {loading ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-slate-500">
            로딩 중... 잠시만 기다려주세요.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4">
              {queueEntries.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ClipboardList className="text-slate-300" size={32} />
                  </div>
                  <p className="text-slate-400 font-medium">아직 등록된 환자가 없습니다.</p>
                </div>
              ) : (
                queueEntries.map((entry) => {
                  if (entry.type === 'assessment') {
                    const assessment = entry.assessment;
                    const patientName = assessment.patient?.nickname ?? '환자';
                    const ageGroup = assessment.patient?.ageGroup ?? '정보 없음';
                    const gender = assessment.patient?.gender ?? 'other';
                    const genderLabel = gender === 'male' ? '남성' : gender === 'female' ? '여성' : '기타';
                    const phoneLast4 = assessment.patient?.phoneLast4 ?? '----';
                    const avatarLetter = patientName[0] ?? '환';

                    return (
                      <div
                        key={assessment.id}
                        className={`group bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-teal-300 transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-between gap-4 ${
                          assessment.status === 'completed' ? 'opacity-70 bg-slate-50' : ''
                        }`}
                        onClick={() => navigate(`/pharmacist/patient/${assessment.id}`)}
                      >
                        <div className="flex items-center gap-5 w-full sm:w-auto">
                          <div
                            className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl shadow-inner ${
                              assessment.status === 'completed'
                                ? 'bg-slate-200 text-slate-500'
                                : 'bg-gradient-to-br from-teal-400 to-teal-600 text-white'
                            }`}
                          >
                            {avatarLetter}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold text-lg text-slate-800">{patientName}</h3>
                              {assessment.status === 'pending' && <span className="w-2 h-2 bg-red-500 rounded-full"></span>}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                              <Badge>{ageGroup}</Badge>
                              <span className="text-slate-300">|</span>
                              <span>{genderLabel}</span>
                              <span className="text-slate-300">|</span>
                              <span className="font-mono tracking-wide">{phoneLast4}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-8 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-slate-100 pt-4 sm:pt-0">
                          <div className="text-right">
                            <span className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">Health Type</span>
                            <span className={`font-bold ${assessment.status === 'completed' ? 'text-slate-500' : 'text-teal-600'}`}>
                              {assessment.healthType.split('(')[0]}
                            </span>
                          </div>
                          <div className="text-right min-w-[80px]">
                            <span className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">접수 시간</span>
                            <span className="text-sm font-medium text-slate-700 font-mono">
                              {new Date(assessment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <ChevronRight className="text-slate-300 group-hover:text-teal-500 transition-colors" />
                        </div>
                      </div>
                    );
                  }

                  const patient = entry.patient;
                  const displayName = patient.displayName ?? patient.name ?? '환자';
                  const avatarLetter = displayName[0] ?? '환';
                  const phoneLabel = patient.phone ?? patient.phoneLast4 ?? '전화 정보 없음';
                  const genderLabel =
                    patient.gender === 'male'
                      ? '남성'
                      : patient.gender === 'female'
                        ? '여성'
                        : patient.gender === 'other'
                          ? '기타'
                          : '';
                  const ageGroup = patient.ageGroup ?? '';
                  const createdLabel = patient.createdAt
                    ? new Date(patient.createdAt).toLocaleString()
                    : '등록 정보 없음';

                  return (
                    <div
                      key={`manual-${patient.id ?? patient.name ?? displayName}`}
                      className="group bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-teal-300 transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-between gap-4"
                      onClick={() => patient.id && navigate(`/patients/${patient.id}`)}
                    >
                      <div className="flex items-center gap-5 w-full sm:w-auto">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl text-teal-600 bg-teal-50">
                          {avatarLetter}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-lg text-slate-800">{displayName}</h3>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                            {ageGroup && <Badge>{ageGroup}</Badge>}
                            {genderLabel && <span>{genderLabel}</span>}
                            {(ageGroup || genderLabel) && <span className="text-slate-300">|</span>}
                            <span className="font-mono tracking-wide">{phoneLabel}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-8 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-slate-100 pt-4 sm:pt-0">
                        <div className="text-right">
                          <span className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">상태</span>
                          <span className="text-sm font-bold text-teal-600">문진 미접수</span>
                        </div>
                        <div className="text-right min-w-[100px]">
                          <span className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">등록 시간</span>
                          <span className="text-sm font-medium text-slate-700 font-mono">
                            {createdLabel}
                          </span>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              if (patient.id) {
                                handleStartSurvey(patient.id, displayName);
                              }
                            }}
                            disabled={
                              !patient.id ||
                              templatesLoading ||
                              !selectedTemplateId ||
                              creatingSessionFor === patient.id
                            }
                            className="rounded-full border border-teal-200 px-4 py-1 text-xs font-semibold text-teal-600 hover:bg-teal-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {creatingSessionFor === patient.id ? '토큰 생성 중...' : '문진 시작'}
                          </button>
                        </div>
                        <ChevronRight className="text-slate-300 group-hover:text-teal-500 transition-colors" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

    </>
  );
};

const PATIENT_FORM_INITIAL_STATE = {
  name: '',
  displayName: '',
  phone: '',
  gender: 'male',
  birthYear: '',
};

const PatientRegistrationForm: React.FC<{
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}> = ({ open, onClose, onCreated }) => {
  const [form, setForm] = useState(PATIENT_FORM_INITIAL_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(PATIENT_FORM_INITIAL_STATE);
      setError(null);
    }
  }, [open]);

  const handleChange = (field: keyof typeof form) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await createPatient({
        name: form.name,
        displayName: form.displayName || undefined,
        phone: form.phone,
        gender: form.gender as 'male' | 'female' | 'other',
        birthYear: form.birthYear ? Number(form.birthYear) : undefined,
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '환자 등록에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <div>
        <label className="text-xs font-semibold text-slate-500">이름</label>
        <input
          value={form.name}
          onChange={handleChange('name')}
          required
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-teal-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-500">표시 이름 (선택)</label>
        <input
          value={form.displayName}
          onChange={handleChange('displayName')}
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-teal-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-500">휴대폰 번호 (숫자만)</label>
        <input
          value={form.phone}
          onChange={handleChange('phone')}
          required
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-teal-500 focus:outline-none"
          maxLength={11}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-slate-500">성별</label>
          <select
            value={form.gender}
            onChange={handleChange('gender')}
            className="w-full rounded-2xl border border-slate-200 px-3 py-3 focus:border-teal-500 focus:outline-none"
          >
            <option value="male">남성</option>
            <option value="female">여성</option>
            <option value="other">기타</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">출생 연도</label>
          <input
            type="number"
            value={form.birthYear}
            onChange={handleChange('birthYear')}
            min={1900}
            max={new Date().getFullYear()}
            className="w-full rounded-2xl border border-slate-200 px-3 py-3 focus:border-teal-500 focus:outline-none"
          />
        </div>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 hover:border-slate-300"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 rounded-2xl bg-gradient-to-r from-teal-500 to-teal-600 py-3 text-sm font-bold text-white disabled:opacity-60"
        >
          {isSubmitting ? '저장 중...' : '환자 등록하기'}
        </button>
      </div>
    </form>
  );
};

const PatientRegistrationPanel: React.FC<{
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}> = ({ open, onClose, onCreated }) => {
  if (!open) return null;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-3 mb-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">신규 환자 등록</h3>
          <p className="text-xs text-slate-500">신규 등록 환자는 대기 환자 목록에서 문진 접수 여부와 관계없이 모두 연속적으로 확인할 수 있으며, 문진이 접수되면 상태가 자동으로 갱신됩니다.</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-slate-400 hover:text-slate-700"
          aria-label="패널 닫기"
        >
          닫기
        </button>
      </div>
      <PatientRegistrationForm open={open} onClose={onClose} onCreated={onCreated} />
    </div>
  );
};

const SESSION_STATUS_LABELS: Record<string, string> = {
  PENDING: '진행 중',
  COMPLETED: '완료됨',
  EXPIRED: '만료됨',
};

const FOLLOW_UP_STATUS_LABELS: Record<string, string> = {
  SCHEDULED: '예정',
  DONE: '완료',
  CANCELLED: '취소',
};

const PatientDetail: React.FC<{ 
  assessments: Assessment[]; 
  onUpdateStatus: (id: string, s: AssessmentStatus) => void;
  onUpdateNote: (id: string, note: string) => void;
}> = ({ assessments, onUpdateStatus, onUpdateNote }) => {
  const { id } = useParams();
  const assessment = assessments.find((a) => a.id === id);
  const [isGenerating, setIsGenerating] = useState(false);
  const [detail, setDetail] = useState<AssessmentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [reportPreview, setReportPreview] = useState<{
    open: boolean;
    type: 'patient' | 'pharmacist';
    html: string;
    loading: boolean;
    error: string | null;
  }>({
    open: false,
    type: 'patient',
    html: '',
    loading: false,
    error: null,
  });
  const [timeline, setTimeline] = useState<PatientTimelineItem[]>([]);
  const [timelineError, setTimelineError] = useState<string | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [newFollowUpDate, setNewFollowUpDate] = useState('');
  const [newChecklist, setNewChecklist] = useState('');
  const [followUpSubmitting, setFollowUpSubmitting] = useState(false);
  const [followUpError, setFollowUpError] = useState<string | null>(null);
  const [followUpUpdatingId, setFollowUpUpdatingId] = useState<string | null>(null);
  const previewFrameRef = useRef<HTMLIFrameElement | null>(null);
  const followUpSuggestions: Record<string, string[]> = {
    '에너지 고갈형 (Burnout Fire)': ['수면시간 기록', '카페인 섭취량 확인', '주 3회 20분 걷기'],
    '수면 부족형 (Restless Owl)': ['취침 전 블루라이트 차단', '수면일지 작성', '취침/기상 일정 고정'],
    '소화 민감형 (Sensitive Stomach)': ['식사일지 기록', '프로바이오틱스 복용 체크', '자극식 피하기'],
    '스트레스 과다형 (Tension Wire)': ['호흡/명상 1일 2회', '업무 휴식 타이머 설정', '카페인 제한'],
    '면역 저하형 (Delicate Shield)': ['비타민C/D 복용', '손 위생/마스크 체크', '수면 7시간 이상'],
  };

  const toLocalDateTimeInput = (date: Date) => {
    const tzoffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzoffset).toISOString().slice(0, 16);
  };

  useEffect(() => {
    if (!id) return;

    let canceled = false;
    const loadDetail = async () => {
      setDetailLoading(true);
      setDetailError(null);
      setDetail(null);
      try {
        const payload = await fetchAssessmentDetail(id);
        if (!canceled) {
          setDetail(payload);
        }
      } catch (error) {
        if (!canceled) {
          setDetailError(error instanceof Error ? error.message : '상세 정보를 불러오지 못했습니다.');
        }
      } finally {
        if (!canceled) {
          setDetailLoading(false);
        }
      }
    };

    loadDetail();

    return () => {
      canceled = true;
    };
  }, [id]);

  useEffect(() => {
    // 기본 F/U 제안: 7일 후
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    setNewFollowUpDate(toLocalDateTimeInput(nextWeek));
  }, []);

  const activeAssessment = detail ?? assessment;

  // 타임라인 로드
  useEffect(() => {
    const patientId = detail?.patient?.id || activeAssessment?.patient?.id;
    if (!patientId) return;

    let canceled = false;
    const loadTimeline = async () => {
      setTimelineLoading(true);
      setTimelineError(null);
      try {
        const items = await fetchPatientTimeline(patientId);
        if (!canceled) setTimeline(items);
      } catch (error) {
        if (!canceled) {
          setTimelineError(
            error instanceof Error ? error.message : '타임라인을 불러오지 못했습니다.'
          );
        }
      } finally {
        if (!canceled) setTimelineLoading(false);
      }
    };

    loadTimeline();
    return () => {
      canceled = true;
    };
  }, [detail, activeAssessment]);
  const session = detail?.session ?? null;
  const followUps = detail?.followUps ?? [];
  const matrixScores = (detail?.clusters ?? activeAssessment?.clusters) as Record<string, number> | undefined;

  const copySessionToken = () => {
    if (!session || typeof navigator === 'undefined') return;
    navigator.clipboard?.writeText(session.token);
  };

  if (detailLoading && !activeAssessment) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <p className="text-sm text-slate-500">환자 데이터를 불러오는 중입니다...</p>
      </div>
    );
  }

  if (!activeAssessment) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <p className="text-sm text-slate-500">환자 정보를 찾을 수 없습니다.</p>
      </div>
    );
  }

  const patient = activeAssessment.patient;
  const patientName = patient?.nickname ?? '환자';
  const patientAgeGroup = patient?.ageGroup ?? '정보 없음';
  const patientGender = patient?.gender ?? 'other';
  const patientPhoneLast4 = patient?.phoneLast4 ?? '----';
  const genderLabel = patientGender === 'male' ? '남성' : patientGender === 'female' ? '여성' : '기타';

  const handleGenerateAI = async () => {
    if (!id) return;
    setIsGenerating(true);
    setAiError(null);
    try {
      const response = await requestAIScript(id);
      const script = response.aiScript;
      onUpdateNote(id, script);
      setDetail((prev) => response.assessment ?? (prev ? { ...prev, aiConsultationNote: script } : prev));
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'AI 상담 스크립트 생성에 실패했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadReport = async (type: 'patient' | 'pharmacist') => {
    if (!activeAssessment?.id) return;
    setIsDownloading(true);
    setDownloadError(null);
    try {
      const blob = await downloadAssessmentReport(activeAssessment.id, { type });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `assessment-${activeAssessment.id}-${type}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : 'PDF 다운로드에 실패했습니다.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleOpenHtmlReport = async (type: 'patient' | 'pharmacist') => {
    if (!activeAssessment?.id) return;
    setReportPreview({
      open: true,
      type,
      html: '',
      loading: true,
      error: null,
    });
    try {
      const response = await fetch(
        `${API_BASE}/assessments/${activeAssessment.id}/report.html?type=${type}`,
        {
          credentials: 'include',
          headers: {
            Accept: 'text/html',
          },
        }
      );
      const html = await response.text();
      if (!response.ok) {
        throw new Error(html || response.statusText);
      }
      setReportPreview((prev) => ({ ...prev, html, loading: false }));
    } catch (error) {
      setReportPreview((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : '미리보기를 불러오지 못했습니다.',
      }));
    }
  };

  const handleCloseReportPreview = () => {
    setReportPreview((prev) => ({ ...prev, open: false }));
  };

  const handlePrintPreview = () => {
    const frame = previewFrameRef.current;
    if (frame?.contentWindow) {
      frame.contentWindow.focus();
      frame.contentWindow.print();
    }
  };

  const openReportInNewTab = (type: 'patient' | 'pharmacist') => {
    if (!activeAssessment?.id) return;
    const url = `${API_BASE}/assessments/${activeAssessment.id}/report.html?type=${type}`;
    window.open(url, '_blank', 'noopener');
  };

  const handleCreateFollowUp = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeAssessment?.id) return;
    if (!newFollowUpDate) {
      setFollowUpError('다음 방문 일시를 입력해주세요.');
      return;
    }

    setFollowUpSubmitting(true);
    setFollowUpError(null);
    try {
      const iso = new Date(newFollowUpDate).toISOString();
      const checklist = newChecklist
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

      const created = await createFollowUp(activeAssessment.id, {
        nextVisitDate: iso,
        checklist: checklist.length ? checklist : undefined,
      });

      setDetail((prev) =>
        prev ? { ...prev, followUps: [...prev.followUps, created] } : prev
      );
      setTimeline((prev) => {
        const nextItem: PatientTimelineItem = {
          type: 'FOLLOW_UP',
          assessmentId: activeAssessment.id,
          followUpId: created.id,
          createdAt: created.createdAt ?? created.nextVisitDate,
          nextVisitDate: created.nextVisitDate,
          status: created.status,
          checklist: created.checklist ?? [],
        };
        return [...prev, nextItem].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });

      setNewFollowUpDate('');
      setNewChecklist('');
    } catch (error) {
      setFollowUpError(
        error instanceof Error ? error.message : 'F/U 일정을 생성하지 못했습니다.'
      );
    } finally {
      setFollowUpSubmitting(false);
    }
  };

  const handleUpdateFollowUpStatus = async (
    followUpId: string,
    status: 'SCHEDULED' | 'DONE' | 'CANCELLED'
  ) => {
    setFollowUpUpdatingId(followUpId);
    setFollowUpError(null);
    try {
      const updated = await updateFollowUp(followUpId, { status });
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              followUps: prev.followUps.map((item) =>
                item.id === followUpId ? { ...item, ...updated } : item
              ),
            }
          : prev
      );
      setTimeline((prev) =>
        prev.map((item) =>
          item.type === 'FOLLOW_UP' && item.followUpId === followUpId
            ? { ...item, status: updated.status, checklist: updated.checklist ?? item.checklist }
            : item
        )
      );
    } catch (error) {
      setFollowUpError(
        error instanceof Error ? error.message : 'F/U 상태를 업데이트하지 못했습니다.'
      );
    } finally {
      setFollowUpUpdatingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {detailError && (
        <div className="rounded-2xl border border-red-100 bg-red-50/80 px-4 py-3 text-sm text-red-800">
          {detailError}
        </div>
      )}
      <header className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <Link to="/pharmacist" className="text-sm font-medium text-slate-500 hover:text-teal-600 flex items-center gap-1 mb-3 transition-colors">
            ← 목록으로 돌아가기
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-slate-900">{patientName} 님</h1>
            <Badge color="teal">{patientAgeGroup}</Badge>
            <Badge color="gray">{genderLabel}</Badge>
          </div>
          <p className="text-slate-500 mt-2 font-mono flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
            휴대폰 뒷자리: <strong className="text-slate-700">{patientPhoneLast4}</strong>
          </p>
        </div>
        <div className="flex gap-3">
          {activeAssessment.status === 'pending' ? (
            <Button onClick={() => onUpdateStatus(activeAssessment.id, 'completed')} className="shadow-lg shadow-teal-100">
              <CheckCircle2 size={18} /> 상담 완료 처리
            </Button>
          ) : (
            <div className="px-5 py-3 bg-green-50 text-green-700 rounded-xl font-bold flex items-center gap-2 border border-green-100">
              <CheckCircle2 size={20} /> 상담 완료됨
            </div>
          )}
        </div>
      </header>

      {session && (
        <Card className="p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800">설문 세션 정보</h3>
            <Badge color="teal">
              {SESSION_STATUS_LABELS[session.status] ?? session.status}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">토큰</span>
            <span className="text-sm font-mono text-slate-600 break-all">{session.token}</span>
            <button
              type="button"
              onClick={copySessionToken}
              className="text-[11px] font-semibold text-teal-600 hover:text-teal-800"
            >
              복사
            </button>
          </div>
          <p className="text-xs text-slate-400">
            생성일: {new Date(session.createdAt).toLocaleString()}
            {session.completedAt ? ` · 완료일: ${new Date(session.completedAt).toLocaleString()}` : ''}
          </p>
          {session.channel && (
            <p className="text-xs text-slate-400">
              발송 채널: {session.channel}
              {session.deliveryAddress ? ` · 대상: ${session.deliveryAddress}` : ''}
            </p>
          )}
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-8">
            <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2 text-lg">
              <div className="bg-teal-100 p-1.5 rounded-lg">
                <BarChart2 size={20} className="text-teal-600" /> 
              </div>
              NRFT 건강 분석
            </h3>
            <div className="flex flex-col md:flex-row items-center gap-10">
              <div className="flex-1 w-full aspect-square max-h-[350px]">
                <RadarChartComponent scores={activeAssessment.scores} />
              </div>
              <div className="w-full md:w-56 space-y-4 bg-slate-50 p-5 rounded-xl border border-slate-100">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">항목별 점수</h4>
                {(Object.entries(activeAssessment.scores) as [string, number][]).map(([key, val]) => (
                  <div key={key} className="flex justify-between items-center text-sm">
                    <span className="text-slate-600 font-medium">{CATEGORY_LABELS[key] || key}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 rounded-full overflow-hidden bg-slate-200">
                        <div 
                          className={`h-full ${val < 60 ? 'bg-red-400' : 'bg-teal-400'}`} 
                          style={{width: `${val}%`}}
                        ></div>
                      </div>
                      <span className={`font-bold w-6 text-right ${val < 60 ? 'text-red-500' : 'text-slate-700'}`}>{val}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card className="p-0 border-indigo-100 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-50 to-white p-6 border-b border-indigo-50 flex justify-between items-center">
              <h3 className="font-bold text-indigo-900 flex items-center gap-2 text-lg">
                <Sparkles size={20} className="text-indigo-600" /> AI 상담 가이드
              </h3>
              {!activeAssessment.aiConsultationNote && (
                <Button 
                  variant="secondary" 
                  onClick={handleGenerateAI} 
                  disabled={isGenerating}
                  className="text-xs py-2 px-4 h-auto bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                >
                  {isGenerating ? '분석 중...' : '스크립트 생성'}
                </Button>
              )}
            </div>
            <div className="p-6 min-h-[120px]">
              {activeAssessment.aiConsultationNote ? (
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-slate-700 leading-relaxed whitespace-pre-wrap font-medium">
                  {activeAssessment.aiConsultationNote}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <p className="text-slate-400 mb-2">아직 생성된 상담 스크립트가 없습니다.</p>
                  <p className="text-xs text-slate-400">환자의 설문 결과를 바탕으로 맞춤형 상담 대본을 생성해보세요.</p>
                </div>
              )}
              {aiError && <p className="text-xs text-red-600 mt-3">{aiError}</p>}
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">PDF 리포트</h3>
              <Badge color="gray">PDF</Badge>
            </div>
            <p className="text-sm text-slate-500">
              현재 상담 내용을 PDF로 저장/인쇄하여 환자 상담에 활용하세요.
            </p>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                onClick={() => handleDownloadReport('pharmacist')}
                disabled={isDownloading}
              >
                {isDownloading ? '다운로드 중...' : '약사용 PDF'}
              </Button>
              <Button
                variant="outline"
                onClick={() => handleDownloadReport('patient')}
                disabled={isDownloading}
              >
                {isDownloading ? '다운로드 중...' : '환자용 PDF'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleOpenHtmlReport('pharmacist')}
              >
                약사용 HTML
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleOpenHtmlReport('patient')}
              >
                환자용 HTML
              </Button>
            </div>
            {downloadError && <p className="text-xs text-red-600">{downloadError}</p>}
          </Card>
          <Modal
            open={reportPreview.open}
            onClose={handleCloseReportPreview}
            titleId="report-preview-title"
            className="max-w-4xl"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 id="report-preview-title" className="text-lg font-semibold text-slate-800">
                  {reportPreview.type === 'patient' ? '환자용 리포트 미리보기' : '약사용 리포트 미리보기'}
                </h3>
                <button
                  type="button"
                  className="text-xs text-slate-500 hover:text-slate-700"
                  onClick={handleCloseReportPreview}
                >
                  닫기
                </button>
              </div>
              {reportPreview.loading ? (
                <p className="text-sm text-slate-500">미리보기를 로딩 중입니다...</p>
              ) : reportPreview.error ? (
                <p className="text-sm text-red-600">{reportPreview.error}</p>
              ) : (
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <iframe
                    ref={previewFrameRef}
                    title="Report Preview"
                    srcDoc={reportPreview.html}
                    sandbox="allow-same-origin allow-scripts"
                    className="w-full min-h-[480px]"
                  />
                </div>
              )}
              <div className="flex flex-wrap gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => openReportInNewTab(reportPreview.type)}
                  disabled={reportPreview.loading}
                >
                  새 탭에서 열기
                </Button>
                <Button
                  variant="secondary"
                  onClick={handlePrintPreview}
                  disabled={reportPreview.loading || !reportPreview.html}
                >
                  인쇄하기
                </Button>
              </div>
            </div>
          </Modal>
        </div>

        <div className="space-y-6">
          <Card className="p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50 rounded-full -mr-10 -mt-10 opacity-50 pointer-events-none"></div>
            <h3 className="font-bold text-slate-800 mb-3 text-lg">건강 타입 진단</h3>
            <div className="text-xl font-extrabold text-teal-600 mb-3 break-keep leading-tight">
              {activeAssessment.healthType}
            </div>
            <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
              {HEALTH_TYPES.find(t => t.name === activeAssessment.healthType)?.description}
            </p>
          </Card>

          <Card className="p-6 space-y-4">
            <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2 text-lg">
              <MessageSquare size={20} className="text-slate-400" /> 맞춤 제안
            </h3>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">추천 생활요법</p>
              <p className="mt-1 text-slate-700">
                {activeAssessment.recommendations?.lifestyle ?? '해당 데이터가 준비 중입니다.'}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">추천 제품</p>
              <p className="mt-1 text-slate-700">{activeAssessment.recommendations?.product ?? '상담 중 안내됩니다.'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">부가 메시지</p>
              <p className="mt-1 text-slate-700">{activeAssessment.recommendations?.message ?? '추가 항목을 입력해 주세요.'}</p>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-lg">환자 타임라인</h3>
              <Badge color="gray">{timeline.length}건</Badge>
            </div>
            {timelineError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {timelineError}
              </p>
            )}
            {timelineLoading ? (
              <p className="text-xs text-slate-500">타임라인을 불러오는 중입니다...</p>
            ) : timeline.length === 0 ? (
              <p className="text-xs text-slate-500">등록된 타임라인 이력이 없습니다.</p>
            ) : (
              <ul className="space-y-3">
                {timeline.map((item) => {
                  if (item.type === 'ASSESSMENT') {
                    return (
                      <li key={`assessment-${item.assessmentId}`} className="flex items-center justify-between gap-3 border border-slate-100 rounded-xl px-4 py-3 bg-slate-50/60">
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-teal-700">설문/평가</span>
                          <span className="text-sm font-bold text-slate-800">{item.healthType}</span>
                          <span className="text-[11px] text-slate-500">
                            {new Date(item.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <Badge color="teal">{item.status === 'COMPLETED' ? '완료' : '대기'}</Badge>
                      </li>
                    );
                  }
                  return (
                    <li key={`followup-${item.followUpId}`} className="flex items-center justify-between gap-3 border border-slate-100 rounded-xl px-4 py-3 bg-white">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-slate-600">F/U 일정</span>
                        <span className="text-sm font-bold text-slate-800">
                          {new Date(item.nextVisitDate).toLocaleDateString()} {new Date(item.nextVisitDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {item.checklist?.length ? (
                          <span className="text-[11px] text-slate-500">{item.checklist.join(' · ')}</span>
                        ) : null}
                      </div>
                      <Badge color="gray">{item.status}</Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          {matrixScores && Object.keys(matrixScores).length > 0 && (
            <Card className="p-6 space-y-3">
              <h3 className="font-bold text-slate-800 text-lg">기능성 매트릭스</h3>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(matrixScores).map(([key, value]) => (
                  <div key={key} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">{key}</p>
                    <div className="flex items-center justify-between">
                      <div className="w-24 h-2 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className={`h-full ${value < 60 ? 'bg-red-400' : 'bg-teal-500'}`}
                          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-slate-800">{Math.round(value)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-lg">F/U 일정</h3>
              <Badge color="gray">{followUps.length}건</Badge>
            </div>
            <form className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end" onSubmit={handleCreateFollowUp}>
              <label className="text-xs font-semibold text-slate-600">
                다음 방문 일시
                <input
                  type="datetime-local"
                  value={newFollowUpDate}
                  onChange={(e) => setNewFollowUpDate(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 focus:border-teal-500 focus:outline-none"
                  required
                />
              </label>
          <label className="text-xs font-semibold text-slate-600">
            체크리스트(쉼표 구분)
            <input
              type="text"
              value={newChecklist}
              onChange={(e) => setNewChecklist(e.target.value)}
              placeholder="예: 혈압 측정, 수면 일지"
              className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 focus:border-teal-500 focus:outline-none"
            />
          </label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                const suggestion =
                  followUpSuggestions[activeAssessment.healthType] ??
                  ['생활요법 체크', '증상 기록'];
                setNewChecklist(suggestion.join(', '));
              }}
            >
              추천 체크리스트 적용
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                const nextWeek = new Date();
                nextWeek.setDate(nextWeek.getDate() + 7);
                setNewFollowUpDate(toLocalDateTimeInput(nextWeek));
              }}
            >
              다음 주로 설정
            </Button>
          </div>
          <Button type="submit" disabled={followUpSubmitting} className="md:w-auto w-full">
            {followUpSubmitting ? '등록 중...' : '새 F/U 등록'}
          </Button>
        </form>
            {followUpError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {followUpError}
              </p>
            )}
            {followUps.length === 0 ? (
              <p className="text-xs text-slate-500">등록된 추적 일정이 없습니다.</p>
            ) : (
              <ul className="space-y-3">
                {followUps.map((item) => (
                  <li key={item.id} className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-white p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {new Date(item.nextVisitDate).toLocaleDateString()} {new Date(item.nextVisitDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-xs text-slate-400">
                        {FOLLOW_UP_STATUS_LABELS[item.status] ?? item.status}
                      </p>
                      {item.checklist?.length ? (
                        <p className="text-xs text-slate-400 mt-1">
                          {item.checklist.join(' · ')}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={item.status}
                        onChange={(e) =>
                          handleUpdateFollowUpStatus(
                            item.id,
                            e.target.value as 'SCHEDULED' | 'DONE' | 'CANCELLED'
                          )
                        }
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                        disabled={followUpUpdatingId === item.id}
                      >
                        <option value="SCHEDULED">예정</option>
                        <option value="DONE">완료</option>
                        <option value="CANCELLED">취소</option>
                      </select>
                      {followUpUpdatingId === item.id && (
                        <span className="text-[11px] text-slate-400">업데이트 중...</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

// --- App Orchestration ---

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <p className="text-sm text-slate-500">세션을 확인 중입니다...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const { assessments, loading, updateAssessmentStatus, updateAssessmentNote, refresh: refreshAssessments } = useAssessments();

  return (
    <Routes>
      <Route path="/" element={<RoleSelection />} />
      <Route path="/survey" element={<SurveyTokenLanding />} />
      <Route path="/survey/:token" element={<SurveyPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/patients"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <PatientsPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/patients/:id"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <PatientDetailPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/pharmacist"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <PatientQueue assessments={assessments} loading={loading} refreshAssessments={refreshAssessments} />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/pharmacist/patient/:id"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <PatientDetail
                assessments={assessments}
                onUpdateStatus={updateAssessmentStatus}
                onUpdateNote={updateAssessmentNote}
              />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="*"
        element={<Navigate to="/pharmacist" replace />}
      />
    </Routes>
  );
};

const App: React.FC = () => (
  <ThemeProvider>
    <AuthProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AuthProvider>
  </ThemeProvider>
);

// --- Route Wrappers ---

const RoleSelection = () => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="grid md:grid-cols-2 gap-8 max-w-4xl w-full">
        <Link to="/survey" className="group">
        <div className="bg-white p-10 h-full rounded-3xl shadow-xl shadow-slate-200 hover:shadow-2xl hover:shadow-teal-100/50 hover:border-teal-500 border-2 border-transparent transition-all duration-300 flex flex-col items-center text-center transform hover:-translate-y-1">
            <div className="w-24 h-24 bg-teal-50 rounded-full flex items-center justify-center mb-8 group-hover:bg-teal-100 transition-colors">
                <User size={48} className="text-teal-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">방문 환자용</h2>
            <p className="text-slate-500 font-medium">약사님이 전송한 토큰/링크로<br/>모바일 설문을 시작합니다.</p>
        </div>
      </Link>
      <Link to="/pharmacist" className="group">
        <div className="bg-white p-10 h-full rounded-3xl shadow-xl shadow-slate-200 hover:shadow-2xl hover:shadow-indigo-100/50 hover:border-indigo-500 border-2 border-transparent transition-all duration-300 flex flex-col items-center text-center transform hover:-translate-y-1">
            <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-8 group-hover:bg-indigo-100 transition-colors">
                <Activity size={48} className="text-indigo-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">약사 전용</h2>
            <p className="text-slate-500 font-medium">대기 환자를 관리하고<br/>AI 상담 가이드를 확인합니다.</p>
        </div>
      </Link>
    </div>
  </div>
);

export default App;
