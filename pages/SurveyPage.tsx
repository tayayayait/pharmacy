import { CheckCircle2, AlertCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import RadarChartComponent from '../components/RadarChartComponent';
import { HEALTH_TYPES } from '../constants';
import {
  fetchSurveySession,
  submitSurveyAnswers,
  SurveySessionPayload,
  SurveySubmissionResult,
} from '../services/patientSurveyService';

const SurveyPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [session, setSession] = useState<SurveySessionPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Set<string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SurveySubmissionResult | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);

    fetchSurveySession(token)
      .then(setSession)
      .catch((err) => {
        setError(err instanceof Error ? err.message : '설문을 불러오지 못했습니다.');
      })
      .finally(() => setLoading(false));
  }, [token]);

  const currentQuestion = session?.template.questions[currentStep];
  const progress = session ? ((currentStep + 1) / session.template.questions.length) * 100 : 0;

  const toggleOption = (questionId: string, optionId: string, type: string) => {
    setAnswers((prev) => {
      const next = { ...prev };
      const working = new Set(next[questionId]?.values() ?? []);

      if (type === 'SINGLE') {
        working.clear();
        working.add(optionId);
      } else {
        if (working.has(optionId)) {
          working.delete(optionId);
        } else {
          working.add(optionId);
        }
      }

      return {
        ...next,
        [questionId]: working,
      };
    });
  };

  const handleNext = () => {
    if (!session) return;
    setCurrentStep((prev) => Math.min(session.template.questions.length - 1, prev + 1));
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  };

  const handleSubmit = async () => {
    if (!session?.template.questions.length || !token) return;
    const payload = session.template.questions.map((question) => ({
      questionId: question.id,
      optionIds: Array.from(answers[question.id] ?? new Set()),
    }));

    if (payload.some((item) => item.optionIds.length === 0)) {
      setError('모든 질문에 하나 이상의 답변을 선택해주세요.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const submission = await submitSurveyAnswers(token, payload);
      setResult(submission);
    } catch (err) {
      setError(err instanceof Error ? err.message : '설문 제출에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const questionList = session?.template.questions ?? [];
  const healthTypeDefinition = useMemo(() => {
    if (!result) return HEALTH_TYPES[0];
    return HEALTH_TYPES.find((type) => type.name === result.healthType) ?? HEALTH_TYPES[0];
  }, [result]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-slate-500">설문 데이터를 불러오는 중입니다...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl p-6 text-center shadow-lg border border-slate-100">
          <AlertCircle className="mx-auto mb-3 text-red-500" size={32} />
          <p className="text-lg font-semibold text-slate-800">설문을 찾을 수 없습니다.</p>
          <p className="text-sm text-slate-500 mt-2">토큰을 다시 확인하거나 약사님께 문의하세요.</p>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-slate-50 py-10 px-4">
        <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-xl p-8 border border-teal-100 space-y-6 text-center">
          <CheckCircle2 className="mx-auto text-teal-600" size={40} />
          <h1 className="text-2xl font-bold text-slate-900">설문 제출 완료</h1>
          <p className="text-sm text-slate-500">
            설문 결과가 약사님에게 전송되었습니다. 상담 안내를 기다려 주세요.
          </p>
          <div className="space-y-3">
            <p className="text-sm text-slate-400 uppercase tracking-[0.2em]">건강 타입</p>
            <div className="text-xl font-bold text-teal-600">{result.healthType}</div>
            <p className="text-sm text-slate-500">{healthTypeDefinition.description}</p>
          </div>
          <RadarChartComponent scores={result.scores} />
          <p className="text-xs text-slate-400">
            추가 상담 시 이 결과를 가지고 약사님이 맞춤 처방을 도와드립니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-teal-600 to-teal-500 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] font-semibold">NRFT 설문</p>
              <h1 className="text-xl font-bold">{session.template.name}</h1>
            </div>
            <span className="text-sm">{questionList.length}문항</span>
          </div>
          <div className="mt-3 h-1 rounded-full bg-teal-200 overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all"
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
        </div>

        <div className="px-6 py-8 space-y-6">
          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">{error}</p>
          )}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-500">
              질문 {currentStep + 1} / {questionList.length}
            </p>
            <h2 className="text-2xl font-bold text-slate-800">{currentQuestion?.text}</h2>
            <div className="flex flex-wrap gap-3">
                {(currentQuestion?.options ?? []).map((option) => {
                const selected = Boolean(answers[currentQuestion.id]?.has(option.id));
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => toggleOption(currentQuestion.id, option.id, currentQuestion.type)}
                    className={`rounded-2xl border px-4 py-3 text-left font-semibold transition ${
                      selected
                        ? 'bg-teal-50 border-teal-300 text-teal-700 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {option.text}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="px-6 py-5 border-t border-slate-100 flex items-center justify-between gap-4">
          <button
            disabled={currentStep === 0}
            onClick={handlePrev}
            className="text-sm font-semibold text-slate-500 disabled:opacity-50"
          >
            이전 질문
          </button>
          {currentStep < questionList.length - 1 ? (
            <button
              onClick={handleNext}
              className="px-6 py-3 rounded-2xl bg-teal-600 text-white font-bold text-sm shadow-lg"
            >
              다음 질문
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-teal-600 text-white font-bold text-sm shadow-lg disabled:opacity-70"
            >
              {submitting ? '전송 중...' : '설문 제출하기'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SurveyPage;
