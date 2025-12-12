import React from 'react';
import Modal from './ui/Modal';
import type { SurveySessionCreationResponse } from '../types';

interface SurveySessionModalProps {
  open: boolean;
  info: SurveySessionCreationResponse | null;
  patientName: string;
  onClose: () => void;
}

const copyToClipboard = async (value: string) => {
  if (typeof navigator === 'undefined' || !navigator.clipboard) return;
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    // ignore clipboard failures silently
  }
};

const SurveySessionModal: React.FC<SurveySessionModalProps> = ({ open, info, patientName, onClose }) => {
  if (!info) return null;

  const expiresAt = info.expiresAt ? new Date(info.expiresAt).toLocaleString() : '';

  return (
    <Modal open={open} onClose={onClose} titleId="survey-session-modal-title">
      <div className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">문진 링크</p>
          <h3 id="survey-session-modal-title" className="text-2xl font-bold text-slate-900 mt-2">
            {patientName} 님에게 발급된 설문
          </h3>
        </div>
        <div className="space-y-3 bg-slate-50 rounded-2xl border border-slate-100 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-slate-500">토큰</p>
            <button
              type="button"
              onClick={() => copyToClipboard(info.token)}
              className="text-[11px] font-semibold text-teal-600 hover:text-teal-800"
            >
              복사
            </button>
          </div>
          <p className="font-mono tracking-wide text-sm text-slate-800 break-all">{info.token}</p>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-slate-500">설문 URL</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => copyToClipboard(info.surveyUrl)}
                className="text-[11px] font-semibold text-teal-600 hover:text-teal-800"
              >
                링크 복사
              </button>
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.open(info.surveyUrl, '_blank', 'noopener');
                  }
                }}
                className="text-[11px] font-semibold text-slate-500 hover:text-slate-700"
              >
                새 창 열기
              </button>
            </div>
          </div>
          <p className="text-sm text-slate-700 break-all">{info.surveyUrl}</p>
          <p className="text-xs text-slate-400">
            만료: {expiresAt || '정보 없음'} · 채널: {info.channel}
            {info.deliveryAddress ? ` · ${info.deliveryAddress}` : ''}
          </p>
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-slate-300"
          >
            닫기
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default SurveySessionModal;
