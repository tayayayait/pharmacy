import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
const AUTO_LOGIN_ENABLED = import.meta.env.VITE_AUTO_LOGIN !== 'false';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, demoLogin } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (field: 'email' | 'password') => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      if (AUTO_LOGIN_ENABLED && !form.email && !form.password) {
        await demoLogin();
      } else {
        await login({ email: form.email, password: form.password });
      }
      // 2FA 요청이 있다면 OTP 입력 후 진행하도록 확장 가능 (현재는 서버에서 처리)
      navigate('/pharmacist');
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900">약사 로그인</h1>
          <p className="text-sm text-slate-500 mt-1">계정 정보로 안전하게 로그인을 진행하세요.</p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="text-sm font-semibold text-slate-600 block mb-2">이메일</label>
            <input
              type="email"
              value={form.email}
              onChange={handleChange('email')}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-teal-500 focus:bg-white"
              placeholder="user@example.com"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-600 block mb-2">비밀번호</label>
            <input
              type="password"
              value={form.password}
              onChange={handleChange('password')}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-teal-500 focus:bg-white"
              placeholder="••••••••"
            />
          </div>
          <div className="text-xs text-slate-400 text-right">
            안전한 로그인 환경을 위해 계정 정보를 확인해 주세요.
          </div>
          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2">
              {error}
            </p>
          )}
          <button
            type="submit"
            className="w-full py-3 rounded-2xl text-white font-bold bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 transition-colors disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? '로그인 중...' : '로그인'}
          </button>
          {AUTO_LOGIN_ENABLED && (
            <p className="text-[11px] text-slate-400 text-center mt-2">
              입력 없이 로그인하면 데모 약사 계정으로 자동 접속합니다.
            </p>
          )}
        </form>

      </div>
    </div>
  );
};

export default LoginPage;
