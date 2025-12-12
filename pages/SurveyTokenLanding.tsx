import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AUTO_SURVEY_TOKEN = (import.meta.env.VITE_DEFAULT_SURVEY_TOKEN ?? 'demo-nrft-session').trim();
const AUTO_SURVEY_ENABLED = AUTO_SURVEY_TOKEN.length > 0;
const AUTO_SURVEY_DELAY_MS = 900;

const SurveyTokenLanding: React.FC = () => {
  const [token, setToken] = useState('');
  const [manualMode, setManualMode] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!token.trim()) return;
    navigate(`/survey/${token.trim()}`);
  };

  const autoToken = AUTO_SURVEY_ENABLED ? AUTO_SURVEY_TOKEN : '';

  useEffect(() => {
    if (!autoToken || manualMode) return;
    const timer = setTimeout(() => {
      navigate(`/survey/${autoToken}`, { replace: true });
    }, AUTO_SURVEY_DELAY_MS);

    return () => clearTimeout(timer);
  }, [autoToken, manualMode, navigate]);

  if (autoToken && !manualMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-teal-50 flex items-center justify-center px-4 py-10">
        <div className="relative w-full max-w-lg bg-white rounded-3xl border border-slate-100 shadow-xl p-8 space-y-6 text-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">NRFT 건강 문진</h1>
            <p className="text-sm text-slate-500 mt-1">
              토큰 <span className="font-mono text-teal-600">{autoToken}</span>을 사용해 자동으로 설문을 시작합니다.
            </p>
          </div>
          <div className="text-sm text-slate-500">
            <p>설문 데이터를 불러오고 있습니다.</p>
            <p>자동 연결에 실패할 경우 아래 버튼을 눌러 토큰을 직접 입력해 주세요.</p>
          </div>
          <button
            type="button"
            onClick={() => setManualMode(true)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 font-semibold py-3 hover:border-teal-500 hover:text-teal-700 transition-colors"
          >
            직접 토큰 입력
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-teal-50 flex items-center justify-center px-4 py-10">
      <div className="relative w-full max-w-lg bg-white rounded-3xl border border-slate-100 shadow-xl p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">NRFT 건강 문진</h1>
          <p className="text-sm text-slate-500 mt-1">
            약사님께 받은 링크 또는 QR에서 토큰을 입력해 설문을 시작하세요.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-[0.2em]">설문 토큰</label>
          <input
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="예: demo-nrft-session"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 bg-slate-50 focus:border-teal-500 focus:bg-white outline-none"
          />
          <button
            type="submit"
            className="w-full rounded-2xl bg-gradient-to-r from-teal-600 to-teal-500 text-white font-bold py-3 text-sm shadow-lg"
          >
            설문 시작
          </button>
        </form>

        <div className="text-xs text-slate-400">
          <p>* 데모 토큰: <code className="bg-slate-100 px-2 py-0.5 rounded">demo-nrft-session</code></p>
          <p>* 입력한 토큰이 유효하지 않거나 만료된 경우 다시 신청해 주세요.</p>
        </div>
      </div>
    </div>
  );
};

export default SurveyTokenLanding;
