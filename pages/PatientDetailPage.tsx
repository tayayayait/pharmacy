import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  fetchPatient,
  fetchPatientTimeline,
  updatePatient,
  createSurveySession,
} from '../services/apiClient';
import { useSurveyTemplates } from '../hooks/useSurveyTemplates';
import SurveySessionModal from '../components/SurveySessionModal';
import type { SurveySessionCreationResponse } from '../types';

const PatientDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [patient, setPatient] = useState<any | null>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [tags, setTags] = useState('');
  const { templates, loading: templatesLoading, error: templatesError } = useSurveyTemplates();
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [sessionModalInfo, setSessionModalInfo] = useState<SurveySessionCreationResponse | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [creatingSession, setCreatingSession] = useState(false);
  useEffect(() => {
    if (templates.length > 0 && !selectedTemplateId) {
      setSelectedTemplateId(templates[0].id);
    }
  }, [templates, selectedTemplateId]);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [detail, timelineData] = await Promise.all([
          fetchPatient(id),
          fetchPatientTimeline(id),
        ]);
        setPatient(detail);
        setTimeline(timelineData ?? []);
        setNote(detail.note ?? '');
        setTags((detail.tags ?? []).join(', '));
      } catch (err) {
        setError(err instanceof Error ? err.message : '환자 정보를 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleSave = async () => {
    if (!id) return;
    try {
      await updatePatient(id, {
        note,
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      });
      setError('저장되었습니다.');
      setTimeout(() => setError(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장 실패');
    }
  };

  const handleStartSurvey = async () => {
    if (!id) return;
    if (!selectedTemplateId) {
      setSessionError('설문 템플릿을 선택해주세요.');
      return;
    }
    setSessionError(null);
    setCreatingSession(true);
    try {
      const session = await createSurveySession({
        patientId: id,
        templateId: selectedTemplateId,
        channel: 'WEB',
      });
      setSessionModalInfo(session);
    } catch (err) {
      setSessionError(err instanceof Error ? err.message : '문진 토큰 발급 실패');
    } finally {
      setCreatingSession(false);
    }
  };

  if (!id) {
    return <p className="p-4 text-sm text-red-600">잘못된 접근입니다.</p>;
  }

  const patientName = patient?.displayName ?? patient?.name ?? '환자';

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">환자 상세</h1>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {loading ? (
        <p className="text-sm text-slate-500">불러오는 중...</p>
      ) : !patient ? (
        <p className="text-sm text-red-600">환자 정보를 찾을 수 없습니다.</p>
      ) : (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs text-slate-500">문진 요청</p>
                <p className="text-sm text-slate-500">설문 템플릿을 선택하고 토큰을 발급하세요.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  value={selectedTemplateId}
                  onChange={(event) => setSelectedTemplateId(event.target.value)}
                  disabled={templatesLoading || templates.length === 0}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm focus:outline-none focus:border-teal-500 disabled:opacity-60"
                >
                  <option value="" disabled>
                    {templatesLoading ? '템플릿 로딩 중...' : '템플릿 선택'}
                  </option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleStartSurvey}
                  disabled={templatesLoading || !selectedTemplateId || creatingSession}
                  className="rounded-full bg-gradient-to-r from-teal-500 to-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition disabled:opacity-70"
                >
                  {creatingSession ? '토큰 생성 중...' : '문진 토큰 생성'}
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-1 text-xs">
              {templatesLoading && (
                <p className="text-slate-400">템플릿을 불러오는 중입니다.</p>
              )}
              {templatesError && (
                <p className="text-red-600">{templatesError}</p>
              )}
              {!templatesLoading && !templates.length && (
                <p className="text-red-600">활성 템플릿이 없습니다. 관리자에게 문의해 주세요.</p>
              )}
              {sessionError && (
                <p className="text-red-600">{sessionError}</p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
            <div>
              <p className="text-xs text-slate-500">이름</p>
              <p className="text-lg font-semibold text-slate-800">{patient.displayName ?? patient.name}</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="text-xs text-slate-500">연락처</p>
                <p className="text-sm text-slate-700">{patient.phone}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">성별/연령</p>
                <p className="text-sm text-slate-700">
                  {patient.gender ?? '미상'} / {patient.birthYear ?? '정보 없음'}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-slate-500 font-semibold">메모</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-teal-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-slate-500 font-semibold">태그 (쉼표 구분)</label>
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-teal-500"
              />
            </div>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-xl bg-teal-600 text-white text-sm font-semibold px-4 py-2"
            >
              저장
            </button>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">히스토리 타임라인</h2>
              <span className="text-xs text-slate-500">{timeline.length}건</span>
            </div>
            {timeline.length === 0 ? (
              <p className="text-sm text-slate-500">기록이 없습니다.</p>
            ) : (
              <ul className="space-y-2">
                {timeline.map((item) => (
                  <li key={`${item.type}-${item.assessmentId}-${item.followUpId ?? ''}`} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">
                      {item.type === 'FOLLOW_UP' ? 'F/U' : 'Assessment'} ·{' '}
                      {new Date(item.createdAt ?? item.nextVisitDate).toLocaleString()}
                    </p>
                    {item.type === 'FOLLOW_UP' ? (
                      <>
                        <p className="text-sm text-slate-800">다음 일정: {new Date(item.nextVisitDate).toLocaleString()}</p>
                        {item.checklist?.length ? (
                          <p className="text-xs text-slate-500">{item.checklist.join(' · ')}</p>
                        ) : null}
                      </>
                    ) : (
                      <p className="text-sm text-slate-800">{item.healthType ?? '분석 결과'}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <SurveySessionModal
            open={Boolean(sessionModalInfo)}
            info={sessionModalInfo}
            patientName={patientName}
            onClose={() => setSessionModalInfo(null)}
          />
        </>
      )}
    </div>
  );
};

export default PatientDetailPage;
