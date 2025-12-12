import { useEffect, useState, useMemo } from 'react';
import { fetchPatients, createPatient, updatePatient } from '../services/apiClient';
import { Link } from 'react-router-dom';
import type { PatientInfo } from '../types';

const PatientsPage: React.FC = () => {
  const [patients, setPatients] = useState<PatientInfo[]>([]);
  const [search, setSearch] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noteMap, setNoteMap] = useState<Record<string, string>>({});
  const [tagsMap, setTagsMap] = useState<Record<string, string>>({});
  const [newPatient, setNewPatient] = useState({ name: '', phone: '', gender: 'male', displayName: '' });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchPatients(search);
      setPatients(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : '환자 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [search, gender]);

  const filtered = useMemo(() => {
    return patients.filter((p: any) => {
      if (gender && (p.gender ?? 'other') !== gender) return false;
      return true;
    });
  }, [patients, gender]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createPatient({
        name: newPatient.name,
        phone: newPatient.phone,
        displayName: newPatient.displayName || undefined,
        gender: newPatient.gender as any,
      });
      setNewPatient({ name: '', phone: '', gender: 'male', displayName: '' });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '환자 등록 실패');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">환자 목록</h1>
          <p className="text-sm text-slate-500">검색/필터, 메모 관리</p>
        </div>
        <div className="flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="이름/전화 뒷자리 검색"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-teal-500"
          />
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value as any)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-teal-500"
          >
            <option value="">전체</option>
            <option value="male">남성</option>
            <option value="female">여성</option>
            <option value="other">기타</option>
          </select>
        </div>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
      {loading ? (
        <p className="text-sm text-slate-500">불러오는 중...</p>
      ) : (
        <div className="grid gap-3">
          {filtered.map((p: any) => (
            <div key={p.id} className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-800">{p.displayName ?? p.name ?? '환자'}</p>
                  <p className="text-xs text-slate-500">{p.phone ?? '전화 정보 없음'} · {p.gender ?? '성별 미상'}</p>
                </div>
                <Link
                  to={`/patients/${p.id}`}
                  className="text-xs font-semibold text-teal-600 hover:text-teal-800"
                >
                  상세 보기
                </Link>
              </div>
              <textarea
                value={noteMap[p.id] ?? p.note ?? ''}
                onChange={(e) => setNoteMap((prev) => ({ ...prev, [p.id]: e.target.value }))}
                onBlur={async () => {
                  try {
                    await updatePatient(p.id, { note: noteMap[p.id] ?? p.note ?? '' });
                  } catch (err) {
                    setError(err instanceof Error ? err.message : '메모 저장 실패');
                  }
                }}
                placeholder="메모를 입력하세요"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-teal-500"
              />
              <input
                value={tagsMap[p.id] ?? (p.tags ?? []).join(', ')}
                onChange={(e) => setTagsMap((prev) => ({ ...prev, [p.id]: e.target.value }))}
                onBlur={async () => {
                  const tags = (tagsMap[p.id] ?? (p.tags ?? []).join(', '))
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean);
                  try {
                    await updatePatient(p.id, { tags });
                  } catch (err) {
                    setError(err instanceof Error ? err.message : '태그 저장 실패');
                  }
                }}
                placeholder="태그를 쉼표로 구분해 입력"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-teal-500"
              />
              <div className="text-xs text-slate-400">
                태그: {(tagsMap[p.id] ?? (p.tags ?? []).join(', ')) || '없음'}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
        <p className="text-sm font-semibold text-slate-700">새 환자 등록</p>
        <form className="grid gap-2 md:grid-cols-2" onSubmit={handleCreate}>
          <input
            value={newPatient.name}
            onChange={(e) => setNewPatient((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="이름"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-teal-500"
            required
          />
          <input
            value={newPatient.displayName}
            onChange={(e) => setNewPatient((prev) => ({ ...prev, displayName: e.target.value }))}
            placeholder="표시 이름(선택)"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-teal-500"
          />
          <input
            value={newPatient.phone}
            onChange={(e) => setNewPatient((prev) => ({ ...prev, phone: e.target.value }))}
            placeholder="휴대폰 번호"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-teal-500"
            required
          />
          <select
            value={newPatient.gender}
            onChange={(e) => setNewPatient((prev) => ({ ...prev, gender: e.target.value }))}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-teal-500"
          >
            <option value="male">남성</option>
            <option value="female">여성</option>
            <option value="other">기타</option>
          </select>
          <button
            type="submit"
            className="col-span-full rounded-xl bg-teal-600 text-white text-sm font-semibold py-2"
          >
            등록
          </button>
        </form>
      </div>
    </div>
  );
};

export default PatientsPage;
